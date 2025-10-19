"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


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
