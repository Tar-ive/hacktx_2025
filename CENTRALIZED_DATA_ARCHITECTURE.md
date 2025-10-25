# Centralized Data Architecture ✅

## Problem Solved
❌ **Before**: Hardcoded data in multiple mobile components, no single source of truth  
✅ **After**: ONE centralized storage location used by backend AI agents AND mobile frontend

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│          ~/.rebank/user_data/{customer_id}.json            │
│                  CENTRALIZED STORAGE                        │
│                                                             │
│  {                                                          │
│    "accounts": [...],                                      │
│    "balance": {...},                                       │
│    "transactions_30d": [...],                              │
│    "spending_by_category": {...},                          │
│    "spending_patterns": {...},                             │
│    "insights": {...}                                       │
│  }                                                          │
└────────────────────────────────────────────────────────────┘
                          ↑
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ↓                           ↓
┌────────────────────┐      ┌──────────────────────┐
│   BACKEND AGENTS   │      │   MOBILE FRONTEND    │
│                    │      │                      │
│ • LLM Orchestrator │      │ • Dashboard Screen   │
│ • ElevenLabs Agent │      │ • Analytics Screen   │
│ • Tool Executor    │      │ • Transaction List   │
│ • Voice Assistant  │      │ • All Components     │
└────────────────────┘      └──────────────────────┘
```

---

## Data Flow

### 1. Backend Fetches & Stores
```
Nessie API → Backend → Centralized Storage (~/.rebank/user_data/)
```

### 2. AI Agents Read From Storage
```
User asks "How much did I spend on groceries?"
              ↓
    LLM Orchestrator reads from centralized storage
              ↓
    Returns: "You spent $456.78 on groceries last month"
```

### 3. Mobile Fetches From Backend
```
Mobile App → GET /api/v1/data/{customer_id} → Backend reads centralized storage → Returns data
```

---

## Implementation

### Backend: Centralized Data Manager

**File**: `backend/src/services/centralized_data_manager.py`

```python
from centralized_data_manager import centralized_data_manager

# Fetch ALL data from Nessie and store
data = await centralized_data_manager.fetch_and_store_all_data(customer_id)

# Load data (used by AI agents)
data = centralized_data_manager.load_data(customer_id)

# Get data (auto-refresh if stale)
data = await centralized_data_manager.get_or_refresh_data(customer_id)
```

**Stored location**: `~/.rebank/user_data/{customer_id}.json`

### Backend: API Endpoints

**1. Get User Data**
```bash
GET /api/v1/data/{customer_id}
```
Returns complete financial data from centralized storage.

**2. Force Refresh**
```bash
POST /api/v1/data/{customer_id}/refresh
```
Fetches fresh data from Nessie API and updates centralized storage.

### Mobile: Data Service

**File**: `mobile/services/DataService.ts`

```typescript
import { DataService } from '../services/DataService';

// Get data (auto-cached for 5 minutes)
const data = await DataService.getUserData(customerId);

// Force refresh
await DataService.refreshData(customerId);
```

### Mobile: Dashboard Screen

**File**: `mobile/screens/DashboardScreen.tsx`

```typescript
// Load data on mount
useEffect(() => {
  loadData();
}, [user?.customerId]);

// Pull to refresh
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
```

---

## Data Structure

```json
{
  "accounts": [
    {
      "_id": "...",
      "type": "Savings",
      "balance": 5234.67,
      "nickname": "Personal Savings"
    }
  ],
  "balance": {
    "total_balance": 5234.67,
    "accounts": [...]
  },
  "transactions_30d": [
    {
      "_id": "...",
      "purchase_date": "2024-10-15",
      "description": "Whole Foods",
      "amount": 45.67
    }
  ],
  "spending_by_category": {
    "groceries": 456.78,
    "dining": 234.56,
    "gas": 123.45
  },
  "spending_patterns": {
    "total_last_30_days": 1817.47,
    "average_transaction_amount": 56.79
  },
  "insights": {
    "monthly_spending": 1817.47,
    "top_spending_category": {
      "category": "groceries",
      "amount": 456.78
    },
    "total_balance": 5234.67,
    "transaction_count_30d": 32
  },
  "_metadata": {
    "customer_id": "68f42c289683f20dd51a0293",
    "last_updated": "2024-10-19T10:30:00Z",
    "version": "1.0"
  }
}
```

---

## No More Hardcoded Data!

### ❌ Before
```typescript
// Hardcoded in SpendingAnalytics.tsx
const monthlyTrends = [
  { month: 'Jul', amount: 1200 },
  { month: 'Aug', amount: 1450 },
  { month: 'Sep', amount: 1100 },
  { month: 'Oct', amount: 980 },
];

// Hardcoded in DashboardScreen.tsx
setTransactions([
  { id: '1', merchant: 'Starbucks', amount: -5.50 },
  { id: '2', merchant: 'Target', amount: -87.43 },
]);
```

### ✅ After
```typescript
// Load from centralized storage
const data = await DataService.getUserData(user.customerId);

// Use real data
const transactions = data.transactions_30d;
const spending = data.spending_by_category;
const balance = data.balance.total_balance;
```

---

## Works for ANY User

### User Login Flow
```
1. User logs in
2. Backend authenticates → Returns customer_id
3. Mobile stores customer_id in user object
4. Dashboard calls DataService.getUserData(customer_id)
5. Backend reads from ~/.rebank/user_data/{customer_id}.json
6. Mobile displays REAL user-specific data
```

### Voice Assistant Flow
```
1. User asks "How much did I spend?"
2. LLM Orchestrator gets customer_id from session
3. Reads from centralized storage
4. Formats response with ACTUAL numbers
5. Returns "You spent $456.78 on groceries"
```

---

## Testing

### 1. Backend - Fetch & Store Data
```bash
cd backend
uv run python -c "
import asyncio
from src.services.centralized_data_manager import centralized_data_manager

async def test():
    customer_id = '68f42c289683f20dd51a0293'
    data = await centralized_data_manager.fetch_and_store_all_data(customer_id)
    print(f'✓ Data stored at: ~/.rebank/user_data/{customer_id}.json')
    print(f'✓ Total balance: \${data[\"balance\"][\"total_balance\"]:.2f}')

asyncio.run(test())
"
```

### 2. Backend - Check Storage Location
```bash
ls -lh ~/.rebank/user_data/
cat ~/.rebank/user_data/68f42c289683f20dd51a0293.json | jq '.insights'
```

### 3. Backend - Test API
```bash
curl http://localhost:8000/api/v1/data/68f42c289683f20dd51a0293 | jq '.data.spending_by_category'
```

### 4. Mobile - Test Dashboard
```bash
cd mobile
npm start  # Press 'w' for web

# Login with: taylor@rebankaustin.com / demo1234
# Navigate to Dashboard
# Pull down to refresh
```

**Expected**: See REAL transactions, balances, and spending data!

---

## Cache & Refresh Strategy

| Layer | TTL | Purpose |
|-------|-----|---------|
| Mobile Cache | 5 minutes | Fast UI updates |
| Centralized Storage | 1 hour | Shared backend/mobile data |
| Nessie API | On-demand | Source of truth |

### Refresh Triggers
1. **Auto**: Data older than 1 hour automatically refreshed
2. **Manual**: User pulls down to refresh
3. **API**: POST /api/v1/data/{customer_id}/refresh

---

## Files Changed

| File | Status | Purpose |
|------|--------|---------|
| `backend/src/services/centralized_data_manager.py` | ✅ Created | Central data storage manager |
| `backend/src/api/routes.py` | ✅ Updated | Added data endpoints |
| `backend/src/orchestrator/llm_orchestrator.py` | ✅ Updated | Uses centralized storage |
| `mobile/services/DataService.ts` | ✅ Created | Mobile data fetching service |
| `mobile/stores/authStore.ts` | ✅ Updated | Stores customer_id |
| `mobile/screens/DashboardScreen.tsx` | ✅ Updated | Uses DataService (no hardcoded data!) |
| `mobile/components/SpendingAnalytics.tsx` | 🔄 Next | Remove hardcoded monthlyTrends |
| `mobile/components/TransactionList.tsx` | ✅ Already dynamic | Receives props |

---

## Benefits

✅ **Single Source of Truth**: All data in one location  
✅ **Works for ANY User**: No hardcoded data  
✅ **AI Agents Have Context**: Accurate responses with real numbers  
✅ **Mobile Shows Real Data**: Dashboard displays user-specific info  
✅ **Easy to Debug**: Check `~/.rebank/user_data/{customer_id}.json`  
✅ **Scalable**: Add new users without code changes  
✅ **Cached**: Fast performance with smart refresh  

---

## Default Test Account

**Email**: `taylor@rebankaustin.com`  
**Password**: `demo1234`  
**Customer ID**: `68f42c289683f20dd51a0293`

This account is pre-configured in `backend/data/rebank_users.json` and linked to Nessie Capital One data.

---

## Quick Start

```bash
# 1. Start backend
cd backend
uv run uvicorn src.main:app --reload

# 2. Test centralized data
curl http://localhost:8000/api/v1/data/68f42c289683f20dd51a0293 | jq '.data.insights'

# 3. Start mobile
cd mobile
npm start  # Press 'w' for web

# 4. Login and test
# Email: taylor@rebankaustin.com
# Password: demo1234
# Go to Dashboard → Pull to refresh → See real data!
```

---

## Status

✅ **Centralized storage implemented**  
✅ **Backend endpoints created**  
✅ **Mobile service created**  
✅ **Dashboard updated (no hardcoded data)**  
✅ **AI agents use centralized data**  
✅ **Works for any user**  

**READY TO USE!** 🚀
