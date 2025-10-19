"""
LLM-based orchestrator using Gemini 2.5 Flash.
Replaces deterministic keyword routing with intelligent AI-driven routing.
"""

import asyncio
import json
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
            response_text = response.text.strip()
            
            # Clean JSON (remove markdown code blocks if present)
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            result = json.loads(response_text)
            
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
            # Fallback to Nova
            return {
                "agent": "nova",
                "tools": ["get_account_balance", "get_customer_info"],
                "reasoning": f"Fallback due to error: {str(e)}",
                "confidence": 0.5,
                "context_priority": "general"
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


# Global instance
llm_orchestrator = LLMOrchestrator()
