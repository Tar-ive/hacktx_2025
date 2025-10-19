"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str


class ChatMessageRequest(BaseModel):
    customer_id: str
    message: str
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    agent: str
    response: str
    context_used: Dict[str, Any]
    timestamp: datetime


class AgentSelectionRequest(BaseModel):
    message: str


class AgentSelectionResponse(BaseModel):
    agent: str
    matched_keywords: List[str]
    reasoning: str


class CacheRefreshRequest(BaseModel):
    customer_id: str


class CacheRefreshResponse(BaseModel):
    success: bool
    cached_at: datetime


class CacheStatusResponse(BaseModel):
    memory_cache: Dict[str, Any]
    file_cache: Dict[str, Any]


class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime


class ElevenLabsEventPayload(BaseModel):
    """Incoming ElevenLabs webhook payload."""

    model_config = ConfigDict(extra="allow")

    event: Literal["agent_started", "agent_speaking", "agent_finished"]
    agent_id: str = Field(..., alias="agentId")
    agent_name: Optional[str] = Field(None, alias="agentName")
    conversation_id: Optional[str] = Field(None, alias="conversationId")
    session_id: Optional[str] = Field(None, alias="sessionId")
    utterance: Optional[str] = None
    timestamp: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ElevenLabsWebhookResponse(BaseModel):
    """Acknowledgement returned to ElevenLabs."""

    success: bool
    session_id: Optional[str] = None
    message: str


class ConversationSummaryResponse(BaseModel):
    """Conversation summary returned to the mobile UI."""

    session_id: str
    customer_id: str
    created_at: datetime
    updated_at: datetime
    turns: int
    user_messages: List[Dict[str, Any]]
    agent_messages: List[Dict[str, Any]]
    events: List[Dict[str, Any]]
    context_snapshots: List[Dict[str, Any]]
    metadata: Dict[str, Any]
