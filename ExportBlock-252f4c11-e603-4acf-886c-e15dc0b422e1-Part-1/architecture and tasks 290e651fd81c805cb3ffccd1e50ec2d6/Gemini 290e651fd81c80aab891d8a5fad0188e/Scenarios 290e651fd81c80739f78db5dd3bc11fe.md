# Scenarios

**Complex Reasoning and Planning**

**Purpose:** Solve multi-step financial problems requiring logic and calculation

**Scenario 1: Debt Payoff Strategy**

**User asks: "What's the fastest way to pay off my credit card debt?"**

**Gemini Reasoning Process:**

**Phase 1: Data Gathering**

- Function call: Get all user accounts
- Function call: Get all debts (credit cards with balances)
- Extract key data:
    - Card 1: $5,000 @ 22% APR, minimum $150/month
    - Card 2: $2,000 @ 18% APR, minimum $60/month
    - Available monthly budget: $500 for debt payment

**Phase 2: Strategy Generation**

**Strategy: Debt Avalanche (Highest interest first)**

- Pay minimums on all cards
- Put all extra ($290) toward Card 1 (22%)
- Timeline: Card 1 paid in 20 months, Card 2 in 24 months
- Total interest paid: $1,840

**Phase 3: Recommendation with Reasoning**

- Generate recommendation with pros/cons
- Prepare visualization data (payment schedules, interest curves) //ui component

**Phase 4: Response Structure**

- Create narrative explaining the strategy
- Use analogies for clarity
- Highlight trade-offs
- Provide clear recommendation
- *Offer interactive calculator*

**Gemini sends to Atlas:**

- Summary for voice response
- Detailed data for UI display
- Follow-up questions to ask user
- Tone guidance: "Encouraging but realistic"

---

**Scenario 2: "What If" Financial Simulation**

**User asks: "What if I reduce my dining budget by 30%?"**

**Gemini Reasoning Process:**

**Phase 1: Baseline Calculation**

- Function call: Get dining spending last 3 months
- Average: $600/month
- 30% reduction: $180/month savings
- Annual savings: $2,160

- *Use code execution to run compound interest calculation*
- *can give insights on future investments if user asks*

**Phase 3: Trade-off Analysis**

- What user gives up:
    - 30% less dining out (from 15 meals/month to 10 meals/month)
    - 5 restaurant meals sacrificed monthly
- What user gains:
    - $244,000 in 30 years
    - $99,000 in today's dollars (purchasing power)
    - Financial security and earlier retirement possibility

**Phase 4: Realistic Assessment**

- Is 30% reduction sustainable?
    - Current: $600/month = $20/meal average
    - User's dining is social activity (review transaction notes)
    - Suggest: Reduce expensive dinners, keep casual lunches
    - More realistic: 20% reduction ($120/month)
    - Still achieves: $160,000 in 30 years

**Phase 5: Interactive Simulation**

- Generate slider parameters:
    - Reduction: 0% to 50%
    - Time horizon: 5 to 40 years
    - Expected return: 5% to 10%
- Prepare chart data points for visualization
- Create formula for real-time calculation

**Gemini sends to Atlas + Nova:**

- Atlas handles investment explanation
- Nova validates budget reduction is realistic
- Both contribute to building user's confidence in the plan

[function calling](Scenarios%20290e651fd81c80739f78db5dd3bc11fe/function%20calling%20290e651fd81c80879971d9299c6c3c19.md)