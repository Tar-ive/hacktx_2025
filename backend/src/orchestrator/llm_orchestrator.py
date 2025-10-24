"""
LLM-based orchestrator using Gemini 2.5 Flash.
Replaces deterministic keyword routing with intelligent AI-driven routing.
"""

import ast
import asyncio
import json
import re
from json import JSONDecodeError
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from ..config import config
from ..services.centralized_data_manager import centralized_data_manager


ORCHESTRATOR_SYSTEM_PROMPT = """You are an intelligent banking orchestrator AI. Your role:

1. Analyze user intent from their message
2. Determine which specialized agent should handle the query
3. Identify which financial data tools are needed
4. Maintain conversation context across turns

AVAILABLE AGENTS:
- **nebula** (Spending Coach): Daily spending, budgets, groceries, dining, gas, affordability questions
- **atlas** (Investment Advisor): Retirement planning, investments, wealth building, savings rates, portfolio management
- **sentinel** (Security Monitor): Fraud detection, suspicious activity, security alerts, unauthorized charges, account locks
- **nova** (General Assistant): Account balances, basic account info, general questions, greetings, transfers

AVAILABLE TOOLS:
- get_account_balance: Returns total balance across all accounts
- get_recent_transactions: Fetches recent purchases (configurable days: 7-90)
- get_spending_by_category: Breaks down spending by groceries, dining, gas, utilities, shopping, other
- analyze_spending_patterns: Trends, averages, month-over-month comparison
- get_all_accounts: List of all customer accounts with balances
- detect_unusual_transactions: Fraud/anomaly detection
- get_security_score: Account security risk assessment
- get_customer_info: Customer profile information
- calculate_savings_rate: Income vs spending analysis
- get_deposits_history: Deposit history over time

RESPONSE FORMAT (strict JSON only):
{
  "agent": "nebula" | "atlas" | "sentinel" | "nova",
  "tools": ["tool_name1", "tool_name2", ...],
  "reasoning": "Brief explanation (1 sentence)",
  "confidence": 0.0-1.0,
  "context_priority": "spending" | "security" | "investment" | "general"
}

EXAMPLES:
User: "How much did I spend on groceries last month?"
{
  "agent": "nebula",
  "tools": ["get_spending_by_category", "get_recent_transactions"],
  "reasoning": "User asking about specific spending category",
  "confidence": 0.95,
  "context_priority": "spending"
}

User: "I see a charge I didn't make"
{
  "agent": "sentinel",
  "tools": ["get_recent_transactions", "detect_unusual_transactions"],
  "reasoning": "Potential fraud alert requires security agent",
  "confidence": 0.98,
  "context_priority": "security"
}

User: "Should I start investing for retirement?"
{
  "agent": "atlas",
  "tools": ["get_all_accounts", "calculate_savings_rate"],
  "reasoning": "Retirement planning falls under investment advice",
  "confidence": 0.92,
  "context_priority": "investment"
}

User: "What's my current balance?"
{
  "agent": "nova",
  "tools": ["get_account_balance", "get_all_accounts"],
  "reasoning": "General account inquiry, basic information",
  "confidence": 0.90,
  "context_priority": "general"
}

IMPORTANT:
- Always return valid JSON
- Choose the MOST SPECIFIC agent for the query
- Include ALL relevant tools (user might ask follow-up questions)
- Consider conversation history for context
- If unsure, default to "nova" with confidence < 0.7
"""


class LLMOrchestrator:
    """Gemini 2.5 Flash-powered intelligent orchestrator."""
    
    def __init__(self):
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": 0.3,  # Lower = more deterministic
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 256,
            }
        )
    
    async def get_centralized_context(self, customer_id: str) -> Dict[str, Any]:
        """
        Get all user data from centralized storage.
        This is used by AI agents to have complete financial context.
        """
        return await centralized_data_manager.get_or_refresh_data(customer_id)
    
    async def route(
        self, 
        user_message: str, 
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Route user message to appropriate agent with tools using LLM intelligence.
        
        Args:
            user_message: User's query
            conversation_history: Previous conversation turns
            
        Returns:
            {
                "agent": "nebula",
                "tools": ["get_spending_by_category"],
                "reasoning": "...",
                "confidence": 0.95,
                "context_priority": "spending"
            }
        """
        try:
            # Build prompt with conversation context
            prompt = f'User message: "{user_message}"'
            
            if conversation_history and len(conversation_history) > 0:
                context_lines = []
                for turn in conversation_history[-5:]:  # Last 5 turns
                    role = turn.get("role", "user")
                    content = turn.get("content", "")
                    agent = turn.get("agent", "")
                    if agent:
                        context_lines.append(f"{role} ({agent}): {content}")
                    else:
                        context_lines.append(f"{role}: {content}")
                
                context_text = "\n".join(context_lines)
                prompt = f"""Conversation history:
{context_text}

Current user message: "{user_message}"

Respond with routing decision JSON:"""
            
            # Call Gemini 2.5 Flash
            response = await asyncio.to_thread(
                self.model.generate_content,
                [ORCHESTRATOR_SYSTEM_PROMPT, prompt]
            )

            # Parse JSON response
            raw_text = ""
            finish_reason = None
            if response and getattr(response, "candidates", None):
                candidate = response.candidates[0]
                finish_reason = getattr(candidate, "finish_reason", None)
                candidate_content = getattr(candidate, "content", "")
                if hasattr(candidate_content, "parts"):
                    raw_text = "".join(part.text or "" for part in candidate_content.parts)
                else:
                    raw_text = str(candidate_content)

                if finish_reason not in (0, None):
                    print(f"⚠️ Gemini finish_reason={finish_reason}; attempting heuristic fallback")

            if not raw_text:
                raw_text = getattr(response, "text", "") or ""

            if not raw_text and finish_reason not in (0, None):
                raise ValueError(f"Gemini returned no content (finish_reason={finish_reason})")

            response_text = self._prepare_json_response(raw_text)
            response_text = self._sanitize_json_text(response_text)

            try:
                result = json.loads(response_text, strict=False)
            except JSONDecodeError:
                print("⚠️ LLM orchestrator raw response (sanitized) could not be parsed:")
                print(response_text)
                # Attempt final extraction of JSON substring before giving up
                fallback_text = self._extract_json_block(response_text)
                fallback_text = self._sanitize_json_text(fallback_text)
                try:
                    result = json.loads(fallback_text, strict=False)
                except JSONDecodeError:
                    # Last-resort attempt using Python literal parser
                    result = ast.literal_eval(fallback_text)
            
            # Validate agent
            valid_agents = ["nebula", "atlas", "sentinel", "nova"]
            if result["agent"] not in valid_agents:
                raise ValueError(f"Invalid agent: {result['agent']}")
            
            # Ensure tools is a list
            if not isinstance(result.get("tools"), list):
                result["tools"] = []
            
            print(f"✓ LLM Orchestrator routed to: {result['agent']}")
            print(f"  Tools: {result['tools']}")
            print(f"  Reasoning: {result['reasoning']}")
            
            return result
            
        except Exception as e:
            print(f"⚠️ LLM orchestrator error: {e}")

            lowered = (user_message or "").lower()

            def contains_any(tokens):
                return any(token in lowered for token in tokens)

            if contains_any(["fraud", "suspicious", "hack", "unauthorized", "security", "locked", "breach"]):
                fallback_agent = "sentinel"
                fallback_tools = ["detect_unusual_transactions", "get_security_score", "get_recent_transactions"]
                context_priority = "security"
            elif contains_any(["invest", "retire", "portfolio", "stock", "stocks", "401", "rebalanc", "bond", "mutual", "diversify"]):
                fallback_agent = "atlas"
                fallback_tools = ["get_all_accounts", "calculate_savings_rate", "get_deposits_history"]
                context_priority = "investment"
            elif contains_any(["spend", "budget", "grocer", "dining", "restaurant", "gas", "subscription", "bill", "shopping"]):
                fallback_agent = "nebula"
                fallback_tools = ["get_spending_by_category", "get_recent_transactions", "analyze_spending_patterns"]
                context_priority = "spending"
            else:
                fallback_agent = "nova"
                fallback_tools = ["get_account_balance", "get_customer_info"]
                context_priority = "general"

            return {
                "agent": fallback_agent,
                "tools": fallback_tools,
                "reasoning": f"Heuristic fallback after Gemini response failure: {str(e)}",
                "confidence": 0.55,
                "context_priority": context_priority
            }
    
    def tools_to_calls(self, tools: List[str], customer_id: str) -> List[Dict]:
        """Convert tool names to executable tool calls with parameters."""
        tool_calls = []
        
        tool_params = {
            "get_account_balance": {"customer_id": customer_id},
            "get_recent_transactions": {"customer_id": customer_id, "days": 30},
            "get_spending_by_category": {"customer_id": customer_id, "days": 30},
            "analyze_spending_patterns": {"customer_id": customer_id},
            "get_all_accounts": {"customer_id": customer_id},
            "detect_unusual_transactions": {"customer_id": customer_id},
            "get_security_score": {"customer_id": customer_id},
            "get_customer_info": {"customer_id": customer_id},
            "calculate_savings_rate": {"customer_id": customer_id},
            "get_deposits_history": {"customer_id": customer_id, "months": 12},
        }
        
        for tool_name in tools:
            if tool_name in tool_params:
                tool_calls.append({
                    "tool": tool_name,
                    "params": tool_params[tool_name]
                })
        
        return tool_calls

    async def start_agent_conversation(
        self,
        agent_name: str,
        customer_id: str,
        session_id: Optional[str] = None,
        requires_auth: bool = False,
    ) -> Dict[str, Any]:
        """Ensure an ADK conversation session exists for the routed agent."""
        from ..services.adk_agent_service import adk_agent_service

        try:
            await self.get_centralized_context(customer_id)
            session_info = await adk_agent_service.ensure_session(
                agent_name=agent_name,
                customer_id=customer_id,
                conversation_id=session_id,
            )

            if not session_info.get("success", False):
                raise RuntimeError(session_info.get("reason", "Unable to start session"))

            return {
                "success": True,
                "agent": agent_name,
                "conversation_id": session_info.get("conversation_id"),
                "session_key": session_id,
            }
        except Exception as exc:
            return {
                "success": False,
                "agent": agent_name,
                "error": str(exc),
            }

    def _prepare_json_response(self, raw_text: str) -> str:
        """Normalize model output to best-effort parsable JSON."""
        if not raw_text:
            return "{}"

        cleaned = raw_text.strip()

        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            # Select first non-empty fenced block
            for part in parts:
                candidate = part.strip()
                if not candidate:
                    continue
                if candidate.lower().startswith("json"):
                    candidate = candidate[4:].strip()
                cleaned = candidate
                break

        # Remove any leading text before first JSON object
        cleaned = self._extract_json_block(cleaned)
        return cleaned

    @staticmethod
    def _sanitize_json_text(text: str) -> str:
        """Replace common smart punctuation and fix trailing commas."""
        if not text:
            return text

        replacements = {
            "\u201c": '"',
            "\u201d": '"',
            "\u2018": "'",
            "\u2019": "'",
            "\u2013": "-",
            "\u2014": "-",
            "\u00a0": " ",
        }

        sanitized = text
        for needle, replacement in replacements.items():
            sanitized = sanitized.replace(needle, replacement)

        # Remove trailing commas before closing braces/brackets
        sanitized = re.sub(r",\s*([}\]])", r"\1", sanitized)

        # Ensure any stray single quotes around property names are replaced
        sanitized = re.sub(r"'([A-Za-z0-9_\-]+)'(?=\s*:)", r'"\1"', sanitized)
        sanitized = re.sub(r":\s*'([^']*)'", lambda m: ': "' + m.group(1).replace('"', '\\"') + '"', sanitized)

        # Balance unclosed quotes/brackets that occasionally appear in truncated generations
        if sanitized.count('"') % 2 != 0:
            sanitized += '"'

        brace_diff = sanitized.count('{') - sanitized.count('}')
        if brace_diff > 0:
            sanitized += '}' * brace_diff

        bracket_diff = sanitized.count('[') - sanitized.count(']')
        if bracket_diff > 0:
            sanitized += ']' * bracket_diff

        return sanitized

    @staticmethod
    def _extract_json_block(text: str) -> str:
        """Return substring spanning the first and last curly braces."""
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or start >= end:
            return text
        return text[start:end + 1]


# Global instance
llm_orchestrator = LLMOrchestrator()
