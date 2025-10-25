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
    ConversationSummaryResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserAuthResponse,
    UserDataResponse,
    UserMatchRequest,
    UserMatchResponse,
)
from ..orchestrator.llm_orchestrator import llm_orchestrator
from ..orchestrator.tool_executor import ToolExecutor
from ..tools.nessie import TOOLS_REGISTRY, cache
from ..services.nessie_client import nessie_client
from ..services.conversation_store import conversation_store
from ..services.user_data_service import user_data_service
from ..services.centralized_data_manager import centralized_data_manager
from ..config import config
from ..services.adk_agent_service import adk_agent_service

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


@router.get(
    "/api/v1/conversation/{session_id}/summary",
    response_model=ConversationSummaryResponse,
)
async def get_conversation_summary(session_id: str):
    """Return a persisted summary for the given conversation session."""
    summary = await conversation_store.get_summary(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return summary


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
        # Step 1: Route to agent using LLM orchestrator
        routing = await llm_orchestrator.route(
            user_message=request.message,
            conversation_history=[]  # Could add session history if maintained
        )
        selected_agent = routing["agent"]

        # Step 2: Determine required tools (LLM determines which tools)
        tool_calls = llm_orchestrator.tools_to_calls(routing["tools"], request.customer_id)

        # Step 3: Execute tools in parallel (cached data with 60-min TTL)
        tool_executor = ToolExecutor(TOOLS_REGISTRY)
        context = await tool_executor.execute_parallel(tool_calls)
        
        # The context now contains cached financial data from:
        # - Layer 1: Memory cache (5 min)
        # - Layer 2: File cache (60 min) ← This is the API layer cache!
        # - Layer 3: Nessie API
        # - Fallback: Stale cache if API fails

        agent_response = await adk_agent_service.respond(
            agent_name=selected_agent,
            message=request.message,
            context=context,
            customer_id=request.customer_id,
            conversation_id=request.session_id,
        )

        using_real_agent = agent_response.get("success", False)

        if using_real_agent:
            response_text = agent_response.get("text", "")
        else:
            response_text = adk_agent_service.build_context_fallback(
                agent_name=selected_agent,
                message=request.message,
                context=context,
            )
            error_hint = agent_response.get("error") or adk_agent_service.disabled_reason
            if error_hint:
                response_text += f"\n\n(Note: {error_hint})"

        return ChatMessageResponse(
            agent=selected_agent,
            response=response_text,
            context_used={
                "tools_called": [k for k in context.keys() if k != "execution_time_ms"],
                "data_fetched": True,
                "execution_time_ms": context.get("execution_time_ms", 0),
                "using_real_agent": using_real_agent,
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


@router.post("/api/v1/auth/login", response_model=UserAuthResponse)
async def login_user(request: UserLoginRequest):
    """
    Authenticate user and return their data.
    """
    user = user_data_service.authenticate_user(request.email, request.password)
    
    if not user:
        return UserAuthResponse(
            success=False,
            linked=False,
            message="Invalid email or password"
        )
    
    # Fetch complete user data if they have a linked account
    user_data = None
    if user.get("customer_id"):
        user_data = await user_data_service.get_complete_user_data(
            user_id=user.get("id"),
            customer_id=user.get("customer_id")
        )

    profile = {
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "zip_code": user.get("zip_code"),
        "preferences": user.get("preferences", {})
    }

    return UserAuthResponse(
        success=True,
        user_id=user.get("id"),
        customer_id=user.get("customer_id"),
        linked=user.get("customer_id") is not None,
        message="Login successful!",
        user_data=user_data,
        profile=profile
    )


@router.post("/api/v1/auth/register", response_model=UserAuthResponse)
async def register_user(request: UserRegisterRequest):
    """
    Register new user and link with Capital One account if match found.
    """
    result = await user_data_service.register_user(
        email=request.email,
        password=request.password,
        first_name=request.first_name,
        last_name=request.last_name,
        zip_code=request.zip_code,
        preferences=request.preferences
    )

    if "error" in result:
        return UserAuthResponse(
            success=False,
            linked=False,
            message=result["error"]
        )

    # Fetch complete user data if account was linked
    user_data = None
    if result.get("customer_id"):
        user_data = await user_data_service.get_complete_user_data(
            user_id=result["user_id"],
            customer_id=result["customer_id"],
            force_refresh=True
        )

    return UserAuthResponse(
        success=True,
        user_id=result["user_id"],
        customer_id=result.get("customer_id"),
        linked=result["linked"],
        message=result["message"],
        user_data=user_data,
        profile=result.get("profile"),
        match=result.get("match")
    )


@router.post("/api/v1/auth/match", response_model=UserMatchResponse)
async def match_capital_one_account(request: UserMatchRequest):
    """Attempt to match a user against Nessie customers without registering."""
    result = await user_data_service.match_customer(
        first_name=request.first_name,
        last_name=request.last_name,
        zip_code=request.zip_code
    )
    return UserMatchResponse(**result)


@router.get("/api/v1/user/{user_id}/data", response_model=UserDataResponse)
async def get_user_data(user_id: str):
    """
    Get complete financial data for a user.
    """
    data = await user_data_service.get_complete_user_data(user_id=user_id)
    return UserDataResponse(**data)


@router.get("/api/v1/data/{customer_id}")
async def get_centralized_data(customer_id: str, refresh: bool = False):
    """
    Get ALL user data from centralized storage.
    This is the SINGLE endpoint for all user financial data.
    
    Query params:
    - refresh: Force refresh from Nessie API (default: False)
    
    Returns:
        Complete user financial data including:
        - accounts, balance, transactions, spending, patterns, deposits, security
    
    This data is used by:
    - Mobile app (dashboard, analytics, transactions)
    - AI agents (for context in responses)
    - Voice assistants (for accurate answers)
    """
    try:
        if refresh:
            # Force refresh from Nessie
            data = await centralized_data_manager.fetch_and_store_all_data(customer_id)
        else:
            # Get cached data or refresh if stale (1 hour)
            data = await centralized_data_manager.get_or_refresh_data(customer_id, max_age_seconds=3600)
        
        return {
            "success": True,
            "data": data,
            "source": "centralized_storage",
            "location": str(centralized_data_manager._get_user_file(customer_id))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/data/{customer_id}/refresh")
async def refresh_centralized_data(customer_id: str):
    """
    Force refresh user data from Nessie API.
    Useful when user wants to see latest transactions.
    """
    try:
        data = await centralized_data_manager.fetch_and_store_all_data(customer_id)
        return {
            "success": True,
            "message": "Data refreshed successfully",
            "last_updated": data.get("_metadata", {}).get("last_updated")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
