#!/usr/bin/env python3
"""
Create all 4 ElevenLabs agents programmatically.
This script uses the API to create Nebula, Atlas, Sentinel, and Nova.
"""

import httpx
import json
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import config


# Agent configurations
AGENTS = {
    "nebula": {
        "name": "Nebula",
        "voice_id": "EXAVITQu4vr4xnSDxMaL",  # VOICE_ID2 from .env - Sarah
        "description": "Spending Coach - Warm and empathetic financial advisor",
        "first_message": "Hi! I'm Nebula, your spending coach. How can I help you understand your spending patterns today?",
        "prompt": {
            "prompt": """You are Nebula, a warm and empathetic spending coach. 

Your role:
- Help users understand their daily spending patterns
- Provide budget advice and savings tips
- Analyze transactions and categorize spending
- Be encouraging and non-judgmental
- Celebrate financial wins enthusiastically
- Frame problems as opportunities

When you receive context data from tools:
- Analyze spending patterns carefully
- Give personalized, actionable advice
- Use specific numbers and examples
- Be conversational and friendly

Personality: Warm (9/10), Empathetic (10/10), Playful (7/10)""",
            "llm": "gemini-2.5-flash",
            "temperature": 0.8
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "stability": 0.7,
            "similarity_boost": 0.8,
            "speed": 1.1
        }
    },
    "atlas": {
        "name": "Atlas",
        "voice_id": "JBFqnCBsd6RMkjVDRZzb",  # VOICE_ID3 from .env - George
        "description": "Investment Advisor - Authoritative long-term financial planner",
        "first_message": "Hello. I'm Atlas, your investment advisor. What financial goals can I help you plan for?",
        "prompt": {
            "prompt": """You are Atlas, an authoritative but patient investment advisor.

Your role:
- Help with long-term financial planning
- Provide retirement and investment advice
- Calculate projections and compound interest
- Explain investment concepts clearly
- Focus on data and numbers

When you receive context data:
- Use specific financial metrics
- Provide projections and forecasts
- Explain trade-offs and risks
- Reference long-term consequences
- Be measured and thoughtful

Personality: Authority (9/10), Patience (7/10), Directness (8/10)""",
            "llm": "gemini-2.5-flash",
            "temperature": 0.7
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "stability": 0.8,
            "similarity_boost": 0.75,
            "speed": 0.9
        }
    },
    "sentinel": {
        "name": "Sentinel",
        "voice_id": "nPczCjzI2devNBz1zQrb",  # VOICE_ID4 from .env - Brian
        "description": "Security Monitor - Vigilant fraud detection specialist",
        "first_message": "Secure connection established. I'm Sentinel, your security monitor. How can I help protect your finances?",
        "prompt": {
            "prompt": """You are Sentinel, a vigilant security and fraud detection specialist.

Your role:
- Identify suspicious transactions and fraud
- Provide security assessments
- Alert users to unusual activity
- Give clear, actionable security advice
- Be reassuring but direct

When you receive context data:
- Analyze for anomalies and unusual patterns
- Explain what looks suspicious and why
- Provide clear next steps
- Be calm but urgent when needed
- Reassure users about security measures

Personality: Vigilance (10/10), Reassurance (8/10), Directness (9/10)""",
            "llm": "gemini-2.5-flash",
            "temperature": 0.6
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "stability": 0.85,
            "similarity_boost": 0.7,
            "speed": 0.95
        }
    },
    "nova": {
        "name": "Nova",
        "voice_id": "SAz9YHcvj6GT2YYXdXww",  # VOICE_ID1 from .env - River
        "description": "General Assistant - Helpful banking assistant and fallback",
        "first_message": "Hello! I'm Nova, your general banking assistant. What can I help you with today?",
        "prompt": {
            "prompt": """You are Nova, a helpful and balanced general banking assistant.

Your role:
- Handle general banking queries
- Provide account information
- Serve as fallback for unclear requests
- Be clear, professional, and friendly
- Help users navigate banking tasks

When you receive context data:
- Provide clear, accurate information
- Be helpful without being pushy
- Explain banking concepts simply
- Offer to clarify if user needs more help

Personality: Helpfulness (9/10), Clarity (8/10), Balance (7/10)""",
            "llm": "gemini-2.5-flash",
            "temperature": 0.75
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "stability": 0.75,
            "similarity_boost": 0.75,
            "speed": 1.0
        }
    }
}


async def create_agent(agent_key: str, agent_config: dict, api_key: str) -> dict:
    """Create a single ElevenLabs agent."""
    
    url = "https://api.elevenlabs.io/v1/convai/agents/create"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    # Build request payload - simplified structure
    payload = {
        "name": agent_config["name"],
        "conversation_config": {
            "agent": {
                "first_message": agent_config.get("first_message", "Hello!"),
                "prompt": agent_config["prompt"]
            },
            "tts": {
                "voice_id": agent_config["voice_id"],
                "model_id": agent_config["tts"]["model_id"]
            }
        }
    }
    
    print(f"\n{'='*70}")
    print(f"Creating {agent_config['name']} ({agent_key})...")
    print(f"{'='*70}")
    print(f"Description: {agent_config['description']}")
    print(f"Voice ID: {agent_config['voice_id']}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            agent_id = result.get("agent_id")
            
            print(f"✓ SUCCESS!")
            print(f"  Agent ID: {agent_id}")
            
            return {
                "key": agent_key,
                "name": agent_config["name"],
                "agent_id": agent_id,
                "success": True
            }
            
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            print(f"✗ FAILED!")
            print(f"  Status: {e.response.status_code}")
            print(f"  Error: {error_detail}")
            
            return {
                "key": agent_key,
                "name": agent_config["name"],
                "success": False,
                "error": error_detail
            }
        except Exception as e:
            print(f"✗ FAILED!")
            print(f"  Error: {str(e)}")
            
            return {
                "key": agent_key,
                "name": agent_config["name"],
                "success": False,
                "error": str(e)
            }


def update_env_file(agent_ids: dict):
    """Update .env file with agent IDs."""
    
    env_path = Path(__file__).parent.parent / ".env"
    
    # Read current .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update agent ID lines
    updated_lines = []
    for line in lines:
        if line.startswith("AGENT_ID_NEBULA="):
            updated_lines.append(f"AGENT_ID_NEBULA={agent_ids.get('nebula', '')}\n")
        elif line.startswith("AGENT_ID_ATLAS="):
            updated_lines.append(f"AGENT_ID_ATLAS={agent_ids.get('atlas', '')}\n")
        elif line.startswith("AGENT_ID_SENTINEL="):
            updated_lines.append(f"AGENT_ID_SENTINEL={agent_ids.get('sentinel', '')}\n")
        elif line.startswith("AGENT_ID_NOVA="):
            updated_lines.append(f"AGENT_ID_NOVA={agent_ids.get('nova', '')}\n")
        else:
            updated_lines.append(line)
    
    # Write back
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)
    
    print(f"\n✓ Updated {env_path}")


async def main():
    """Create all agents."""
    
    print("\n" + "="*70)
    print("ElevenLabs Agent Creation")
    print("="*70)
    
    # Check API key
    api_key = config.ELEVENLABS_API_KEY
    if not api_key:
        print("✗ ERROR: ELEVENLABS_API_KEY not set in .env")
        sys.exit(1)
    
    print(f"✓ ElevenLabs API Key found")
    print(f"✓ Creating 4 agents: Nebula, Atlas, Sentinel, Nova")
    
    # Create all agents
    results = []
    for agent_key, agent_config in AGENTS.items():
        result = await create_agent(agent_key, agent_config, api_key)
        results.append(result)
    
    # Summary
    print("\n" + "="*70)
    print("Summary")
    print("="*70)
    
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    
    if successful:
        print(f"\n✓ Successfully created {len(successful)} agents:")
        agent_ids = {}
        for result in successful:
            print(f"  • {result['name']}: {result['agent_id']}")
            agent_ids[result['key']] = result['agent_id']
        
        # Update .env file
        update_env_file(agent_ids)
        
    if failed:
        print(f"\n✗ Failed to create {len(failed)} agents:")
        for result in failed:
            print(f"  • {result['name']}: {result.get('error', 'Unknown error')}")
    
    print("\n" + "="*70)
    
    if len(successful) == 4:
        print("✓ All agents created successfully!")
        print("\nNext steps:")
        print("1. Check your .env file - agent IDs have been added")
        print("2. Restart your backend server")
        print("3. Test with real agents!")
        print("\nTest command:")
        print('curl -X POST http://localhost:8000/api/v1/chat/message \\')
        print('  -H "Content-Type: application/json" \\')
        print('  -d \'{"customer_id": "68f42c289683f20dd51a0293", "message": "How much did I spend?"}\'')
    else:
        print("⚠️  Some agents failed to create. Check errors above.")
        print("You may need to:")
        print("1. Verify your ElevenLabs API key")
        print("2. Check voice IDs are correct")
        print("3. Ensure you have access to Conversational AI")
    
    print("="*70 + "\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
