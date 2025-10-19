"""
ElevenLabs Conversational AI client.
Calls real ElevenLabs agents with pre-computed context from tools.
"""

import httpx
from typing import Dict, Any, Optional
from ..config import config


class ElevenLabsClient:
    """Client for calling ElevenLabs Conversational AI agents."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or config.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1"
        
    async def call_agent(
        self, 
        agent_id: str, 
        message: str,
        context: Dict[str, Any],
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call an ElevenLabs agent with pre-computed context.
        
        Args:
            agent_id: The ElevenLabs agent ID
            message: User's message
            context: Pre-computed context from tools (cached financial data)
            conversation_id: Optional conversation ID for multi-turn
        
        Returns:
            {
                "text": "Agent's text response",
                "audio": "base64 encoded audio (if available)",
                "conversation_id": "conversation ID for follow-ups"
            }
        """
        
        # Format context for agent
        context_text = self._format_context(context)
        
        # Build enhanced message with context
        enhanced_message = f"""User Query: {message}

Financial Data Context (from cache):
{context_text}

Please analyze this data and respond to the user's query in a conversational, helpful manner."""
        
        # For now, use the text-based conversation endpoint
        # In production, you might use the WebSocket for audio streaming
        url = f"{self.base_url}/convai/conversations"
        
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "agent_id": agent_id,
            "text": enhanced_message,
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                
                return {
                    "text": result.get("text", ""),
                    "conversation_id": result.get("conversation_id"),
                    "success": True
                }
                
            except httpx.HTTPStatusError as e:
                error_msg = f"ElevenLabs API error: {e.response.status_code} - {e.response.text}"
                print(f"⚠️  {error_msg}")
                
                # Return fallback response
                return {
                    "text": self._generate_fallback_response(message, context),
                    "success": False,
                    "error": error_msg
                }
            except Exception as e:
                error_msg = f"Error calling ElevenLabs: {str(e)}"
                print(f"⚠️  {error_msg}")
                
                # Return fallback response
                return {
                    "text": self._generate_fallback_response(message, context),
                    "success": False,
                    "error": error_msg
                }
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """
        Format tool results into readable context for agent.
        
        This provides the cached financial data to all agents as fallback.
        """
        lines = []
        
        for tool_name, result in context.items():
            if tool_name == "execution_time_ms":
                continue
            
            # Handle errors
            if isinstance(result, dict) and "error" in result:
                lines.append(f"❌ {tool_name}: {result['error']}")
                continue
            
            # Format different result types
            lines.append(f"\n📊 {tool_name}:")
            
            if isinstance(result, list):
                if len(result) == 0:
                    lines.append("  No data available")
                elif len(result) <= 5:
                    # Show all items if small list
                    for i, item in enumerate(result, 1):
                        lines.append(f"  {i}. {self._format_item(item)}")
                else:
                    # Show first 5 items for large lists
                    for i, item in enumerate(result[:5], 1):
                        lines.append(f"  {i}. {self._format_item(item)}")
                    lines.append(f"  ... and {len(result) - 5} more")
            
            elif isinstance(result, dict):
                # Format dict as key-value pairs
                for key, value in result.items():
                    if isinstance(value, (int, float, str, bool)):
                        lines.append(f"  • {key}: {value}")
                    elif isinstance(value, list):
                        lines.append(f"  • {key}: {len(value)} items")
                    else:
                        lines.append(f"  • {key}: {type(value).__name__}")
            
            else:
                lines.append(f"  {result}")
        
        return "\n".join(lines)
    
    def _format_item(self, item: Any) -> str:
        """Format a single item for display."""
        if isinstance(item, dict):
            # Extract key fields
            if "description" in item and "amount" in item:
                return f"${item['amount']:.2f} - {item.get('description', 'N/A')}"
            elif "payee" in item and "payment_amount" in item:
                return f"${item['payment_amount']:.2f} to {item['payee']}"
            elif "amount" in item:
                return f"${item['amount']:.2f}"
            else:
                # Generic dict formatting
                keys = list(item.keys())[:3]
                return ", ".join(f"{k}={item[k]}" for k in keys)
        return str(item)
    
    def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> str:
        """
        Generate a fallback response if ElevenLabs call fails.
        Uses the cached data to still provide useful information.
        """
        response = "I apologize, but I'm having trouble connecting to my conversational AI service. "
        response += "However, based on the cached financial data available:\n\n"
        
        # Extract useful info from context
        if "get_account_balance" in context:
            balance_data = context["get_account_balance"]
            if not isinstance(balance_data, dict) or "error" not in balance_data:
                response += f"💰 Your total balance: ${balance_data.get('total_balance', 0):.2f}\n"
        
        if "get_recent_transactions" in context:
            transactions = context["get_recent_transactions"]
            if isinstance(transactions, list) and len(transactions) > 0:
                response += f"📊 Recent transactions: {len(transactions)} found\n"
        
        if "analyze_spending_patterns" in context:
            patterns = context["analyze_spending_patterns"]
            if isinstance(patterns, dict) and "total_last_30_days" in patterns:
                response += f"💳 Spending last 30 days: ${patterns['total_last_30_days']:.2f}\n"
        
        response += "\nPlease try again in a moment, or contact support if the issue persists."
        
        return response


# Global client instance
elevenlabs_client = ElevenLabsClient()


async def call_agent_with_context(
    agent_name: str,
    message: str, 
    context: Dict[str, Any],
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to call an agent by name.
    
    Args:
        agent_name: Agent name (nebula, atlas, sentinel, nova)
        message: User's message
        context: Pre-computed context from tools
        conversation_id: Optional conversation ID
    
    Returns:
        Agent response with text and metadata
    """
    # Map agent names to IDs from config
    agent_ids = {
        "nebula": config.AGENT_ID_NEBULA,
        "atlas": config.AGENT_ID_ATLAS,
        "sentinel": config.AGENT_ID_SENTINEL,
        "nova": config.AGENT_ID_NOVA,
    }
    
    agent_id = agent_ids.get(agent_name)
    
    if not agent_id:
        return {
            "text": f"Agent '{agent_name}' not configured. Please set {agent_name.upper()}_AGENT_ID in .env",
            "success": False,
            "error": "Agent ID not configured"
        }
    
    return await elevenlabs_client.call_agent(
        agent_id=agent_id,
        message=message,
        context=context,
        conversation_id=conversation_id
    )
