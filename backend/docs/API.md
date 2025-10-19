# API Reference

Complete API endpoint documentation for the Voice Banking Assistant backend.

**Base URL**: `http://localhost:8000`  
**OpenAPI Spec**: [openapi.json](../openapi.json)

---

## Health & Status

### GET `/health`

Health check endpoint.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T12:00:00Z",
  "version": "1.0.0"
}
```

**Example**:
```bash
curl http://localhost:8000/health
```

---

## Customer & Account Data

### GET `/api/v1/customer/{customer_id}`

Get complete customer data including all accounts and transactions.

**Parameters**:
- `customer_id` (path, required): Customer ID

**Response**: `200 OK`
```json
{
  "customer": {
    "_id": "68f42c289683f20dd51a0293",
    "first_name": "Taylor",
    "last_name": "River",
    "address": {
      "street_number": "123",
      "street_name": "Startup Ave",
      "city": "Austin",
      "state": "TX",
      "zip": "73301"
    }
  },
  "accounts": [
    {
      "_id": "68f42c519683f20dd51a0296",
      "type": "Checking",
      "nickname": "Auto Account 2025",
      "balance": 1880,
      "rewards": 0,
      "bills": [...],
      "deposits": [...],
      "purchases": [...]
    }
  ],
  "from_cache": true,
  "cache_layer": "memory"
}
```

**Example**:
```bash
curl http://localhost:8000/api/v1/customer/68f42c289683f20dd51a0293
```

---

### GET `/api/v1/accounts/{account_id}`

Get specific account details.

**Parameters**:
- `account_id` (path, required): Account ID

**Response**: `200 OK`
```json
{
  "_id": "68f42c519683f20dd51a0296",
  "type": "Checking",
  "nickname": "Auto Account 2025",
  "balance": 1880,
  "rewards": 0,
  "customer_id": "68f42c289683f20dd51a0293"
}
```

**Example**:
```bash
curl http://localhost:8000/api/v1/accounts/68f42c519683f20dd51a0296
```

---

### GET `/api/v1/accounts/{account_id}/transactions`

Get account transactions with optional filtering.

**Parameters**:
- `account_id` (path, required): Account ID
- `days` (query, optional): Number of days to look back (default: 30, max: 365)
- `category` (query, optional): Filter by category

**Response**: `200 OK`
```json
{
  "transactions": [
    {
      "_id": "68f42c529683f20dd51a0299",
      "merchant_id": "57cf75cea73e494d8675ec4a",
      "amount": 120,
      "description": "Sample Grocery Purchase",
      "purchase_date": "2025-10-19",
      "status": "executed"
    }
  ],
  "total": 3,
  "cached": false
}
```

**Example**:
```bash
# Last 30 days
curl http://localhost:8000/api/v1/accounts/{account_id}/transactions

# Last 7 days
curl "http://localhost:8000/api/v1/accounts/{account_id}/transactions?days=7"

# Filter by category
curl "http://localhost:8000/api/v1/accounts/{account_id}/transactions?category=grocery"
```

---

## Agent Interaction

### POST `/api/v1/chat/message`

Send a text message to the agent orchestrator.

**Request Body**:
```json
{
  "customer_id": "68f42c289683f20dd51a0293",
  "message": "How much did I spend on groceries this week?",
  "session_id": "optional-session-id"
}
```

**Response**: `200 OK`
```json
{
  "agent": "nebula",
  "response": "You spent $87.50 on groceries this week...",
  "context_used": {
    "tools_called": [
      "get_recent_transactions",
      "get_account_balance",
      "analyze_spending_patterns"
    ],
    "data_fetched": true,
    "execution_time_ms": 412
  },
  "timestamp": "2025-10-19T12:00:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend on groceries this week?"
  }'
```

**Agent Selection Examples**:

```bash
# Nebula (spending)
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "...", "message": "How much did I spend on coffee?"}'

# Atlas (investment)
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "...", "message": "How should I invest for retirement?"}'

# Sentinel (security)
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "...", "message": "I see a suspicious charge"}'

# Nova (general)
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "...", "message": "What is my account balance?"}'
```

---

### POST `/api/v1/agent/select`

Test endpoint for agent selection logic (deterministic routing).

**Request Body**:
```json
{
  "message": "How much did I spend on groceries?"
}
```

**Response**: `200 OK`
```json
{
  "agent": "nebula",
  "matched_keywords": ["spend", "groceries"],
  "reasoning": "Spending keywords detected: spend, groceries"
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on groceries?"}'
```

**Test Cases**:

| Message | Expected Agent | Reasoning |
|---------|---------------|-----------|
| "I see a suspicious charge" | sentinel | Security keywords |
| "How should I invest?" | atlas | Investment keywords |
| "What did I spend on coffee?" | nebula | Spending keywords |
| "What's my balance?" | nova | General query |
| "I'm saving for retirement" | atlas | Context: retirement |
| "I want to save money" | nebula | No retirement context |

---

## Cache Management

### GET `/api/v1/cache/status`

Get cache status information.

**Response**: `200 OK`
```json
{
  "memory_cache": {
    "entries": 3,
    "keys": [
      "customer:68f42c289683f20dd51a0293",
      "accounts:68f42c289683f20dd51a0293"
    ]
  },
  "file_cache": {
    "exists": true,
    "age_seconds": 1200,
    "ttl_remaining": 2400,
    "is_valid": true,
    "path": "data/cache/customer_data.json"
  }
}
```

**Example**:
```bash
curl http://localhost:8000/api/v1/cache/status
```

---

### POST `/api/v1/cache/refresh`

Force cache refresh (fetch fresh data from Nessie API).

**Request Body**:
```json
{
  "customer_id": "68f42c289683f20dd51a0293"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "cached_at": "2025-10-19T12:00:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293"}'
```

---

## Error Responses

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Customer not found",
  "timestamp": "2025-10-19T12:00:00Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "Failed to fetch data from Nessie API",
  "timestamp": "2025-10-19T12:00:00Z"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "customer_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## WebSocket API (Future)

### WS `/ws/agent`

WebSocket endpoint for real-time audio streaming.

**Connection**:
```javascript
const socket = io('http://localhost:8000/ws/agent');
```

**Events (Client → Server)**:
- `audio-chunk`: Send audio chunk
- `audio-end`: User stopped speaking
- `message`: Text message

**Events (Server → Client)**:
- `audio-response`: Stream audio response
- `transcript`: Transcription result
- `state-update`: Conversation state change
- `agent-selected`: Selected agent info

---

## Rate Limits

**Current**: No rate limiting (MVP)

**Future**:
- 100 requests per minute per IP
- 1000 requests per day per customer

---

## Authentication

**Current**: No authentication (demo/hackathon)

**Future**:
- Bearer token authentication
- OAuth2 integration
- API key for mobile app

---

## Testing

### Test All Endpoints

```bash
# Run comprehensive test suite
./scripts/test_endpoints.sh
```

### Validate Agent Routing

```bash
# Validate trigger keywords and routing logic
python scripts/validate_triggers.py
```

---

## Interactive Documentation

### Swagger UI
`http://localhost:8000/docs`

Interactive API documentation with "Try it out" functionality.

### ReDoc
`http://localhost:8000/redoc`

Alternative documentation interface.

---

## Client SDK Generation

Generate TypeScript client from OpenAPI spec:

```bash
# Using openapi-generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o mobile/src/api
```

Generate Python client:

```bash
pip install openapi-python-client
openapi-python-client generate --path openapi.json
```

---

## Performance Metrics

### Typical Response Times

| Endpoint | Cache Hit | Cache Miss | Notes |
|----------|-----------|------------|-------|
| `/health` | N/A | 1ms | No I/O |
| `/api/v1/customer/{id}` | 50ms | 1500ms | Memory cache |
| `/api/v1/chat/message` | 100ms | 800ms | Parallel tools |
| `/api/v1/cache/refresh` | N/A | 1500ms | Forces API call |

### Cache Hit Rates

- Memory cache: 80% (5 min TTL)
- File cache: 15% (1 hour TTL)
- API calls: 5% (cache miss)

**Overall average response time: 80ms**

---

## Environment Variables

Required for API functionality:

```bash
NESSIE_API_KEY=your_key
NESSIE_CUSTOMER_ID=68f42c289683f20dd51a0293
CACHE_TTL_SECONDS=3600
```

---

## Support

- Issues: GitHub Issues
- Documentation: [docs/](.)
- OpenAPI Spec: [openapi.json](../openapi.json)
