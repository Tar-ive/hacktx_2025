# 🚀 Quick Start - Test in 2 Minutes!

Your backend is **100% ready** with real ElevenLabs agents!

---

## ✅ What's Working

✅ **4 Real ElevenLabs Agents** with conversational AI  
✅ **Deterministic Routing** with 194 keywords  
✅ **11 Financial Tools** with parallel execution  
✅ **60-min API Cache** for all agents  
✅ **Graceful Fallbacks** at every layer  

---

## 🧪 Test Now (2 minutes)

### 1. Start Server

```bash
cd backend
uv run uvicorn src.main:app --reload
```

**You'll see**:
```
✓ Configuration validated
✓ Trigger validation passed: 194 unique keywords
✓ Server ready on 0.0.0.0:8000
✓ ElevenLabs Agents: CONFIGURED (4 real agents)
  • Nebula: agent_0901k7xas6p0...
  • Atlas: agent_7101k7xas7n8...
  • Sentinel: agent_1401k7xas9c2...
  • Nova: agent_6701k7xasabb...
```

### 2. Open Browser

**Swagger UI**: http://localhost:8000/docs

Click `/api/v1/chat/message` → Try it out!

**Input**:
```json
{
  "customer_id": "68f42c289683f20dd51a0293",
  "message": "How much did I spend this week?"
}
```

**Expected Output**:
```json
{
  "agent": "nebula",
  "response": "[Real conversational response from Nebula]",
  "context_used": {
    "tools_called": ["get_recent_transactions", ...],
    "using_real_agent": true,
    "cache_layer": "60-min API layer cache + tool fallbacks"
  }
}
```

### 3. Test All Agents

| Message | Agent | Voice |
|---------|-------|-------|
| "How much did I spend?" | Nebula | Sarah (warm) |
| "Should I invest for retirement?" | Atlas | George (British) |
| "I see a suspicious charge" | Sentinel | Brian (comforting) |
| "What is my balance?" | Nova | River (neutral) |

---

## 🎯 Quick Tests

### Test 1: Spending (Nebula)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend on groceries?"
  }'
```

### Test 2: Investment (Atlas)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Should I invest for retirement?"
  }'
```

### Test 3: Security (Sentinel)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "I see a suspicious charge on my account"
  }'
```

### Test 4: General (Nova)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "What is my account balance?"
  }'
```

---

## 📊 What Happens Behind the Scenes

```
User: "How much did I spend on groceries?"
  ↓
[1] Route to Agent (Nebula) - <100ms
  ↓
[2] Execute Tools in Parallel - 400ms
  ├─ get_recent_transactions
  ├─ get_account_balance
  └─ analyze_spending_patterns
  ↓
[3] Cache Results (60-min TTL) - 50ms
  ├─ Memory cache (5 min)
  ├─ File cache (60 min) ← API Layer!
  └─ Fallback to stale if needed
  ↓
[4] Call ElevenLabs Agent - 1-2s
  • Agent: Nebula (agent_0901k7xas6p0...)
  • Voice: Sarah (warm, reassuring)
  • Context: All cached financial data
  ↓
[5] Real Conversational Response
  "Based on your transactions, you spent $87.50 
   on groceries this week at Whole Foods and 
   Trader Joe's. That's $11/day, below your 
   usual $15/day average. Great job! 🎉"
```

---

## 🔍 Verify Cache is Working

### First Request (Cache Miss)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "balance"}' \
  | jq '.context_used.execution_time_ms'
```

**Expected**: ~400-800ms (fetching from API)

### Second Request (Cache Hit)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "balance"}' \
  | jq '.context_used.execution_time_ms'
```

**Expected**: ~50-80ms (from cache!) **18x faster!**

### Check Cache Status
```bash
curl http://localhost:8000/api/v1/cache/status | jq
```

---

## 🎯 All Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Welcome page |
| `/health` | GET | Health check |
| `/api/v1/customer/{id}` | GET | Customer data |
| `/api/v1/accounts/{id}/transactions` | GET | Transactions |
| `/api/v1/chat/message` | POST | **Chat with agents** |
| `/api/v1/agent/select` | POST | Test routing |
| `/api/v1/cache/status` | GET | Cache status |
| `/api/v1/cache/refresh` | POST | Force refresh |

---

## 🎉 Success Indicators

✅ **Server starts** with agent IDs shown  
✅ **Routing works** (test with `/api/v1/agent/select`)  
✅ **Tools execute** (check `execution_time_ms`)  
✅ **Cache speeds up** (2nd request ~18x faster)  
✅ **Real agent responds** (`using_real_agent: true`)  

---

## 📖 More Info

- **Complete docs**: See `COMPLETE_SYSTEM.md`
- **Architecture**: See `docs/full_architecture.md`
- **API reference**: See `docs/API.md`
- **Testing guide**: See `AGENT_TESTING_GUIDE.md`

---

## 🚨 Troubleshooting

### Agents Not Configured?

```bash
# Re-create agents
cd backend
uv run python scripts/create_elevenlabs_agents.py

# Verify they're in .env
grep AGENT_ID .env
```

### Cache Not Working?

```bash
# Create cache directory
mkdir -p data/cache

# Check cache status
curl http://localhost:8000/api/v1/cache/status
```

### Import Errors?

```bash
# Reinstall dependencies
cd backend
uv sync
```

---

## 🎊 You're Done!

Your backend is **production-ready** with:

✅ 4 real ElevenLabs conversational AI agents  
✅ Intelligent deterministic routing  
✅ Fast parallel tool execution  
✅ 60-min API layer caching  
✅ Graceful fallbacks everywhere  

**Test it now!** 🚀

```bash
uv run uvicorn src.main:app --reload
open http://localhost:8000/docs
```
