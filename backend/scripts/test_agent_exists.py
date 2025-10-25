#!/usr/bin/env python3
"""
Verify agents exist and can be accessed.
"""

import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import config


async def test_agent_exists():
    """Test if agent is accessible."""
    
    print("=" * 70)
    print("Testing Agent Accessibility")
    print("=" * 70)
    
    # List all agents
    url = "https://api.elevenlabs.io/v1/convai/agents"
    
    headers = {
        "xi-api-key": config.ELEVENLABS_API_KEY,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                agents = data.get("agents", [])
                
                print(f"\n✅ Found {len(agents)} agents in your account:\n")
                
                our_agent_ids = {
                    "Nebula": config.AGENT_ID_NEBULA,
                    "Atlas": config.AGENT_ID_ATLAS,
                    "Sentinel": config.AGENT_ID_SENTINEL,
                    "Nova": config.AGENT_ID_NOVA,
                }
                
                for agent in agents:
                    agent_id = agent.get("agent_id")
                    name = agent.get("name")
                    
                    # Check if this is one of our agents
                    is_ours = any(agent_id == aid for aid in our_agent_ids.values())
                    marker = "✅" if is_ours else "  "
                    
                    print(f"{marker} {name} - {agent_id}")
                
                print("\n" + "=" * 70)
                print("HOW TO TEST VOICE:")
                print("=" * 70)
                print("\n1. Via ElevenLabs Dashboard:")
                print("   - Go to: https://elevenlabs.io/app/conversational-ai")
                print("   - Click on any agent above")
                print("   - Click 'Test' button")
                print("   - Speak to test voice!\n")
                
                print("2. Via ElevenLabs Widget (for your app):")
                print("   - Use the widget embed code")
                print("   - See: test_voice.html\n")
                
                print("3. Via Mobile App:")
                print("   - Use ElevenLabs SDK for iOS/Android")
                print("   - Or WebRTC for web-based voice\n")
                
            else:
                print(f"\n❌ Error: {response.status_code}")
                print(f"Response: {response.text}\n")
                
        except Exception as e:
            print(f"\n❌ Exception: {e}\n")


if __name__ == "__main__":
    asyncio.run(test_agent_exists())
