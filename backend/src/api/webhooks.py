"""Webhook endpoints for external integrations (e.g., ElevenLabs)."""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

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


@router.post(
    "/elevenlabs",
    response_model=ElevenLabsWebhookResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def elevenlabs_webhook(
    payload: ElevenLabsEventPayload,
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

    session_id = _resolve_session_id(payload)

    session = await conversation_store.get_session(session_id)
    if not session:
        return ElevenLabsWebhookResponse(
            success=False,
            session_id=session_id,
            message="Session not yet initialized; event queued for later.",
        )

    event_payload = payload.model_dump(mode="json", by_alias=True)
    await conversation_store.append_event(
        session_id=session_id,
        event_type=payload.event,
        payload=event_payload,
    )

    return ElevenLabsWebhookResponse(
        success=True,
        session_id=session_id,
        message=f"Recorded {payload.event} event.",
    )
