# Orchestration Logic

Complete orchestrator logic for agent routing and tool execution.

---

## Overview

The orchestrator is the **central coordinator** that:
1. Routes user messages to the appropriate agent (deterministic)
2. Determines required tools for the selected agent
3. Executes tools in parallel
4. Aggregates results and passes context to agent
5. Manages caching and fallbacks

**Key Principle**: Agents are **passive responders**. They receive pre-computed context and generate responses. They do NOT have direct tool access.

---

## Deterministic Agent Routing

### Algorithm

Pure `if/elif/else` logic. **NO machine learning, NO confidence scores.**

```python
def route_to_agent(message: str) -> dict:
    message_lower = message.lower()
    words = set(message_lower.split())
    
    # Priority 1: SENTINEL (security is highest priority)
    if any(keyword in words or keyword in message_lower 
           for keyword in SENTINEL_KEYWORDS):
        return {"agent": "sentinel", ...}
    
    # Priority 2: ATLAS (investment/long-term)
    elif any(keyword in words or keyword in message_lower 
             for keyword in ATLAS_KEYWORDS):
        return {"agent": "atlas", ...}
    
    # Priority 3: NEBULA (daily spending)
    elif any(keyword in words or keyword in message_lower 
             for keyword in NEBULA_KEYWORDS):
        return {"agent": "nebula", ...}
    
    # Priority 4: NOVA (general queries)
    elif any(keyword in words or keyword in message_lower 
             for keyword in NOVA_KEYWORDS):
        return {"agent": "nova", ...}
    
    # Fallback: NOVA
    else:
        return {"agent": "nova", ...}
```

### Priority Justification

1. **Sentinel first**: Security threats require immediate attention
2. **Atlas second**: Long-term planning is more specific than daily spending
3. **Nebula third**: Daily spending is common and well-defined
4. **Nova last**: Catches everything else

### Special Case: "save" / "saving"

The words "save" and "saving" can belong to both **Nebula** (daily spending) or **Atlas** (retirement savings).

**Resolution**:
```python
if "save" in words or "saving" in words:
    # Check context
    if any(atlas_word in message_lower 
           for atlas_word in ["retirement", "invest", "long-term", "future", "wealth"]):
        return {"agent": "atlas"}
    else:
        return {"agent": "nebula"}
```

**Examples**:
- "I'm saving for retirement" → **Atlas** (retirement context)
- "I want to save money on groceries" → **Nebula** (daily spending context)
- "How can I save more?" → **Nebula** (no retirement context)

---

## Tool Execution (Parallel)

### Architecture

```
Orchestrator
    ↓
Determine Tools for Agent
    ↓
ToolExecutor.execute_parallel([
    {"tool": "get_transactions", "params": {...}},
    {"tool": "get_balance", "params": {...}},
    {"tool": "analyze_spending", "params": {...}}
])
    ↓
asyncio.gather(*tasks)  # Execute all in parallel
    ↓
Aggregated Context:
{
    "get_transactions": [...],
    "get_balance": 1500.00,
    "analyze_spending": {...},
    "execution_time_ms": 450
}
    ↓
Pass to Agent
```

### Tool Mapping

**Deterministic mapping** from agent to required tools:

```python
def determine_tools_for_agent(agent: str, customer_id: str):
    if agent == "nebula":
        return [
            {"tool": "get_recent_transactions", "params": {"customer_id": customer_id, "days": 30}},
            {"tool": "get_account_balance", "params": {"customer_id": customer_id}},
            {"tool": "analyze_spending_patterns", "params": {"customer_id": customer_id}}
        ]
    
    elif agent == "atlas":
        return [
            {"tool": "get_all_accounts", "params": {"customer_id": customer_id}},
            {"tool": "get_deposits_history", "params": {"customer_id": customer_id, "months": 12}},
            {"tool": "calculate_savings_rate", "params": {"customer_id": customer_id}}
        ]
    
    elif agent == "sentinel":
        return [
            {"tool": "get_recent_transactions", "params": {"customer_id": customer_id, "days": 7}},
            {"tool": "detect_unusual_transactions", "params": {"customer_id": customer_id}},
            {"tool": "get_security_score", "params": {"customer_id": customer_id}}
        ]
    
    elif agent == "nova":
        return [
            {"tool": "get_customer_info", "params": {"customer_id": customer_id}},
            {"tool": "get_all_accounts", "params": {"customer_id": customer_id}}
        ]
```

### Execution with Timeout

Each tool has a **10-second timeout**:

```python
async def _execute_with_timeout(func, params, timeout=10):
    try:
        return await asyncio.wait_for(func(**params), timeout=timeout)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Tool execution exceeded {timeout}s")
```

### Error Handling

If a tool fails:
1. Catch exception
2. Return error in result: `{"error": "API timeout"}`
3. Continue with other tools
4. Agent decides how to handle missing data

**Example**:
```python
{
    "get_transactions": [...],           # Success
    "get_balance": {"error": "Timeout"}, # Failed
    "analyze_spending": {...},           # Success
    "execution_time_ms": 10050
}
```

---

## Caching Strategy (Multi-Layer)

### Three-Layer Architecture

```
┌─────────────────────────────┐
│  Layer 1: In-Memory Cache   │
│  TTL: 5 minutes             │
│  Speed: <1ms                │
└─────────────────────────────┘
         ↓ miss
┌─────────────────────────────┐
│  Layer 2: File Cache        │
│  TTL: 1 hour                │
│  Speed: ~10ms               │
│  File: data/cache/*.json    │
└─────────────────────────────┘
         ↓ miss
┌─────────────────────────────┐
│  Layer 3: Nessie API        │
│  TTL: None                  │
│  Speed: 500-1000ms          │
└─────────────────────────────┘
         ↓ error
┌─────────────────────────────┐
│  Fallback: Stale File Cache │
│  Use expired data if API    │
│  is unavailable             │
└─────────────────────────────┘
```

### Cache Flow

```python
async def get_with_fallback(key, fetcher):
    # Try Layer 1: Memory
    if in_memory_cache.has(key) and in_memory_cache.is_fresh(key):
        return {"data": memory_data, "cache_layer": "memory"}
    
    # Try Layer 2: File
    if file_cache.is_valid():
        file_data = file_cache.load()
        memory_cache.set(key, file_data)  # Promote to memory
        return {"data": file_data, "cache_layer": "file"}
    
    # Try Layer 3: Source API
    try:
        fresh_data = await fetcher()
        file_cache.save(fresh_data)
        memory_cache.set(key, fresh_data)
        return {"data": fresh_data, "cache_layer": "source"}
    
    except Exception as e:
        # Ultimate fallback: stale file cache
        stale_data = file_cache.load()  # Load even if expired
        if stale_data:
            return {"data": stale_data, "cache_layer": "file_stale", "error": str(e)}
        raise
```

### Cache Invalidation

**Time-based expiration**:
- Memory: 5 minutes
- File: 1 hour

**Manual refresh**:
```bash
curl -X POST http://localhost:8000/api/v1/cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "..."}'
```

---

## Complete Message Processing Flow

### End-to-End Example

**User Message**: "How much did I spend on groceries this week?"

#### Step 1: Route to Agent
```python
routing = route_to_agent("How much did I spend on groceries this week?")
# Result: {"agent": "nebula", "matched_keywords": ["spend", "groceries"], ...}
```

#### Step 2: Determine Tools
```python
tools = determine_tools_for_agent("nebula", customer_id)
# Result: [
#   {"tool": "get_recent_transactions", "params": {"customer_id": "...", "days": 30}},
#   {"tool": "get_account_balance", "params": {"customer_id": "..."}},
#   {"tool": "analyze_spending_patterns", "params": {"customer_id": "..."}}
# ]
```

#### Step 3: Execute Tools in Parallel
```python
executor = ToolExecutor(TOOLS_REGISTRY)
context = await executor.execute_parallel(tools)
# Result: {
#   "get_recent_transactions": [
#     {"amount": 45.0, "merchant": "Whole Foods", ...},
#     {"amount": 32.50, "merchant": "Trader Joe's", ...}
#   ],
#   "get_account_balance": {"total_balance": 1500.00, ...},
#   "analyze_spending_patterns": {"total_last_30_days": 342.50, ...},
#   "execution_time_ms": 387
# }
```

#### Step 4: Call Agent with Context
```python
response = await call_elevenlabs_agent(
    agent_id="nebula",
    message="How much did I spend on groceries this week?",
    context=context
)
# Agent receives pre-computed data, NO tool access
```

#### Step 5: Stream Response
```
Nebula: "You spent $77.50 on groceries this week across 
        2 transactions at Whole Foods and Trader Joe's. 
        That's about $11 per day, which is below your 
        average daily spending of $15. Great job staying 
        on budget!"
```

---

## Performance Optimization

### Parallel Execution Benefits

**Without Parallel Execution** (sequential):
```
get_transactions: 350ms
get_balance:     250ms
analyze_spending: 400ms
Total: 1000ms
```

**With Parallel Execution**:
```
All tools execute simultaneously
Total: 400ms (slowest tool)
Speedup: 2.5x
```

### Caching Benefits

**First Request** (no cache):
```
Total time: 1500ms
└─ Nessie API calls: 1200ms
└─ Processing: 300ms
```

**Second Request** (memory cache):
```
Total time: 50ms
└─ Memory cache: 1ms
└─ Processing: 49ms
Speedup: 30x
```

**Third Request** (file cache, memory expired):
```
Total time: 60ms
└─ File cache: 10ms
└─ Processing: 50ms
Speedup: 25x
```

---

## Error Scenarios

### Scenario 1: API Timeout
```
Tool: get_transactions
Error: asyncio.TimeoutError after 10s
Result: {"get_transactions": {"error": "Timeout"}}
Action: Agent generates response with partial data
```

### Scenario 2: API Down + Fresh Cache
```
Layer 1: Miss
Layer 2: Hit (400 seconds old)
Result: Return cached data
Agent: Proceeds normally
```

### Scenario 3: API Down + Stale Cache
```
Layer 1: Miss
Layer 2: Miss (expired 2 hours ago)
Layer 3: Error (API down)
Fallback: Load stale cache with warning
Result: {"data": {...}, "cache_layer": "file_stale", "error": "API unavailable"}
Agent: Proceeds with disclaimer about data freshness
```

### Scenario 4: API Down + No Cache
```
Layer 1: Miss
Layer 2: Miss
Layer 3: Error
Fallback: No data available
Result: HTTP 500 error
Response: "Unable to fetch financial data. Please try again later."
```

---

## Testing

### Validate Routing Logic

```bash
python scripts/validate_triggers.py
```

Output:
```
✓ Trigger validation passed: 127 unique keywords
✓ 'I think my card was stolen' → sentinel (expected: sentinel)
✓ 'How much should I invest for retirement?' → atlas (expected: atlas)
✓ 'How much did I spend on groceries?' → nebula (expected: nebula)
✓ 'What's my account balance?' → nova (expected: nova)
✓ All routing tests passed!
```

### Test Tool Execution

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend?"
  }'
```

Response:
```json
{
  "agent": "nebula",
  "response": "...",
  "context_used": {
    "tools_called": [
      "get_recent_transactions",
      "get_account_balance", 
      "analyze_spending_patterns"
    ],
    "execution_time_ms": 412
  }
}
```

---

## Summary

### Key Design Decisions

1. **Deterministic routing**: `if/elif/else` for predictability
2. **Parallel tool execution**: Minimize latency
3. **Multi-layer caching**: Resilience and performance
4. **Agent isolation**: Agents receive context, don't call tools
5. **Graceful degradation**: Fallbacks at every layer

### Benefits

- ✅ **100% deterministic** agent selection
- ✅ **Fast response times** (< 500ms with cache)
- ✅ **Resilient** to API failures
- ✅ **Testable** and debuggable
- ✅ **Scalable** architecture
