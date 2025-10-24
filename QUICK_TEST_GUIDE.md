# Quick Testing Guide - Voice Banking Assistant

## ✅ Implementation Status: COMPLETE

All components implemented and tested:
- ✅ Gemini 2.5 Flash LLM Orchestrator
- ✅ Webhook-driven event flow
- ✅ Web audio format fixed (webm/opus)
- ✅ Tool registry with spending categories
- ✅ Conversation persistence

---

## Quick Start (5 minutes)

### 1. Start Backend
```bash
cd backend
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

**Look for**:
```
✓ Server ready on 0.0.0.0:8000
✓ ElevenLabs Agents: CONFIGURED (4 real agents)
```

### 2. Test LLM Orchestrator
```bash
# In new terminal
cd backend

# Test 1: Groceries → Nebula
uv run python -c "
import asyncio
from src.orchestrator.llm_orchestrator import llm_orchestrator
result = asyncio.run(llm_orchestrator.route('How much did I spend on groceries?'))
print(f'Agent: {result[\"agent\"]}')
print(f'Tools: {result[\"tools\"]}')
"
```

**Expected Output**:
```
Agent: nebula
Tools: ['get_spending_by_category', 'get_recent_transactions']
```

### 3. Test Complete Flow
```bash
uv run python test_complete_flow.py
```

**Expected**: All tests PASS

### 4. Test REST API
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend on groceries?"
  }' | jq .
```

**Expected**: Agent responds with actual spending data (not generic response)

### 5. Start Mobile App
```bash
cd mobile
npm start
# Press 'w' for web browser
```

**Test Flow**:
1. Go to AI Home → "Start Voice Chat"
2. Tap microphone button
3. Speak or type: "How much did I spend on groceries?"
4. Verify: Agent responds with financial data

---

## Verification Checklist

Run these to verify everything works:

```bash
cd backend

# 1. Check Gemini configuration
uv run python -c "from src.config import config; print(f'Model: {config.GEMINI_MODEL}')"
# Expected: Model: gemini-2.5-flash

# 2. Test orchestrator routing
uv run python test_orchestrator.py
# Expected: 5 routing tests with results

# 3. Test complete flow
uv run python test_complete_flow.py
# Expected: TEST 1 COMPLETE ✓, TEST 2 COMPLETE ✓

# 4. Check tools registry
uv run python -c "from src.tools.nessie import TOOLS_REGISTRY; print('get_spending_by_category' in TOOLS_REGISTRY)"
# Expected: True

# 5. Start server (should show all agents configured)
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
# Expected: ✓ ElevenLabs Agents: CONFIGURED (4 real agents)
```

---

## Common Issues & Fixes

### Issue: "Module dotenv not found"
```bash
# Always use 'uv run' prefix
uv run python test_orchestrator.py  # ✅ Correct
python3 test_orchestrator.py        # ❌ Wrong
```

### Issue: Port 8000 already in use
```bash
# Kill existing server
lsof -ti:8000 | xargs kill -9

# Or use different port
uv run uvicorn src.main:app --port 8001
```

### Issue: Web audio recording fails in mobile
**Fix**: Already fixed! Using `audio/webm;codecs=opus` now.

### Issue: Orchestrator routes to wrong agent
**Verify**:
1. Check Gemini API key is valid
2. Confirm model is `gemini-2.5-flash`
3. Run test: `uv run python test_orchestrator.py`

---

## Key Test Commands

### Backend Tests
```bash
cd backend

# Quick test: LLM routing
uv run python test_orchestrator.py

# Full flow test: Orchestrator → Tools → Response
uv run python test_complete_flow.py

# Start server
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### API Tests
```bash
# Test orchestrator endpoint
curl http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on groceries?"}'

# Test chat endpoint
curl http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "Show me my balance"}'

# Test webhook
curl http://localhost:8000/api/v1/webhooks/elevenlabs \
  -H "x-webhook-secret: $(grep WEBHOOK_SECRET .env | cut -d= -f2)" \
  -d '{"event": "agent_finished", "agentId": "test", "sessionId": "test123"}'
```

### WebSocket Test
```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:8000/ws/68f42c289683f20dd51a0293"

# Send text message
{"type": "text_message", "message": "How much did I spend on groceries?"}
```

---

## What Each Test Verifies

| Test | Verifies | Pass Criteria |
|------|----------|---------------|
| `test_orchestrator.py` | LLM routing logic | Correct agent selected for each query |
| `test_complete_flow.py` | End-to-end flow | Orchestrator → Tools → Data retrieved |
| Server startup | Configuration | All 4 agents + webhook configured |
| REST API curl | HTTP endpoint | Returns agent response with data |
| WebSocket wscat | Real-time streaming | Transcription + agent response |

---

## Debug Mode

```bash
# Start with debug logging
cd backend
DEBUG=true uv run uvicorn src.main:app --log-level debug

# Or check specific component
uv run python -c "
import asyncio
from src.orchestrator.llm_orchestrator import llm_orchestrator

async def test():
    result = await llm_orchestrator.route('groceries')
    print('Orchestrator result:', result)

asyncio.run(test())
"
```

---

## Success Indicators

When everything is working, you should see:

**Backend Startup**:
```
✓ Configuration validated
✓ Trigger validation passed: 194 unique keywords
✓ Server ready on 0.0.0.0:8000
✓ ElevenLabs Agents: CONFIGURED (4 real agents)
```

**Test Output**:
```
✓ LLM Orchestrator routed to: nebula
  Tools: ['get_spending_by_category', 'get_recent_transactions']
✓ PASS: Correct agent (nebula)
✓ PASS: Tool get_spending_by_category included
```

**API Response**:
```json
{
  "agent": "nebula",
  "response": "Based on your spending data, you spent $250.50 on groceries...",
  "context_used": {
    "tools_called": ["get_spending_by_category", "get_recent_transactions"]
  }
}
```

---

## Ready for Demo ✅

All systems operational:
- ✅ LLM-based orchestration (Gemini 2.5)
- ✅ Webhook event processing
- ✅ Audio format fixed for web
- ✅ Tool execution with caching
- ✅ Conversation persistence

**Start the servers and test!** 🚀
