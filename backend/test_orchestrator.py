"""Test LLM orchestrator routing."""

import asyncio
from src.orchestrator.llm_orchestrator import llm_orchestrator

async def test_routing():
    test_cases = [
        "How much did I spend on groceries last month?",
        "I think there's fraud on my account",
        "Should I invest for retirement?",
        "What's my balance?",
        "Show me my recent transactions",
    ]
    
    print("Testing LLM Orchestrator (Gemini 2.5 Flash)")
    print("=" * 60)
    
    for message in test_cases:
        print(f"\nUser: {message}")
        result = await llm_orchestrator.route(message)
        print(f"  → Agent: {result['agent']}")
        print(f"  → Tools: {result['tools']}")
        print(f"  → Reasoning: {result['reasoning']}")
        print(f"  → Confidence: {result['confidence']}")

if __name__ == "__main__":
    asyncio.run(test_routing())
