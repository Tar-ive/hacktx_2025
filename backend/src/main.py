"""FastAPI main application."""

import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import config
from .services.adk_agent_service import adk_agent_service
from .api.routes import router
from .api.conversation import router as conversation_router
from .api.webhooks import router as webhooks_router
from .orchestrator.triggers import validate_no_overlap
from .orchestrator.websocket_handler import handle_websocket_audio_stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("=" * 70)
    print("🚀 Starting Voice Banking Assistant Backend")
    print("=" * 70)

    # Validate configuration
    try:
        config.validate()
        print("✓ Configuration validated")
    except ValueError as e:
        print(f"✗ Configuration error: {e}")
        sys.exit(1)

    # Validate triggers
    try:
        validate_no_overlap()
    except ValueError as e:
        print(f"✗ Trigger validation error: {e}")
        sys.exit(1)

    print(f"✓ Server ready on {config.HOST}:{config.PORT}")
    print(f"✓ Nessie Customer ID: {config.NESSIE_CUSTOMER_ID}")
    print(f"✓ Cache TTL: {config.CACHE_TTL_SECONDS} seconds (60-min API layer)")
    
    # Show ADK agent status
    if adk_agent_service.is_available:
        print("✓ ADK Agents: ENABLED (Gemini responses active)")
    else:
        reason = adk_agent_service.disabled_reason or "unknown reason"
        print("⚠️  ADK Agents: Disabled (falling back to cached summaries)")
        print(f"  Details: {reason}")
    
    print("=" * 70)

    yield

    # Shutdown
    print("\n👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Voice Banking Assistant API",
    description="Multi-agent voice banking with Gemini orchestrator",
    version=config.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)
app.include_router(conversation_router)
app.include_router(webhooks_router)


@app.websocket("/ws/{customer_id}")
async def websocket_endpoint(websocket: WebSocket, customer_id: str):
    """Enhanced WebSocket endpoint for real-time audio streaming and conversation."""
    await handle_websocket_audio_stream(websocket, customer_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )
