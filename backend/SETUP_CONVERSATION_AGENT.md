# ElevenLabs Conversation Agent Setup Guide

This document explains the steps required to get the ElevenLabs conversation agent working in the ReBank project.

## What Was the Problem?

The original code had several issues preventing the conversation agent from running:

1. **Missing Dependencies**: The `google-generativeai` module was missing from the environment
2. **Incorrect Import Paths**: The `ClientTools` class was being imported from the wrong module path
3. **Missing Audio Interface**: The `Conversation` class requires an `audio_interface` parameter that wasn't provided
4. **Missing System Dependencies**: `pyaudio` requires the `portaudio` system library to be installed

## Manual Setup Steps

### 1. System Dependencies
```bash
# Install portaudio library (required by pyaudio)
brew install portaudio
```

### 2. Python Dependencies
```bash
# Navigate to backend directory
cd /Users/quamos/hacktx_2025/backend

# Sync dependencies
uv sync

# Add specific ElevenLabs dependencies
uv add google-generativeai
uv add --upgrade elevenlabs
uv add pyaudio
```

### 3. Code Changes Made

#### File: `src/integrations/elevenlabs_integration.py`

**Changed import statement:**
```python
# OLD:
from elevenlabs.conversational_ai.client_tools import ClientTools

# NEW:
from elevenlabs.conversational_ai.conversation import ClientTools, DefaultAudioInterface
```

**Updated Conversation initialization:**
```python
# OLD:
conversation = Conversation(
    client=self.client,
    agent_id=agent_id,
    client_tools=self._create_client_tools(agent_name),
    requires_auth=requires_auth,
)

# NEW:
conversation = Conversation(
    client=self.client,
    agent_id=agent_id,
    client_tools=self._create_client_tools(agent_name),
    requires_auth=requires_auth,
    audio_interface=DefaultAudioInterface(),
)
```

### 4. Environment Setup
```bash
# Source environment variables
source .env

# Verify the setup works
uv run bash agents/scripts/test_agent_conversation.sh nebula
```

## Automated Setup

Use the provided setup script to automate all these steps:

```bash
# From the backend directory
./setup_conversation_agent.sh
```

## Available Agents

The system supports the following agents:
- **nebula**: General banking assistant
- **atlas**: (TBD) Specific banking operations
- **sentinel**: (TBD) Security and fraud detection
- **nova**: (TBD) Advanced features

## Running Tests

```bash
# Make sure environment is sourced
source .env

# Test with nebula agent
uv run bash agents/scripts/test_agent_conversation.sh nebula

# Test with specific customer and session
uv run bash agents/scripts/test_agent_conversation.sh nebula 68f42c289683f20dd51a0293 my-session-id
```

## Environment Variables Required

Ensure your `.env` file contains:
```bash
ELEVENLABS_API_KEY=your_api_key_here
AGENT_ID_NEBULA=your_nebula_agent_id
AGENT_ID_ATLAS=your_atlas_agent_id
AGENT_ID_SENTINEL=your_sentinel_agent_id
AGENT_ID_NOVA=your_nova_agent_id
```

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'google'"
**Solution**: `uv add google-generativeai`

### Error: "ModuleNotFoundError: No module named 'elevenlabs.conversational_ai.client_tools'"
**Solution**: Update import path in `elevenlabs_integration.py` as shown above

### Error: "missing 1 required keyword-only argument: 'audio_interface'"
**Solution**: Add `audio_interface=DefaultAudioInterface()` to Conversation initialization

### Error: "To use DefaultAudioInterface you must install pyaudio"
**Solution**:
```bash
brew install portaudio
uv add pyaudio
```

## Future Considerations

1. **Custom Audio Interface**: For production use, consider implementing a custom audio interface instead of using `DefaultAudioInterface`
2. **Error Handling**: Add proper error handling for cases where audio devices are not available
3. **Configuration**: Move audio interface configuration to environment settings for different deployment scenarios
4. **Testing**: Add comprehensive tests for the conversation setup and tool integration