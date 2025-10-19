"""FastAPI main application."""

import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import config
from .api.routes import router
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
    
    # Show ElevenLabs agent status
    if config.has_elevenlabs_agents():
        print(f"✓ ElevenLabs Agents: CONFIGURED (4 real agents)")
        print(f"  • Nebula: {config.AGENT_ID_NEBULA[:20]}...")
        print(f"  • Atlas: {config.AGENT_ID_ATLAS[:20]}...")
        print(f"  • Sentinel: {config.AGENT_ID_SENTINEL[:20]}...")
        print(f"  • Nova: {config.AGENT_ID_NOVA[:20]}...")
    else:
        print(f"⚠️  ElevenLabs Agents: Not configured (using mock responses)")
        print(f"  Run: python scripts/create_elevenlabs_agents.py")
    
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
