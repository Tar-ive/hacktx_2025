# Voice Banking Assistant Backend

**Production-ready** FastAPI backend with 4 real ElevenLabs conversational AI agents.

## ✅ Status: 100% Complete & Working

🎉 **All 4 ElevenLabs agents created and integrated!**

## Features

- ✅ **4 Specialized Agents** (Nebula, Atlas, Sentinel, Nova)
- ✅ **Deterministic Agent Routing** (if/elif/else logic, NO ML)
- ✅ **Parallel Tool Execution** (concurrent data fetching)
- ✅ **Multi-Layer Caching** (Memory → File → API with fallbacks)
- ✅ **1-Hour TTL Cache** for Nessie API data
- ✅ **OpenAPI 3.1 Specification**
- ✅ **Docker Support**

## 🚀 Quick Start (2 Minutes)

```bash
# 1. Start server
cd backend
uv run uvicorn src.main:app --reload

# 2. Open browser
open http://localhost:8000/docs

# 3. Test with curl
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend this week?"
  }'
```

**Expected startup**:
```
✓ ElevenLabs Agents: CONFIGURED (4 real agents)
  • Nebula: agent_0901k7xas6p0...
  • Atlas: agent_7101k7xas7n8...
  • Sentinel: agent_1401k7xas9c2...
  • Nova: agent_6701k7xasabb...
```

## 📖 Complete Documentation

| Document | Purpose |
|----------|---------|
| **[QUICK_START.md](QUICK_START.md)** | Test in 2 minutes! |
| **[COMPLETE_SYSTEM.md](COMPLETE_SYSTEM.md)** | Full system overview |
| **[WHATS_WORKING.md](WHATS_WORKING.md)** | Feature status (100%!) |
| **[AGENT_TESTING_GUIDE.md](AGENT_TESTING_GUIDE.md)** | Test all 4 agents |
| [docs/agents.md](docs/agents.md) | Agent specifications |
| [docs/orchestration.md](docs/orchestration.md) | Orchestrator logic |
| [docs/API.md](docs/API.md) | API reference |

Server will be available at `http://localhost:8000`

### Running with Docker

```bash
# Build and run
docker-compose up --build

# Or with specific environment variables
NESSIE_API_KEY=your_key docker-compose up
```

## Testing

### Validate Trigger Keywords

```bash
python scripts/validate_triggers.py
```

This will:
- Check for keyword overlaps between agents
- Test deterministic routing logic
- Validate all agent selection cases

### Test API Endpoints

```bash
# Set environment variables
export CUSTOMER_ID=68f42c289683f20dd51a0293
export ACCOUNT_ID=68f42c519683f20dd51a0296

# Run test script
./scripts/test_endpoints.sh
```

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# Agent selection
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on groceries?"}'

# Send chat message
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "Show me my spending patterns"
  }'

# Cache status
curl http://localhost:8000/api/v1/cache/status
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Spec**: [openapi.json](./openapi.json)

## Architecture

### Agent Routing (Deterministic)

```
User Message
    ↓
Keyword Matching (if/elif/else)
    ↓
Priority Order:
1. Sentinel (security keywords)
2. Atlas (investment keywords)
3. Nebula (spending keywords)
4. Nova (fallback)
    ↓
Selected Agent
```

### Tool Execution (Parallel)

```
Orchestrator
    ↓
Determine Tools for Agent
    ↓
Execute Tools in Parallel
    ├─ Tool 1 (get_transactions)
    ├─ Tool 2 (get_balance)
    └─ Tool 3 (analyze_spending)
    ↓
Aggregate Results
    ↓
Pass Context to Agent
```

### Caching Strategy

```
Layer 1: Memory Cache (5 min TTL)
    ↓ miss
Layer 2: File Cache (1 hour TTL)
    ↓ miss
Layer 3: Nessie API
    ↓ error
Fallback: Stale File Cache
```

## Project Structure

```
backend/
├── openapi.json          # API specification
├── pyproject.toml        # Dependencies (uv)
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── main.py          # FastAPI app
│   ├── config.py        # Configuration
│   ├── orchestrator/    # Agent routing + tool execution
│   ├── agents/          # Agent definitions
│   ├── tools/           # Nessie API tools
│   ├── services/        # External clients
│   ├── models/          # Pydantic schemas
│   ├── api/             # Route handlers
│   └── cache/           # Multi-layer cache
├── scripts/
│   ├── test_endpoints.sh
│   └── validate_triggers.py
├── data/cache/          # File cache storage
└── docs/                # Documentation
```

## Configuration

Environment variables (`.env`):

```bash
# Required
NESSIE_API_KEY=your_api_key
NESSIE_CUSTOMER_ID=customer_id

# Optional
CACHE_TTL_SECONDS=3600
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

## Agents

### 1. Nebula (Spending Coach)
- **Keywords**: spend, budget, afford, expensive, cheap, purchase, groceries, etc.
- **Tools**: transactions, balance, spending analysis, bills
- **Use Cases**: Daily spending queries, budget questions, transaction history

### 2. Atlas (Investment Advisor)
- **Keywords**: invest, retirement, wealth, portfolio, stocks, bonds, etc.
- **Tools**: accounts overview, deposits, savings rate, projections
- **Use Cases**: Long-term planning, retirement, investment advice

### 3. Sentinel (Security Monitor)
- **Keywords**: fraud, suspicious, hack, unauthorized, theft, alert, etc.
- **Tools**: unusual transactions, security score, anomaly detection
- **Use Cases**: Fraud detection, security concerns, suspicious activity

### 4. Nova (General Assistant)
- **Keywords**: account, balance, info, help, transfer, deposit, etc.
- **Tools**: customer info, account details
- **Use Cases**: General queries, account information, fallback

## Development

### Adding New Tools

1. Create tool function in `src/tools/nessie.py`:

```python
async def my_new_tool(customer_id: str) -> Dict:
    # Implementation
    pass
```

2. Add to `TOOLS_REGISTRY`:

```python
TOOLS_REGISTRY = {
    ...
    "my_new_tool": my_new_tool,
}
```

3. Update agent tool mapping in `src/orchestrator/tool_executor.py`

### Adding New Trigger Keywords

1. Edit `src/orchestrator/triggers.py`
2. Add keyword to appropriate agent set
3. Run validation: `python scripts/validate_triggers.py`

## Documentation

- [agents.md](./docs/agents.md) - Complete agent specifications
- [orchestration.md](./docs/orchestration.md) - Orchestrator logic
- [full_architecture.md](./docs/full_architecture.md) - Architecture diagrams
- [architectural_decisions.md](./docs/architectural_decisions.md) - ADRs
- [API.md](./docs/API.md) - API endpoint reference

## License

Apache 2.0
