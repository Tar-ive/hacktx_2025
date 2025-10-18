# financial forecasting

### **Financial Forecasting**

**Task 19.1: Forecasting Engine**

- Build baseline forecaster:
    - Analyze last 90 days of transactions
    - Calculate daily spending average
    - Identify spending trend (linear regression)
    - Project 30 days forward
    - Formula: future_balance = current_balance - (daily_avg × days) - trend_adjustment
- Implement income prediction:
    - Detect paycheck pattern (every 2 weeks, monthly)
    - Predict next paycheck date and amount
    - Include in forecast
- Add variable expenses:
    - Bills due in forecast period
    - Irregular expenses (annual subscriptions, seasonal costs)
    - Adjust forecast accordingly

**Task 19.2: "What If" Simulator**

- Create scenario types:
    - **Spending reduction:** Reduce category by X%
    - **One-time expense:** Add $X on day Y
    - **Income change:** Increase/decrease income by X%
    - **Savings goal:** Save $X monthly
    - **Debt payment:** Add $X monthly to debt
- Implement simulation engine:
    - Take baseline forecast
    - Apply scenario adjustments
    - Recalculate daily balances
    - Show comparison (baseline vs adjusted)
- Build interactive sliders:
    - User adjusts parameters in real-time
    - Forecast updates immediately (optimized for performance)
    - Show: New projected balance, difference from baseline, date goals achieved

**Task 19.3: Visualization**

- Create forecast chart:
    - Line chart showing balance over 30 days
    - Two lines: Baseline (gray), Adjusted (green if improved, red if worse)
    - Mark key events: Paycheck, bill due, large purchase
    - Shaded area shows range of uncertainty
- Add orbit visualization:
    - Central hub size represents projected balance
    - Orbit trajectory shows path of balance
    - "Good path" (upward spiral) vs "bad path" (downward spiral)
    - User sees visual impact of decisions
- Implement milestone markers:
    - Stars on chart for goal achievements
    - Example: "Emergency fund complete by day 24"
    - Celebrations when milestones hit

**Task 19.4: Gemini-Powered Insights**

- Generate scenario recommendations:
    - Gemini analyzes user's situation
    - Suggests scenarios to test: "Try reducing dining by 20%"
    - Explains potential impact
    - Prioritizes by feasibility and impact
- Create narrative summaries:
    - Gemini generates plain-language summary
    - Example: "If you cut coffee spending by 30% and skip one dinner out, you'll have an extra $180 by month-end. That's enough to fully fund your vacation goal."
    - Delivered by Atlas in his authoritative voice
- Add confidence scoring:
    - Forecast accuracy depends on data quality
    - More history = higher confidence
    - Irregular income = lower confidence
    - Display confidence visually (wider shade area = less confident)

**Deliverable:** Interactive financial forecasting tool