"""
Conversation API bridging the orchestrator and ElevenLabs integration.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..orchestrator.llm_orchestrator import llm_orchestrator

router = APIRouter(prefix="/conversation", tags=["conversation"])


class ConversationTurn(BaseModel):
    """Lightweight representation of a historical turn."""

    role: str = Field(default="user")
    content: str
    agent: Optional[str] = None


class ConversationRequest(BaseModel):
    """Request payload for starting or continuing conversations."""

    customer_id: str
    message: str
    conversation_history: List[ConversationTurn] = []
    session_id: Optional[str] = None


class ConversationResponse(BaseModel):
    """Metadata about the routed conversation."""

    success: bool
    agent: str
    confidence: float
    tools: List[str]
    conversation_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/start", response_model=ConversationResponse)
async def start_conversation(request: ConversationRequest) -> ConversationResponse:
    """
    Route the incoming message and start the associated ElevenLabs conversation.
    """
    routing = await llm_orchestrator.route(
        user_message=request.message,
        conversation_history=[turn.model_dump() for turn in request.conversation_history],
    )
    agent = routing["agent"]

    conversation_result = await llm_orchestrator.start_agent_conversation(
        agent_name=agent,
        customer_id=request.customer_id,
        session_id=request.session_id,
    )

    if not conversation_result["success"]:
        raise HTTPException(status_code=500, detail=conversation_result["error"])

    return ConversationResponse(
        success=True,
        agent=agent,
        confidence=routing.get("confidence", 0.0),
        tools=routing.get("tools", []),
        conversation_id=conversation_result.get("conversation_id"),
    )


@router.post("/message")
async def send_message(_: Dict[str, Any]) -> Dict[str, Any]:
    """
    Placeholder endpoint for future conversation continuation.
    """
    raise HTTPException(status_code=501, detail="Streaming conversation not implemented yet.")
