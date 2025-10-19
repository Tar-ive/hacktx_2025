#!/usr/bin/env python3
"""
Test ElevenLabs agent call directly to see the actual error.
"""

import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import config


async def test_agent_call():
    """Test calling an ElevenLabs agent directly."""
    
    print("=" * 70)
    print("Testing ElevenLabs Agent Call")
    print("=" * 70)
    
    api_key = config.ELEVENLABS_API_KEY
    agent_id = config.AGENT_ID_NEBULA
    
    print(f"\n✓ API Key: {api_key[:20]}...")
    print(f"✓ Agent ID: {agent_id}\n")
    
    # Try the conversational AI endpoint
    url = f"https://api.elevenlabs.io/v1/convai/conversation"
    
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "agent_id": agent_id,
    }
    
    print(f"POST {url}")
    print(f"Payload: {payload}\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}\n")
            
            if response.status_code == 200:
                print("✅ SUCCESS! Agent responded")
                data = response.json()
                print(f"Conversation ID: {data.get('conversation_id')}")
            else:
                print("❌ FAILED!")
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    asyncio.run(test_agent_call())
