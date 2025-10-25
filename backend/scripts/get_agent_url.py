#!/usr/bin/env python3
"""
Get signed URL for testing ElevenLabs agent in browser.
"""

import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import config


async def get_signed_url(agent_name: str):
    """Get signed URL for an agent."""
    
    agent_ids = {
        "nebula": config.AGENT_ID_NEBULA,
        "atlas": config.AGENT_ID_ATLAS,
        "sentinel": config.AGENT_ID_SENTINEL,
        "nova": config.AGENT_ID_NOVA,
    }
    
    agent_id = agent_ids.get(agent_name)
    
    if not agent_id:
        print(f"❌ Unknown agent: {agent_name}")
        print(f"Available: {', '.join(agent_ids.keys())}")
        return
    
    print("=" * 70)
    print(f"Getting Signed URL for {agent_name.upper()}")
    print("=" * 70)
    print(f"\nAgent ID: {agent_id}")
    
    url = "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url"
    
    headers = {
        "xi-api-key": config.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "agent_id": agent_id
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                signed_url = data.get("signed_url", "")
                
                print("\n✅ SUCCESS!\n")
                print(f"Signed URL: {signed_url}\n")
                print("=" * 70)
                print("HOW TO USE:")
                print("=" * 70)
                print("\n1. OPTION A: Use ElevenLabs Widget")
                print("   - Add this to your HTML:")
                print('   <script src="https://elevenlabs.io/convai-widget/index.js"></script>')
                print('   <elevenlabs-convai agent-id="' + agent_id + '"></elevenlabs-convai>')
                
                print("\n2. OPTION B: Use WebSocket")
                print("   - Connect to signed URL with WebSocket")
                print("   - Stream audio bidirectionally")
                print("   - See: https://elevenlabs.io/docs/conversational-ai/overview")
                
                print("\n3. OPTION C: Test in Browser")
                print(f"   - Open: file://{os.path.abspath('test_voice.html')}")
                
                print("\n" + "=" * 70)
                
            else:
                print(f"\n❌ Error: {response.status_code}")
                print(f"Response: {response.text}\n")
                
        except Exception as e:
            print(f"\n❌ Exception: {e}\n")


if __name__ == "__main__":
    agent = sys.argv[1] if len(sys.argv) > 1 else "nebula"
    asyncio.run(get_signed_url(agent))
