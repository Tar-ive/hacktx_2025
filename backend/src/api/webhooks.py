"""Webhook endpoints for external integrations (e.g., ElevenLabs)."""

from typing import Optional, Dict, Any

from fastapi import APIRouter, Header, HTTPException, status, BackgroundTasks

from ..config import config
from ..models.schemas import ElevenLabsEventPayload, ElevenLabsWebhookResponse
from ..services.conversation_store import conversation_store

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

SECRET_HEADER_CANDIDATES = [
    "x-elevenlabs-webhook-secret",
    "x-webhook-secret",
    "x-api-key",
]


def _validate_secret(header_value: Optional[str]) -> None:
    expected = config.ELEVENLABS_WEBHOOK_SECRET
    if not expected:
        return
    if not header_value or header_value != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ElevenLabs webhook secret",
        )


def _resolve_session_id(payload: ElevenLabsEventPayload) -> str:
    session_id = payload.session_id or payload.conversation_id
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing session identifier in webhook payload",
        )
    return session_id


async def _process_agent_event(payload: ElevenLabsEventPayload) -> None:
    """Background task: Process agent event and trigger UI updates."""
    session_id = payload.session_id or payload.conversation_id
    
    if not session_id:
        print("⚠️ Webhook event missing session_id")
        return
    
    # Store event in conversation
    event_payload = payload.model_dump(mode="json", by_alias=True)
    await conversation_store.append_event(
        session_id=session_id,
        event_type=payload.event,
        payload=event_payload,
    )
    
    # If agent finished, trigger UI formatting
    if payload.event == "agent_finished":
        print(f"✓ Agent finished for session {session_id}")
        summary = await conversation_store.get_summary(session_id)
        if summary:
            await _format_ui_updates(summary)
    elif payload.event == "agent_started":
        print(f"✓ Agent started for session {session_id}")


async def _format_ui_updates(summary: Dict[str, Any]) -> None:
    """Generate UI updates based on conversation summary."""
    agent_messages = summary.get("agent_messages", [])
    if not agent_messages:
        return
    
    last_message = agent_messages[-1]
    agent = last_message.get("agent", "nova")
    
    context_snapshots = summary.get("context_snapshots", [])
    if not context_snapshots:
        return
    
    latest_context = context_snapshots[-1].get("context", {})
    
    ui_updates = {
        "session_id": summary["session_id"],
        "agent": agent,
        "dashboard_updates": []
    }
    
    # Format based on agent type
    if agent == "nebula" and "get_spending_by_category" in latest_context:
        categories = latest_context["get_spending_by_category"]
        ui_updates["dashboard_updates"].append({
            "component": "spending_breakdown",
            "type": "pie_chart",
            "data": categories,
            "title": "Spending by Category"
        })
    
    print(f"✓ UI updates formatted: {len(ui_updates['dashboard_updates'])} components")


@router.post(
    "/elevenlabs",
    response_model=ElevenLabsWebhookResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def elevenlabs_webhook(
    payload: ElevenLabsEventPayload,
    background_tasks: BackgroundTasks,
    x_elevenlabs_webhook_secret: Optional[str] = Header(default=None),
    x_webhook_secret: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Receive ElevenLabs agent events and persist them for the conversation summary.

    ElevenLabs currently emits three primary events:
    - agent_started
    - agent_speaking
    - agent_finished
    """
    provided_secret = (
        x_elevenlabs_webhook_secret
        or x_webhook_secret
        or x_api_key
    )
    _validate_secret(provided_secret)

    print(f"📡 Webhook received: {payload.event} for agent {payload.agent_id}")
    
    session_id = _resolve_session_id(payload)
    
    # Process event in background to avoid blocking webhook response
    background_tasks.add_task(_process_agent_event, payload)
    
    return ElevenLabsWebhookResponse(
        success=True,
        session_id=session_id,
        message=f"Event {payload.event} queued for processing",
    )
