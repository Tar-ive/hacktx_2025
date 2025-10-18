# architecture and tasks

High level system flow

```markdown
USER SPEAKS
↓
MOBILE APP (React Native)
↓ Audio Stream
AGENT ORCHESTRATOR (WebSocket Server)
↓ Transcription + Intent Analysis
GEMINI INTELLIGENCE HUB (Context + Reasoning)
↓ Data Requirements Identified
CAPITAL ONE NESSIE API (Financial Data)
↓ Results + Context
GEMINI ANALYSIS (Insights Generation)
↓ Response Structure + Tone
ELEVENLABS AGENT (Voice Synthesis + Personality)
↓ Audio Stream
MOBILE APP (3D Visualization + Audio Playback)
↓
USER HEARS RESPONSE + SEES VISUALIZATION
```

**Component Breakdown**

**Layer 1: Mobile Client**

- React Native app with Expo
- Three.js 3D constellation UI
- WebSocket client for real-time communication
- Audio recording and playback
- State management
- Local caching

**Layer 2: WebSocket Gateway**

- Maintains persistent connections with clients
- Routes messages to appropriate services
- Manages session state
- Handles reconnection logic
- Broadcasts updates to multiple clients (future: collaborative features)

**Layer 3: Agent Orchestrator (Core Brain)**

- Multi-agent coordination engine
- Context management across agents
- Turn-taking protocol
- Tool calling coordinator
- State machine for conversation flows

**Layer 4: ElevenLabs Agent System**

- 4 specialized conversational AI agents
- Voice synthesis with emotional control
- Real-time audio streaming
- Personality-driven responses
- Custom voice cloning

**Layer 5: Gemini Intelligence Hub**

- Intent classification
- Context analysis
- Reasoning and planning
- Multimodal processing (text, vision, code)
- Function calling orchestration
- Response generation

**Layer 6: Financial Data Layer**

- Nessie API wrapper service
- Request/response caching
- Data enrichment
- Transaction categorization
- Anomaly detection algorithms

**Layer 7: Persistence Layer**

- Firebase Firestore for user data
- Conversation history storage
- Agent state persistence
- Analytics events
- User preferences

## DEEP DIVE: AGENT ORCHESTRATION SYSTEM

**Architecture Philosophy**

**Core Principle:** Agents are NOT just TTS voices. They are autonomous entities with:

- Unique knowledge domains
- Persistent memory
- Decision-making capabilities
- Ability to collaborate with other agents
- Emotional intelligence
- Learning from interactions

**Agent Profiles (Detailed)**

**Agent 1: Nebula (Spending Coach)**

**Domain Expertise:**

- Daily spending patterns
- Budget management
- Behavioral finance
- Emotional spending triggers
- Savings strategies

**Personality Matrix:**

- Warmth: 9/10
- Authority: 5/10
- Playfulness: 7/10
- Directness: 6/10
- Empathy: 10/10

**Voice Configuration:**

- ElevenLabs Voice: Rachel
- Pitch: Slightly higher (friendly)
- Speaking rate: Moderate (120-140 wpm)
- Emotional range: Wide (excited to concerned)

**Conversation Style:**

- Uses "I noticed..." to frame observations
- Asks permission before advice: "Want to talk about that?"
- Celebrates wins enthusiastically
- Frames problems as opportunities
- Uses analogies and stories

**Tool Access:**

- Search transactions by category
- Analyze spending patterns
- Create/modify budgets
- Set spending alerts
- Track behavioral goals

**Activation Triggers:**

- Keywords: spend, budget, save, afford, expensive, cheap
- Intent: spending_analysis, budget_question, savings_goal
- Context: User mentions merchant, category, or purchase decision

**Agent 2: Atlas (Investment Advisor)**

**Domain Expertise:**

- Long-term financial planning
- Investment strategies
- Retirement planning
- Asset allocation
- Risk management
- Compound interest calculations

**Personality Matrix:**

- Warmth: 6/10
- Authority: 9/10
- Playfulness: 3/10
- Directness: 8/10
- Empathy: 7/10

**Voice Configuration:**

- ElevenLabs Voice: Josh
- Pitch: Lower (authoritative)
- Speaking rate: Slower (deliberate, 100-120 wpm)
- Emotional range: Narrow (controlled, measured)

**Conversation Style:**

- Starts with data: "Based on your current savings rate..."
- Uses numbers and projections
- Explains concepts with patience
- Frames decisions in terms of trade-offs
- References long-term consequences

**Tool Access:**

- Calculate investment projections
- Model retirement scenarios
- Analyze income vs. expenses
- Generate wealth-building strategies
- Create financial forecasts

**Activation Triggers:**

- Keywords: invest, retirement, save, long-term, future, wealth, portfolio
- Intent: investment_question, retirement_planning, wealth_building
- Context: User mentions goals beyond 1 year

**Agent 3: Nova (General Agent)**

- When there is no confident recommendation for a model thru Gemini orchestration, fallback to Nova.

**Agent Selection Logic**

**Single Agent Mode (80% of interactions):**

- User message → Intent classification (via Gemini)
- Intent mapped to agent domain
- Selected agent handles entire conversation
- Other agents remain dormant but aware

**Decision Process:**

- Parse user message for keywords and semantic meaning
- Classify intent into categories: spending, investing, bills, security, general
- Match intent to agent's expertise domain
- Consider conversation history (stick with same agent for context)
- If ambiguous, default to Nova (generalist)

***Multi-Agent Mode (20% of interactions):***

- *Complex questions requiring multiple perspectives*
- *User explicitly requests multiple opinions*
- *Contradictory recommendations need debate*
- *Educational scenarios benefit from diverse viewpoints*

**Activation Conditions:**

- Question spans multiple domains: "Can I afford vacation while still investing?"
- User asks: "What do all of you think?"
- High-stakes decision: Large purchase, major financial change
- Educational opportunity: Teaching trade-offs and perspectives

**2. Context Management System**

**Shared Context Pool (All agents access):**

- User profile:
    - Name, age, location
    - Income level and sources
    - Risk tolerance (conservative, moderate, aggressive)
    - Financial goals (short-term and long-term)
    - Life stage (student, young professional, family, retirement)
- Current financial state:
    - All account balances (checking, savings, credit cards)
    - Total net worth
    - Debt obligations
    - Credit utilization
    - Emergency fund status (months of expenses covered)
- Recent activity (last 30 days):
    - All transactions with categorization
    - Spending by category
    - Income received
    - Bills paid
    - Unusual activity flags
- Active projects:
    - "Saving for Japan vacation - $2000 goal by June"
    - "Paying down credit card - $5000 remaining"
    - "Building emergency fund - $3000 of $6000 target"

**Agent-Specific Context (Siloed per agent):**

- Nova's context:
    - User's spending personality (impulsive, careful, emotional)
    - Trigger categories (stress spending, celebration spending)
    - Budget adherence history
    - Past conversations about spending habits
    - Behavior change commitments
- Atlas's context:
    - Investment knowledge level
    - Risk tolerance updates
    - Retirement goals and timeline
    - Past investment discussions
    - Long-term plan milestones

**Context Update Mechanisms:**

- Real-time updates: New transaction → All agents notified
- Periodic refresh: Every 5 minutes, pull latest account data
- Event-driven: Goal completion → Celebration trigger for all agents
- User-initiated: Profile changes propagate immediately

**Turn-Taking Protocol (Multi-Agent Conversations)**

**Round-Robin with Priority:**

**Initial Turn Assignment:**

- Agent most relevant to question speaks first
- Gemini determines relevance score for each agent
- Highest score gets first turn
- Others queue in descending relevance order

**Turn Duration:**

- Each agent gets 30-45 seconds (200-300 words)
- Orchestrator enforces time limit
- Agent can request extension: "I need more time to explain..."
- User can interrupt: "That's enough, next?"

**Turn Transition Signals:**

- Agent concludes with: "What do you think, [Agent Name]?"
- Or: "I'll let [Agent Name] share their perspective"
- Orchestrator assigns next turn
- 2-second pause between agents (audio processing time)

**Priority Interruptions:**

- Sentinel can interrupt for urgent security matters
- User can interrupt anytime
- If agents contradict directly, orchestrator flags for user decision

[State management](architecture%20and%20tasks%20290e651fd81c805cb3ffccd1e50ec2d6/State%20management%20290e651fd81c80e2a616ea41c9d854b6.md)

[**Tool Call Workflow**](architecture%20and%20tasks%20290e651fd81c805cb3ffccd1e50ec2d6/Tool%20Call%20Workflow%20290e651fd81c80ce981cfcdd22b1bb7e.md)

**Parallel Tool Calls:**

- Some tools can run concurrently
- Example: Get checking balance + Get savings balance
- Orchestrator executes in parallel
- Waits for all results
- Combines results before returning

***Tool Call Optimization:***

- *Cache recent results (5-minute TTL)*
- *Batch similar calls (get all accounts at once, not one by one)*
- *Prefetch likely next data (user asks about spending, prefetch recent transactions)*

[Gemini](architecture%20and%20tasks%20290e651fd81c805cb3ffccd1e50ec2d6/Gemini%20290e651fd81c80aab891d8a5fad0188e.md)

[Implementation](architecture%20and%20tasks%20290e651fd81c805cb3ffccd1e50ec2d6/Implementation%20290e651fd81c80d18800d0c67d1ca9cc.md)