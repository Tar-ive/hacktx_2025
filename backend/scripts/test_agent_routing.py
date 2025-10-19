#!/usr/bin/env python3
"""
Test agent routing and tool execution without ElevenLabs.
This demonstrates the orchestration logic working correctly.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.orchestrator.router import route_to_agent
from src.orchestrator.tool_executor import ToolExecutor, determine_tools_for_agent
from src.tools.nessie import TOOLS_REGISTRY
from src.config import config


async def test_agent_routing():
    """Test agent selection and tool execution."""
    
    print("=" * 70)
    print("Testing Agent Routing & Tool Execution")
    print("=" * 70)
    
    test_messages = [
        ("How much did I spend on groceries?", "nebula"),
        ("Should I invest for retirement?", "atlas"),
        ("I see a suspicious charge", "sentinel"),
        ("What's my account balance?", "nova"),
    ]
    
    for message, expected_agent in test_messages:
        print(f"\n{'='*70}")
        print(f"USER: {message}")
        print(f"{'='*70}")
        
        # Step 1: Route to agent
        routing = route_to_agent(message)
        selected_agent = routing["agent"]
        
        status = "✓" if selected_agent == expected_agent else "✗"
        print(f"\n{status} SELECTED AGENT: {selected_agent.upper()}")
        print(f"   Expected: {expected_agent}")
        print(f"   Matched Keywords: {routing['matched_keywords']}")
        print(f"   Reasoning: {routing['reasoning']}")
        
        # Step 2: Determine tools for agent
        customer_id = config.NESSIE_CUSTOMER_ID
        if not customer_id:
            print("\n⚠️  NESSIE_CUSTOMER_ID not set in .env - skipping tool execution")
            continue
            
        tool_calls = determine_tools_for_agent(selected_agent, customer_id)
        print(f"\n📋 TOOLS TO EXECUTE ({len(tool_calls)}):")
        for i, tool_call in enumerate(tool_calls, 1):
            print(f"   {i}. {tool_call['tool']}")
        
        # Step 3: Execute tools (only if API key is set)
        if config.NESSIE_API_KEY:
            print(f"\n⚙️  EXECUTING TOOLS IN PARALLEL...")
            try:
                executor = ToolExecutor(TOOLS_REGISTRY)
                context = await executor.execute_parallel(tool_calls)
                
                # Show results
                print(f"\n✓ EXECUTION COMPLETE ({context.get('execution_time_ms', 0):.0f}ms)")
                
                for tool_name, result in context.items():
                    if tool_name == "execution_time_ms":
                        continue
                    
                    if isinstance(result, dict) and "error" in result:
                        print(f"   ✗ {tool_name}: {result['error']}")
                    else:
                        # Show summary of result
                        if isinstance(result, list):
                            print(f"   ✓ {tool_name}: {len(result)} items")
                        elif isinstance(result, dict):
                            keys = list(result.keys())[:3]
                            print(f"   ✓ {tool_name}: {', '.join(keys)}...")
                        else:
                            print(f"   ✓ {tool_name}: {result}")
                
                print(f"\n💬 MOCK AGENT RESPONSE:")
                print(f"   (ElevenLabs agent would generate response from this context)")
                
            except Exception as e:
                print(f"\n✗ ERROR: {e}")
        else:
            print(f"\n⚠️  NESSIE_API_KEY not set - skipping tool execution")
            print(f"   Set NESSIE_API_KEY in .env to test with real data")


async def test_cache_performance():
    """Test cache performance."""
    print(f"\n\n{'='*70}")
    print("Testing Cache Performance")
    print(f"{'='*70}")
    
    if not config.NESSIE_API_KEY or not config.NESSIE_CUSTOMER_ID:
        print("\n⚠️  API keys not set - skipping cache test")
        return
    
    from src.tools.nessie import get_all_accounts
    import time
    
    # First call (cache miss)
    print("\n📥 First call (cache miss)...")
    start = time.time()
    try:
        result1 = await get_all_accounts(config.NESSIE_CUSTOMER_ID)
        time1 = (time.time() - start) * 1000
        print(f"   ✓ Retrieved {len(result1)} accounts in {time1:.0f}ms")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    
    # Second call (cache hit)
    print("\n📦 Second call (should be cached)...")
    start = time.time()
    try:
        result2 = await get_all_accounts(config.NESSIE_CUSTOMER_ID)
        time2 = (time.time() - start) * 1000
        print(f"   ✓ Retrieved {len(result2)} accounts in {time2:.0f}ms")
        
        if time2 < time1 / 5:  # At least 5x faster
            speedup = time1 / time2
            print(f"\n🚀 CACHE SPEEDUP: {speedup:.1f}x faster!")
        else:
            print(f"\n⚠️  Expected cache hit but got similar time")
    except Exception as e:
        print(f"   ✗ Error: {e}")


def main():
    print("\n")
    print("🏦 Voice Banking Backend - Agent Testing")
    print("=" * 70)
    print("This tests the orchestration logic WITHOUT ElevenLabs agents.")
    print("It demonstrates agent routing and tool execution.\n")
    
    # Check configuration
    print("Configuration:")
    print(f"  NESSIE_API_KEY: {'✓ Set' if config.NESSIE_API_KEY else '✗ Not set'}")
    print(f"  NESSIE_CUSTOMER_ID: {'✓ Set' if config.NESSIE_CUSTOMER_ID else '✗ Not set'}")
    print(f"  ELEVENLABS_API_KEY: {'✓ Set' if config.ELEVENLABS_API_KEY else '✗ Not set (not needed yet)'}")
    print()
    
    # Run tests
    asyncio.run(test_agent_routing())
    asyncio.run(test_cache_performance())
    
    print("\n" + "=" * 70)
    print("Testing Complete!")
    print("=" * 70)
    print("\nNext Steps to Enable Real ElevenLabs Agents:")
    print("1. Set ELEVENLABS_API_KEY in .env")
    print("2. Create 4 agents via ElevenLabs API")
    print("3. Set agent IDs in .env (AGENT_ID_NEBULA, etc.)")
    print("4. Implement agent invocation in src/services/elevenlabs_client.py")
    print("\nFor now, the backend returns mock responses but with REAL data from tools!")
    print()


if __name__ == "__main__":
    main()
