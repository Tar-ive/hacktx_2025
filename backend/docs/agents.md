# Agent Specifications

Complete specifications for all 4 agents with tools, triggers, and personality traits.

---

## AGENT 1: NEBULA (Spending Coach)

### Profile

**Role**: Daily spending coach and budget advisor  
**Personality**: Warm, empathetic, encouraging  
**Voice**: Rachel (ElevenLabs), 1.1x speed, stability 0.7

### Personality Matrix
- Warmth: 9/10
- Empathy: 10/10
- Playfulness: 7/10
- Directness: 6/10
- Authority: 5/10

### Activation Triggers

**Keywords** (mutually exclusive):
```
spend, spending, spent, spends
budget, budgeting, budgeted
afford, affordable, can i afford
expensive, pricey, costly, overpriced
cheap, inexpensive, bargain, deal
transaction, transactions, charge, charges
purchase, purchases, purchased, buying, buy, bought
cost, costs, costing
price, prices, pricing
merchant, store, shop, vendor
category, categories
groceries, grocery, food, restaurant, dining
shopping, shopped
coffee, gas, gasoline, fuel
utility, utilities, bill, bills
subscription, subscriptions
paying, payment, pay, paid
```

**Intent Classifications**:
- spending_analysis
- budget_question
- savings_goal
- transaction_query

**Context Triggers**:
- User mentions merchant name
- User mentions spending category
- User asks about purchase decision
- User mentions a specific store or restaurant

### Tools (6)

#### 1. `get_recent_transactions(customer_id, days=30)`
**Purpose**: Fetch recent spending history  
**Returns**: List of transactions with amounts, merchants, dates  
**Use Case**: "How much did I spend on groceries?"

#### 2. `get_spending_by_category(customer_id, days=30)`
**Purpose**: Categorize spending into groups  
**Returns**: Dict of categories → amounts  
**Categories**: groceries, dining, gas, utilities, shopping, other  
**Use Case**: "What's my biggest spending category?"

#### 3. `get_account_balance(customer_id)`
**Purpose**: Get current account balance  
**Returns**: Total balance, rewards, number of accounts  
**Use Case**: "Can I afford this purchase?"

#### 4. `analyze_spending_patterns(customer_id)`
**Purpose**: Identify trends and anomalies  
**Returns**: 30-day vs 60-day comparison, trends, averages  
**Use Case**: "Am I spending more this month?"

#### 5. `get_upcoming_bills(customer_id)`
**Purpose**: Show pending bills  
**Returns**: List of bills with due dates and amounts  
**Use Case**: "What bills do I have coming up?"

#### 6. `create_spending_report(customer_id, period)`
**Purpose**: Generate summary report  
**Returns**: Detailed spending breakdown  
**Use Case**: "Give me a spending summary"

### Example Queries

- "How much did I spend on coffee this week?"
- "Can I afford a $200 dinner tonight?"
- "What's my biggest spending category?"
- "Did I go over budget this month?"
- "Show me my grocery spending"
- "I need to save money, where am I overspending?"

---

## AGENT 2: ATLAS (Investment Advisor)

### Profile

**Role**: Investment and long-term financial planning advisor  
**Personality**: Authoritative, measured, patient  
**Voice**: Josh (ElevenLabs), 0.9x speed, stability 0.8

### Personality Matrix
- Authority: 9/10
- Patience: 7/10
- Warmth: 6/10
- Directness: 8/10
- Playfulness: 3/10

### Activation Triggers

**Keywords** (mutually exclusive):
```
invest, investing, investment, investor
retirement, retire, retiring, retired
credit-score, credit score, fico
long-term, longterm, long term
wealth, wealthy, rich, fortune
portfolio, holdings, assets
compound, compounding, interest
stocks, stock, equities, equity
bonds, bond, fixed-income
401k, ira, roth, pension
financial-planning, financial planning, financial plan
grow, growth, growing, appreciate, appreciation
returns, return, yield, dividend
diversify, diversification, allocate, allocation
```

**Intent Classifications**:
- investment_question
- retirement_planning
- wealth_building
- long_term_goal

**Context Triggers**:
- User mentions goals beyond 1 year
- User mentions retirement age
- User discusses investment products
- User asks about compound interest or returns

### Tools (5)

#### 1. `get_all_accounts(customer_id)`
**Purpose**: Portfolio overview  
**Returns**: All accounts with balances  
**Use Case**: "What's my net worth?"

#### 2. `get_deposits_history(customer_id, months=12)`
**Purpose**: Income pattern analysis  
**Returns**: Deposit history over time  
**Use Case**: "How much do I earn monthly?"

#### 3. `calculate_savings_rate(customer_id)`
**Purpose**: Calculate % of income saved  
**Returns**: Income, spending, savings rate  
**Use Case**: "What's my savings rate?"

#### 4. `project_retirement_savings(current_balance, contribution, years, rate)`
**Purpose**: Compound interest projections  
**Returns**: Future value calculations  
**Use Case**: "Can I retire at 60?"

#### 5. `analyze_income_vs_expenses(customer_id)`
**Purpose**: Cash flow analysis  
**Returns**: Income, expenses, net savings  
**Use Case**: "Do I have positive cash flow?"

### Example Queries

- "How much should I invest for retirement?"
- "What's my savings rate?"
- "Can I retire at 60 with my current savings?"
- "How does compound interest work?"
- "Should I invest in stocks or bonds?"
- "I'm saving for retirement, am I on track?"

---

## AGENT 3: SENTINEL (Security Monitor)

### Profile

**Role**: Security and fraud detection specialist  
**Personality**: Vigilant, reassuring, direct, calm  
**Voice**: Caleb (ElevenLabs), 0.95x speed, stability 0.85

### Personality Matrix
- Vigilance: 10/10
- Reassurance: 8/10
- Directness: 9/10
- Calmness: 8/10
- Authority: 9/10

### Activation Triggers

**Keywords** (mutually exclusive):
```
fraud, fraudulent, scam, scammer
security, secure, unsafe, insecure
suspicious, suspect, unusual, strange, weird
hack, hacked, hacker, breach, breached
unauthorized, unapproved, unknown
theft, stolen, thief, robbed
locked, lock, freeze, frozen
alert, warning, danger, risk
protect, protection, safe, safety
block, blocked, charge-back, chargeback
didn't, didnt, never, not me, wasn't
```

**Intent Classifications**:
- fraud_detection
- security_concern
- unusual_activity
- account_protection

**Context Triggers**:
- User reports unauthorized transaction
- User expresses security concerns
- User mentions they didn't make a purchase
- User sees unfamiliar activity

**Confidence Threshold**: 0.60 (lower threshold for security urgency)

### Tools (5)

#### 1. `detect_unusual_transactions(customer_id, threshold=2.5)`
**Purpose**: Statistical anomaly detection  
**Returns**: Transactions beyond 2.5 standard deviations  
**Use Case**: "Are there any unusual charges?"

#### 2. `get_recent_transactions(customer_id, days=7)`
**Purpose**: Latest activity review  
**Returns**: Last 7 days of transactions  
**Use Case**: "Show me my recent activity"

#### 3. `check_transaction_patterns(customer_id)`
**Purpose**: Behavioral analysis  
**Returns**: Pattern deviations  
**Use Case**: "Is my account activity normal?"

#### 4. `get_security_score(customer_id)`
**Purpose**: Account security rating  
**Returns**: Score (0-100) with assessment  
**Use Case**: "How secure is my account?"

#### 5. `flag_suspicious_merchants(customer_id)`
**Purpose**: Identify known bad actors  
**Returns**: List of flagged merchants  
**Use Case**: "Check for suspicious merchants"

### Example Queries

- "I see a charge I didn't make"
- "Is my account secure?"
- "This transaction looks suspicious"
- "Did someone hack my account?"
- "I didn't authorize this purchase"
- "There's a weird charge on my statement"

---

## AGENT 4: NOVA (General Assistant / Fallback)

### Profile

**Role**: General assistant and fallback handler  
**Personality**: Helpful, balanced, clear, friendly  
**Voice**: Default (ElevenLabs), 1.0x speed, stability 0.75

### Personality Matrix
- Helpfulness: 9/10
- Clarity: 8/10
- Warmth: 7/10
- Balance: 7/10
- Professionalism: 8/10

### Activation Triggers

**Keywords** (mutually exclusive):
```
account, accounts
balance, balances
info, information, details
help, assist, support
transfer, transfers, transferring
deposit, deposits, deposited
withdrawal, withdraw, withdrawing
question, questions, asking
tell, show, display, list
what, how, when, where, who, why
hello, hi, hey, greetings
```

**Intent Classifications**:
- general_inquiry
- account_management
- navigation
- unclear_intent
- greeting

**Context Triggers**:
- No specific keywords match other agents
- User intent is ambiguous
- User asks general questions
- Fallback for unclassified queries

**Confidence Threshold**: N/A (always accepts if others reject)

### Tools (4)

#### 1. `get_customer_info(customer_id)`
**Purpose**: Get profile data  
**Returns**: Name, address, contact information  
**Use Case**: "What's my account number?"

#### 2. `get_all_accounts(customer_id)`
**Purpose**: List all accounts  
**Returns**: All accounts with types and balances  
**Use Case**: "Show me all my accounts"

#### 3. `get_account_details(account_id)`
**Purpose**: Specific account information  
**Returns**: Detailed account data  
**Use Case**: "Tell me about my checking account"

#### 4. `search_transactions(account_id, query)`
**Purpose**: Transaction search  
**Returns**: Filtered transaction list  
**Use Case**: "Find transactions at Walmart"

### Example Queries

- "What's my account balance?"
- "How do I transfer money?"
- "Tell me about my accounts"
- "Hello, what can you do?"
- "I have a question"
- "Show me my profile"

---

## Agent Selection Logic

### Priority Order (Deterministic)

```python
if SENTINEL_KEYWORDS in message:
    return "sentinel"  # Security is highest priority

elif ATLAS_KEYWORDS in message:
    return "atlas"     # Investment/long-term

elif NEBULA_KEYWORDS in message:
    return "nebula"    # Daily spending

elif NOVA_KEYWORDS in message:
    return "nova"      # General queries

else:
    return "nova"      # Fallback
```

### Special Cases

**"save" / "saving" Resolution**:
- If message contains "retirement", "invest", "long-term" → **Atlas**
- Otherwise → **Nebula**

**Example**:
- "I'm saving for retirement" → **Atlas**
- "I want to save money on groceries" → **Nebula**

---

## Tool Execution Model

### Agents DO NOT Call Tools Directly

**Instead**:
1. Orchestrator determines agent
2. Orchestrator determines required tools
3. Orchestrator executes tools in parallel
4. Orchestrator passes pre-computed context to agent
5. Agent generates response from context only

### Example Flow

```
User: "How much did I spend on groceries?"
    ↓
Router: Select "nebula"
    ↓
Orchestrator: Determine tools for nebula:
  - get_recent_transactions
  - get_account_balance
  - analyze_spending_patterns
    ↓
Execute in parallel (450ms)
    ↓
Context: {
  transactions: [...],
  balance: 1500,
  patterns: {...}
}
    ↓
Nebula receives context
    ↓
Nebula: "You spent $87 on groceries this week..."
```

---

## Validation

Run validation script to ensure:
- No keyword overlaps
- Routing logic works correctly
- All agents have required tools

```bash
python scripts/validate_triggers.py
```
