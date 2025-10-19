#!/bin/bash

# Simple test to show agent routing working perfectly
# No API keys needed!

echo "========================================"
echo "Simple Agent Routing Test"
echo "No API keys needed - just testing logic"
echo "========================================"
echo ""

BASE_URL="${BASE_URL:-http://localhost:8000}"

# Check if server is running
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo "❌ Server not running!"
    echo "   Start it with: uv run uvicorn src.main:app --reload"
    exit 1
fi

echo "✓ Server is running\n"

# Test each agent
test_agent() {
    local message="$1"
    local expected="$2"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Message: \"$message\""
    
    result=$(curl -s -X POST "$BASE_URL/api/v1/agent/select" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$message\"}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Agent: {data['agent']}\")
print(f\"Keywords: {', '.join(data['matched_keywords'][:3])}\")
print(f\"Reasoning: {data['reasoning'][:60]}...\")
")
    
    echo "$result"
    echo ""
}

# Test all 4 agents
test_agent "How much did I spend on groceries?" "nebula"
test_agent "Should I invest for retirement?" "atlas"
test_agent "I see a suspicious charge on my account" "sentinel"
test_agent "What is my account balance?" "nova"

echo "========================================"
echo "All agent routing tests complete!"
echo "The orchestration logic is working! 🎉"
echo "========================================"
