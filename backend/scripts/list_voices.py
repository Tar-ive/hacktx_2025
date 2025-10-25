#!/usr/bin/env python3
"""List available ElevenLabs voices."""

import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import config


async def list_voices():
    """Fetch and display available voices."""
    
    api_key = config.ELEVENLABS_API_KEY
    if not api_key:
        print("✗ ERROR: ELEVENLABS_API_KEY not set in .env")
        sys.exit(1)
    
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": api_key}
    
    print("=" * 70)
    print("ElevenLabs Available Voices")
    print("=" * 70)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            voices = data.get("voices", [])
            
            if not voices:
                print("\n✗ No voices found")
                return
            
            print(f"\n✓ Found {len(voices)} voices:\n")
            
            for i, voice in enumerate(voices, 1):
                voice_id = voice.get("voice_id")
                name = voice.get("name")
                labels = voice.get("labels", {})
                category = voice.get("category")
                
                gender = labels.get("gender", "unknown")
                age = labels.get("age", "unknown")
                accent = labels.get("accent", "unknown")
                description = voice.get("description", "")
                
                print(f"{i}. {name}")
                print(f"   ID: {voice_id}")
                print(f"   Gender: {gender}, Age: {age}, Accent: {accent}")
                print(f"   Category: {category}")
                if description:
                    print(f"   Description: {description[:80]}...")
                print()
            
            print("=" * 70)
            print("\nTo use a voice, copy its ID to your .env file:")
            print("VOICE_ID1=<paste_id_here>  # Nova")
            print("VOICE_ID2=<paste_id_here>  # Nebula")
            print("VOICE_ID3=<paste_id_here>  # Atlas")
            print("VOICE_ID4=<paste_id_here>  # Sentinel")
            print("=" * 70)
            
        except httpx.HTTPStatusError as e:
            print(f"\n✗ Error: {e.response.status_code}")
            print(f"   {e.response.text}")
        except Exception as e:
            print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(list_voices())
