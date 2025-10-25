# Agent Testing Guide

Complete guide to testing all 4 ElevenLabs agents with real queries.

---

## 🎯 Quick Test All Agents

### Setup
```bash
cd backend
uv run uvicorn src.main:app --reload
```

Expected startup:
```
✓ ElevenLabs Agents: CONFIGURED (4 real agents)
  • Nebula: agent_0901k7xas6p0...
  • Atlas: agent_7101k7xas7n8...
  • Sentinel: agent_1401k7xas9c2...
  • Nova: agent_6701k7xasabb...
```

---

## 🧪 Agent 1: NEBULA (Spending Coach)

**Voice**: Sarah (warm, reassuring female)  
**Agent ID**: agent_0901k7xas6p0eg79kjbrcg0ac4r4  
**Specialty**: Spending analysis, budgeting, transactions

### Test Queries

#### Test 1.1: Basic Spending Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend this week?"
  }'
```

**Expected**:
- ✅ Routes to `nebula`
- ✅ Executes: `get_recent_transactions`, `analyze_spending_patterns`
- ✅ Uses 60-min cached data
- ✅ Returns conversational response about spending

#### Test 1.2: Category Spending
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend on groceries?"
  }'
```

**Expected**:
- ✅ Routes to `nebula` (keywords: spend, groceries)
- ✅ Executes: `get_spending_by_category`
- ✅ Returns breakdown by category

#### Test 1.3: Budget Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Can I afford to buy a new laptop for $1200?"
  }'
```

**Expected**:
- ✅ Routes to `nebula` (keywords: afford, buy)
- ✅ Executes: `get_account_balance`, `analyze_spending_patterns`
- ✅ Advises based on balance and spending patterns

#### Test 1.4: Transaction Lookup
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Show me my recent transactions"
  }'
```

**Expected**:
- ✅ Routes to `nebula` (keywords: transaction, recent)
- ✅ Executes: `get_recent_transactions`
- ✅ Lists transactions with amounts and dates

---

## 💼 Agent 2: ATLAS (Investment Advisor)

**Voice**: George (authoritative British male)  
**Agent ID**: agent_7101k7xas7n8fnxa4k56tzwkvs9w  
**Specialty**: Investments, retirement, wealth planning

### Test Queries

#### Test 2.1: Retirement Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Should I invest for retirement?"
  }'
```

**Expected**:
- ✅ Routes to `atlas` (keywords: invest, retirement)
- ✅ Executes: `get_deposits_history`, `calculate_savings_rate`
- ✅ Provides retirement advice based on income/savings

#### Test 2.2: Savings Rate Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "What is my savings rate?"
  }'
```

**Expected**:
- ✅ Routes to `atlas` (keywords: savings, rate)
- ✅ Executes: `calculate_savings_rate`
- ✅ Returns percentage and comparison to recommended rate

#### Test 2.3: Investment Portfolio Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How should I diversify my portfolio?"
  }'
```

**Expected**:
- ✅ Routes to `atlas` (keywords: portfolio, diversify)
- ✅ Executes: `get_all_accounts`
- ✅ Provides diversification advice

#### Test 2.4: Wealth Building
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How can I build wealth over time?"
  }'
```

**Expected**:
- ✅ Routes to `atlas` (keywords: wealth, build)
- ✅ Executes: `get_deposits_history`, `analyze_spending_patterns`
- ✅ Provides long-term wealth strategy

---

## 🛡️ Agent 3: SENTINEL (Security Monitor)

**Voice**: Brian (resonant, comforting male)  
**Agent ID**: agent_1401k7xas9c2e2kr1z6btnr6vg2j  
**Specialty**: Fraud detection, security, suspicious activity

### Test Queries

#### Test 3.1: Suspicious Charge
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "I see a suspicious charge on my account"
  }'
```

**Expected**:
- ✅ Routes to `sentinel` (keywords: suspicious, charge)
- ✅ Executes: `get_recent_transactions`, `detect_unusual_transactions`
- ✅ Analyzes for fraud and provides security advice

#### Test 3.2: Fraud Check
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Was my account hacked?"
  }'
```

**Expected**:
- ✅ Routes to `sentinel` (keywords: hack, account)
- ✅ Executes: `detect_unusual_transactions`, `get_security_score`
- ✅ Checks for unauthorized access patterns

#### Test 3.3: Security Score
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How secure is my account?"
  }'
```

**Expected**:
- ✅ Routes to `sentinel` (keywords: secure, account)
- ✅ Executes: `get_security_score`
- ✅ Returns security rating (0-100) and recommendations

#### Test 3.4: Unauthorized Transaction
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "I did not authorize this $500 charge"
  }'
```

**Expected**:
- ✅ Routes to `sentinel` (keywords: authorize, charge)
- ✅ Executes: `get_recent_transactions`, `detect_unusual_transactions`
- ✅ Provides fraud reporting guidance

---

## 🌟 Agent 4: NOVA (General Assistant)

**Voice**: River (neutral, conversational)  
**Agent ID**: agent_6701k7xasabbfm4b1bthkvvkmbxj  
**Specialty**: General banking questions, account info, fallback

### Test Queries

#### Test 4.1: Account Balance
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "What is my account balance?"
  }'
```

**Expected**:
- ✅ Routes to `nova` (keywords: account, balance)
- ✅ Executes: `get_account_balance`
- ✅ Returns total balance across all accounts

#### Test 4.2: Account Information
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Show me my account information"
  }'
```

**Expected**:
- ✅ Routes to `nova` (keywords: account, information)
- ✅ Executes: `get_customer_info`, `get_all_accounts`
- ✅ Returns customer details and account list

#### Test 4.3: General Help
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "What can you help me with?"
  }'
```

**Expected**:
- ✅ Routes to `nova` (keywords: help)
- ✅ Executes: No tools (general question)
- ✅ Lists capabilities and available services

#### Test 4.4: Fallback Case
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "What is the weather today?"
  }'
```

**Expected**:
- ✅ Routes to `nova` (no keywords match → fallback)
- ✅ Politely explains this is a banking assistant
- ✅ Offers to help with financial questions

---

## 🔍 Verify Routing Logic

### Test Routing Only (No Agent Call)

```bash
# Test Nebula routing
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend?"}' | jq

# Test Atlas routing
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "Should I invest in stocks?"}' | jq

# Test Sentinel routing
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "Suspicious fraud alert"}' | jq

# Test Nova routing (fallback)
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello there"}' | jq
```

---

## 📊 Verify Cache Performance

### Test Cache Speed

```bash
# First request (cache miss)
time curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "balance"}'

# Second request (cache hit - should be 18x faster!)
time curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "balance"}'
```

**Expected**:
- First: ~400-800ms (API call)
- Second: ~50-80ms (from 60-min cache) **18x faster!**

### Check Cache Status

```bash
curl http://localhost:8000/api/v1/cache/status | jq
```

**Expected**:
```json
{
  "memory_cache": {
    "size": 12,
    "ttl_seconds": 300
  },
  "file_cache": {
    "exists": true,
    "ttl_seconds": 3600,
    "age_seconds": 45,
    "is_stale": false
  },
  "cache_hit_rate": "95%",
  "api_calls_avoided": 187
}
```

---

## 🎯 Interactive Testing (Swagger UI)

### Browser Testing

1. **Open Swagger UI**: http://localhost:8000/docs

2. **Click `/api/v1/chat/message`** → "Try it out"

3. **Enter test data**:
```json
{
  "customer_id": "68f42c289683f20dd51a0293",
  "message": "How much did I spend this week?",
  "session_id": "test-session-123"
}
```

4. **Click "Execute"**

5. **Verify response**:
```json
{
  "agent": "nebula",
  "response": "[Real conversational response from Sarah's voice]",
  "context_used": {
    "tools_called": ["get_recent_transactions", ...],
    "using_real_agent": true,
    "cache_layer": "60-min API layer cache + tool fallbacks"
  }
}
```

---

## ✅ Success Checklist

After testing, verify:

- [ ] **Nebula** responds to spending questions
- [ ] **Atlas** responds to investment questions
- [ ] **Sentinel** responds to security questions
- [ ] **Nova** responds to general questions
- [ ] Cache speeds up second requests (18x faster)
- [ ] All tools execute successfully
- [ ] Cached data is provided to all agents
- [ ] Conversational responses are natural
- [ ] Fallback works if agent unavailable

---

## 🚨 Troubleshooting

### Agents not configured?
```bash
grep AGENT_ID backend/.env
# Should show 4 agent IDs
```

**Fix**:
```bash
cd backend
uv run python scripts/create_elevenlabs_agents.py
```

### Tools timing out?
```bash
# Check Nessie API is accessible
curl http://api.nessieisreal.com/enterprises/customers/68f42c289683f20dd51a0293?key=5de52c86d2cd18623332cf128ebcb2a8
```

### Cache not working?
```bash
# Check cache directory exists
ls -la backend/data/cache/
mkdir -p backend/data/cache/

# Check cache status
curl http://localhost:8000/api/v1/cache/status
```

---

## 🎉 All Tests Passing?

**Congratulations!** Your backend is fully functional with:

✅ 4 real ElevenLabs agents  
✅ Intelligent routing  
✅ Fast tool execution  
✅ 60-min API cache  
✅ Graceful fallbacks  

**Ready for mobile integration!** 🚀

See `COMPLETE_SYSTEM.md` for full documentation.
