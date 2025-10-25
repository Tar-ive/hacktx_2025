"""Webhook endpoints for external integrations (e.g., ElevenLabs)."""

from typing import Optional, Dict, Any, List

from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, status, BackgroundTasks

from ..config import config
from ..models.schemas import ElevenLabsEventPayload, ElevenLabsWebhookResponse
from ..services.conversation_store import conversation_store
from ..orchestrator.websocket_handler import connection_manager

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

    session = await conversation_store.get_session(session_id)
    if not session:
        print(f"⚠️ Session {session_id} not found for webhook event")
        return

    customer_id = session.get("customer_id")
    if not customer_id:
        print(f"⚠️ Session {session_id} missing customer_id; cannot broadcast event")
    
    # Store event in conversation
    event_payload = payload.model_dump(mode="json", by_alias=True)
    await conversation_store.append_event(
        session_id=session_id,
        event_type=payload.event,
        payload=event_payload,
    )

    if customer_id:
        await _broadcast_agent_event(customer_id, session_id, payload)

    # If agent finished, trigger UI formatting and summary push
    if payload.event == "agent_finished":
        print(f"✓ Agent finished for session {session_id}")
        summary = await conversation_store.get_summary(session_id)
        if summary:
            structured = _build_summary_bundle(summary, payload.metadata)
            if structured:
                summary["summary_bundle"] = structured
                await conversation_store.set_summary_bundle(session_id, structured)
            if customer_id:
                await _broadcast_conversation_summary(
                    customer_id,
                    session_id,
                    summary,
                    payload.metadata,
                )
            await _format_ui_updates(summary)
    elif payload.event == "agent_started":
        print(f"✓ Agent started for session {session_id}")


async def _broadcast_agent_event(
    customer_id: str,
    session_id: str,
    payload: ElevenLabsEventPayload,
) -> None:
    """Send agent lifecycle event to the connected client if available."""
    message: Dict[str, Any] = {
        "type": payload.event,
        "session_id": session_id,
        "agent_id": payload.agent_id,
        "agent_name": payload.agent_name,
        "utterance": payload.utterance,
        "metadata": _serialize_value(payload.metadata),
    }

    if payload.timestamp:
        message["timestamp"] = payload.timestamp.isoformat()

    await connection_manager.send_to_client(customer_id, message)


async def _broadcast_conversation_summary(
    customer_id: str,
    session_id: str,
    summary: Dict[str, Any],
    agent_metadata: Optional[Dict[str, Any]],
) -> None:
    """Push a summary-ready notification with serialized payload to the client."""
    message = {
        "type": "conversation_summary_ready",
        "session_id": session_id,
        "summary": _serialize_summary(summary),
    }

    if agent_metadata:
        message["agent_metadata"] = _serialize_value(agent_metadata)
    if summary.get("summary_bundle"):
        message["summary_bundle"] = _serialize_value(summary["summary_bundle"])

    await connection_manager.send_to_client(customer_id, message)


def _serialize_summary(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Convert summary payload into JSON-serializable structure."""
    return _serialize_value(summary)


def _serialize_value(value: Any) -> Any:
    """Recursively convert datetimes and unsupported types for JSON serialization."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize_value(item) for item in value]
    return value


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


def _build_summary_bundle(
    summary: Dict[str, Any],
    agent_metadata: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Create structured summary payload for analytics UI."""
    context_snapshots = summary.get("context_snapshots") or []
    latest_context = context_snapshots[-1].get("context", {}) if context_snapshots else {}

    agent = None
    if agent_metadata and isinstance(agent_metadata, dict):
        agent = agent_metadata.get("agent") or agent_metadata.get("agent_slug")
    if not agent and summary.get("agent_messages"):
        agent = summary["agent_messages"][-1].get("agent")

    highlights: List[str] = []
    key_metrics: List[Dict[str, Any]] = []
    follow_ups: List[str] = []
    visualizations: List[Dict[str, Any]] = []

    spending = latest_context.get("get_spending_by_category") or {}
    analyzer = latest_context.get("analyze_spending_patterns") or {}
    balance = latest_context.get("get_account_balance") or {}
    unusual = latest_context.get("detect_unusual_transactions") or []
    security = latest_context.get("get_security_score") or {}

    if analyzer:
        trend = analyzer.get("trend")
        trend_percent = analyzer.get("trend_percent")
        if trend and trend_percent is not None:
            highlights.append(f"Spending trend is {trend} ({trend_percent:+.1f}%).")
        total_30 = analyzer.get("total_last_30_days")
        if total_30 is not None:
            highlights.append(f"Total spending last 30 days: ${total_30:,.2f}.")
        avg_daily = analyzer.get("average_daily_spending")
        if avg_daily is not None:
            key_metrics.append({
                "label": "Average daily spending",
                "value": round(avg_daily, 2),
                "unit": "USD",
            })
        key_metrics.append({
            "label": "Total spend (30d)",
            "value": round(analyzer.get("total_last_30_days", 0), 2),
            "unit": "USD",
            "delta": f"{analyzer.get('trend_percent', 0):+.1f}%",
        })

    if spending:
        top_category = max(spending.items(), key=lambda item: item[1]) if spending else None
        if top_category and top_category[1]:
            highlights.append(
                f"Top category: {top_category[0].title()} (${top_category[1]:,.2f})."
            )
        visualizations.append({
            "type": "pie",
            "title": "Spending by Category",
            "data_tool": "get_spending_by_category",
            "data": spending,
        })

    if balance and isinstance(balance, dict):
        total_balance = balance.get("total_balance")
        if total_balance is not None:
            key_metrics.append({
                "label": "Total balance",
                "value": round(total_balance, 2),
                "unit": "USD",
            })
            highlights.append(f"Total balance across accounts is ${total_balance:,.2f}.")

    if security and isinstance(security, dict) and security.get("security_score") is not None:
        key_metrics.append({
            "label": "Security score",
            "value": security.get("security_score"),
            "unit": "score",
        })
        if security.get("assessment"):
            highlights.append(f"Security assessment: {security.get('assessment')}.")

    if unusual and isinstance(unusual, list) and len(unusual) > 0:
        follow_ups.append(
            f"Review {len(unusual)} unusual transaction(s) flagged by Sentinel."
        )

    if agent == "atlas" and analyzer:
        follow_ups.append("Discuss savings rate trends with Atlas to rebalance goals.")
    elif agent == "nebula" and spending:
        follow_ups.append("Ask Nebula to fine-tune budgets for top spending categories.")
    elif agent == "nova":
        follow_ups.append("Check in with Nova for any remaining account questions.")

    audio_meta = _extract_audio_metadata(agent_metadata)

    tool_runs = []
    for tool_name, tool_result in latest_context.items():
        if tool_name == "execution_time_ms":
            continue
        cached = False
        latency = None
        if isinstance(tool_result, dict):
            cached = bool(tool_result.get("from_cache"))
            latency = tool_result.get("latency_ms")
        tool_runs.append({
            "tool": tool_name,
            "latency_ms": latency,
            "cached": cached,
        })

    call_metrics = {
        "call_count": summary.get("turns", 0),
        "total_spent": analyzer.get("total_last_30_days") if analyzer else None,
        "avg_call_cost": None,
    }

    bundle = {
        "session_id": summary.get("session_id"),
        "agent": agent,
        "highlights": highlights,
        "key_metrics": key_metrics,
        "follow_ups": follow_ups,
        "visualizations": visualizations,
        "audio": audio_meta,
        "tool_runs": tool_runs,
        "call_metrics": call_metrics,
    }

    return bundle


def _extract_audio_metadata(agent_metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Normalize audio metadata from webhook payload."""
    if not agent_metadata or not isinstance(agent_metadata, dict):
        return None

    audio = agent_metadata.get("audio")
    if isinstance(audio, dict) and audio.get("url"):
        return {
            "url": audio.get("url"),
            "expires_at": audio.get("expires_at") or audio.get("expiresAt"),
            "codec": audio.get("codec"),
        }

    url = (
        agent_metadata.get("audio_url")
        or agent_metadata.get("audioUrl")
        or agent_metadata.get("summary_audio_url")
    )
    if url:
        return {
            "url": url,
            "expires_at": agent_metadata.get("audio_expires_at")
            or agent_metadata.get("audioExpiresAt"),
            "codec": agent_metadata.get("audio_codec") or agent_metadata.get("audioCodec"),
        }
    return None


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
