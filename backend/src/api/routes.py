"""FastAPI route handlers."""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from ..models.schemas import (
    HealthResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    AgentSelectionRequest,
    AgentSelectionResponse,
    CacheRefreshRequest,
    CacheRefreshResponse,
    CacheStatusResponse,
)
from ..orchestrator.router import route_to_agent
from ..orchestrator.tool_executor import ToolExecutor, determine_tools_for_agent
from ..tools.nessie import TOOLS_REGISTRY, cache
from ..services.nessie_client import nessie_client
from ..services.elevenlabs_client import call_agent_with_context
from ..config import config

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Voice Banking Assistant API",
        "version": config.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "agent_selection": "POST /api/v1/agent/select",
            "chat": "POST /api/v1/chat/message",
            "customer": "GET /api/v1/customer/{customer_id}",
            "transactions": "GET /api/v1/accounts/{account_id}/transactions",
            "cache_status": "GET /api/v1/cache/status",
        },
        "agents": {
            "nebula": "Spending Coach (keywords: spend, budget, afford, groceries)",
            "atlas": "Investment Advisor (keywords: invest, retirement, wealth)",
            "sentinel": "Security Monitor (keywords: fraud, suspicious, hack)",
            "nova": "General Assistant (fallback)"
        }
    }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version=config.VERSION
    )


@router.get("/api/v1/customer/{customer_id}")
async def get_customer(customer_id: str) -> Dict[str, Any]:
    """Get customer data with caching."""
    try:
        async def fetcher():
            return await nessie_client.get_full_customer_data(customer_id)

        result = await cache.get_with_fallback(f"customer:{customer_id}", fetcher)

        return {
            **result["data"],
            "from_cache": result["from_cache"],
            "cache_layer": result.get("cache_layer")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/accounts/{account_id}")
async def get_account(account_id: str) -> Dict[str, Any]:
    """Get account details."""
    try:
        account = await nessie_client.get_account(account_id)
        return account
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Account not found: {str(e)}")


@router.get("/api/v1/accounts/{account_id}/transactions")
async def get_transactions(
    account_id: str,
    days: int = 30,
    category: str = None
) -> Dict[str, Any]:
    """Get account transactions."""
    try:
        purchases = await nessie_client.get_purchases(account_id)

        # Filter by category if provided (simplified)
        if category:
            purchases = [
                p for p in purchases
                if category.lower() in p.get("description", "").lower()
            ]

        return {
            "transactions": purchases,
            "total": len(purchases),
            "cached": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/chat/message", response_model=ChatMessageResponse)
async def send_message(request: ChatMessageRequest):
    """
    Send message to agent orchestrator.
    This is the main entry point for chat interactions.
    
    Flow:
    1. Route to appropriate agent (deterministic)
    2. Execute tools in parallel to fetch financial data
    3. Cache results (60-min TTL at API layer)
    4. Call ElevenLabs agent with cached context as fallback
    5. Return conversational response
    """
    try:
        # Step 1: Route to agent (deterministic)
        routing = route_to_agent(request.message)
        selected_agent = routing["agent"]

        # Step 2: Determine required tools
        tool_calls = determine_tools_for_agent(selected_agent, request.customer_id)

        # Step 3: Execute tools in parallel (cached data with 60-min TTL)
        tool_executor = ToolExecutor(TOOLS_REGISTRY)
        context = await tool_executor.execute_parallel(tool_calls)
        
        # The context now contains cached financial data from:
        # - Layer 1: Memory cache (5 min)
        # - Layer 2: File cache (60 min) ← This is the API layer cache!
        # - Layer 3: Nessie API
        # - Fallback: Stale cache if API fails

        # Step 4: Call real ElevenLabs agent with cached context
        if config.has_elevenlabs_agents():
            # Call real agent with all cached data as context
            agent_response = await call_agent_with_context(
                agent_name=selected_agent,
                message=request.message,
                context=context,
                conversation_id=request.session_id
            )
            
            response_text = agent_response.get("text", "")
            
            # Add note if agent call failed but we have fallback
            if not agent_response.get("success", True):
                response_text += "\n\n(Note: Using cached data from API layer)"
        else:
            # Fallback to mock if agents not configured
            response_text = f"I'm {selected_agent.title()}, and I'm here to help! "
            response_text += f"Based on the cached data from the API layer, I can see:\n\n"
            
            # Show some context data
            for tool_name, result in context.items():
                if tool_name == "execution_time_ms":
                    continue
                if isinstance(result, dict) and "error" not in result:
                    response_text += f"• {tool_name}: Available\n"
                elif isinstance(result, list) and len(result) > 0:
                    response_text += f"• {tool_name}: {len(result)} items\n"
            
            response_text += f"\nYour question was: {request.message}\n"
            response_text += "\n(Configure ElevenLabs agent IDs in .env for real conversational responses)"

        return ChatMessageResponse(
            agent=selected_agent,
            response=response_text,
            context_used={
                "tools_called": [k for k in context.keys() if k != "execution_time_ms"],
                "data_fetched": True,
                "execution_time_ms": context.get("execution_time_ms", 0),
                "using_real_agent": config.has_elevenlabs_agents(),
                "cache_layer": "60-min API layer cache + tool fallbacks"
            },
            timestamp=datetime.now()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/agent/select", response_model=AgentSelectionResponse)
async def select_agent(request: AgentSelectionRequest):
    """Test endpoint for agent selection logic."""
    routing = route_to_agent(request.message)
    return AgentSelectionResponse(**routing)


@router.get("/api/v1/cache/status", response_model=CacheStatusResponse)
async def get_cache_status():
    """Get cache status information."""
    status = cache.get_status()
    return CacheStatusResponse(**status)


@router.post("/api/v1/cache/refresh", response_model=CacheRefreshResponse)
async def refresh_cache(request: CacheRefreshRequest):
    """Force cache refresh."""
    try:
        # Fetch fresh data
        fresh_data = await nessie_client.get_full_customer_data(request.customer_id)

        # Store in cache
        cache.file_buffer.save_to_cache(fresh_data)
        cache.set_in_memory(f"customer:{request.customer_id}", fresh_data)

        return CacheRefreshResponse(
            success=True,
            cached_at=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
