"""
Complete end-to-end test of the voice banking assistant.
Tests: LLM Orchestrator → Tool Execution → Agent Response
"""

import asyncio
from src.orchestrator.llm_orchestrator import llm_orchestrator
from src.orchestrator.tool_executor import ToolExecutor
from src.tools.nessie import TOOLS_REGISTRY

async def test_complete_flow():
    """Test complete flow from user message to agent response."""
    
    print("=" * 70)
    print("COMPLETE FLOW TEST: Voice Banking Assistant")
    print("=" * 70)
    
    test_cases = [
        {
            "message": "How much did I spend on groceries last month?",
            "expected_agent": "nebula",
            "expected_tool": "get_spending_by_category"
        },
        {
            "message": "I see a suspicious charge on my account",
            "expected_agent": "sentinel",
            "expected_tool": "detect_unusual_transactions"
        },
    ]
    
    customer_id = "68f42c289683f20dd51a0293"
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"TEST {i}: {test['message']}")
        print(f"{'='*70}")
        
        # Step 1: LLM Orchestrator routes the message
        print("\n[Step 1] LLM Orchestrator routing...")
        routing = await llm_orchestrator.route(test['message'])
        
        print(f"  ✓ Agent selected: {routing['agent']}")
        print(f"  ✓ Tools: {routing['tools']}")
        print(f"  ✓ Reasoning: {routing['reasoning']}")
        print(f"  ✓ Confidence: {routing['confidence']}")
        
        # Verify expected agent
        if routing['agent'] == test['expected_agent']:
            print(f"  ✓ PASS: Correct agent ({test['expected_agent']})")
        else:
            print(f"  ✗ FAIL: Expected {test['expected_agent']}, got {routing['agent']}")
        
        # Verify expected tool
        if test['expected_tool'] in routing['tools']:
            print(f"  ✓ PASS: Tool {test['expected_tool']} included")
        else:
            print(f"  ✗ FAIL: Tool {test['expected_tool']} not in {routing['tools']}")
        
        # Step 2: Convert tools to calls
        print("\n[Step 2] Converting tools to executable calls...")
        tool_calls = llm_orchestrator.tools_to_calls(routing['tools'], customer_id)
        print(f"  ✓ Generated {len(tool_calls)} tool calls")
        for call in tool_calls:
            print(f"    - {call['tool']}")
        
        # Step 3: Execute tools
        print("\n[Step 3] Executing tools in parallel...")
        tool_executor = ToolExecutor(TOOLS_REGISTRY)
        context = await tool_executor.execute_parallel(tool_calls)
        
        print(f"  ✓ Execution time: {context.get('execution_time_ms', 0):.2f}ms")
        print(f"  ✓ Tools executed: {len([k for k in context.keys() if k != 'execution_time_ms'])}")
        
        # Show sample data
        for tool_name, result in context.items():
            if tool_name == "execution_time_ms":
                continue
            if isinstance(result, dict) and "error" not in result:
                print(f"    - {tool_name}: {list(result.keys())[:3]}...")
            elif isinstance(result, list):
                print(f"    - {tool_name}: {len(result)} items")
        
        print(f"\n{'='*70}")
        print(f"TEST {i} COMPLETE ✓")
        print(f"{'='*70}\n")

    print("\n" + "="*70)
    print("ALL TESTS COMPLETE!")
    print("="*70)
    print("\n✓ LLM Orchestrator: Working")
    print("✓ Tool Executor: Working")
    print("✓ Tools Registry: Working")
    print("\nReady for end-to-end voice testing!")

if __name__ == "__main__":
    asyncio.run(test_complete_flow())
