#!/usr/bin/env bash

# Setup script for ElevenLabs conversation agent testing
# This script automates all the steps required to get the conversation agent running

set -euo pipefail

echo "🚀 Setting up ElevenLabs Conversation Agent Environment"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if we're in the backend directory
if [[ ! -f "pyproject.toml" ]]; then
    print_error "This script must be run from the backend directory"
    exit 1
fi

echo ""
print_status "Step 1: Installing system dependencies (portaudio)"
if ! brew list portaudio &>/dev/null; then
    brew install portaudio
else
    print_status "Portaudio already installed"
fi

echo ""
print_status "Step 2: Syncing Python dependencies with uv"
uv sync

echo ""
print_status "Step 3: Adding specific ElevenLabs dependencies"
uv add google-generativeai
uv add --upgrade elevenlabs
uv add pyaudio

echo ""
print_status "Step 4: Verifying environment setup"
if [[ ! -f ".env" ]]; then
    print_warning "No .env file found. Please create one with ELEVENLABS_API_KEY and agent IDs."
    echo "Required environment variables:"
    echo "- ELEVENLABS_API_KEY"
    echo "- AGENT_ID_NEBULA"
    echo "- AGENT_ID_ATLAS"
    echo "- AGENT_ID_SENTINEL"
    echo "- AGENT_ID_NOVA"
    echo ""
    print_warning "Make sure to source the .env file before running agents:"
    echo "source backend/.env"
else
    print_status ".env file found"
fi

echo ""
print_status "Step 5: Running test to verify setup"
if source .env; then
    uv run bash agents/scripts/test_agent_conversation.sh nebula && \
        print_status "✅ Setup completed successfully!" || \
        print_error "❌ Setup completed but test failed - check environment variables"
else
    print_warning "⚠️  Setup completed but couldn't source .env file"
    print_warning "Make sure to source it manually before running agents"
fi

echo ""
echo "🎯 To run the conversation agent:"
echo "   source .env"
echo "   uv run bash agents/scripts/test_agent_conversation.sh nebula"
echo ""
echo "Available agents: nebula, atlas, sentinel, nova"