# agentic integration

### **ElevenLabs Integration**

**Task 8.1: ElevenLabs SDK Setup**

- Install @11labs/client SDK in backend
- Configure API credentials
- Test connection with simple TTS request
- Understand rate limits (track usage)
- Set up error handling for API failures

**Task 8.2: Agent Configuration**

- Create agent configurations for each persona:
**Nova Configuration:Atlas Configuration:Mercury Configuration:Sentinel Configuration:**
    - Voice ID: Rachel (from ElevenLabs voice library)
    - Stability: 0.5 (moderate, natural variation)
    - Similarity boost: 0.75 (maintain voice consistency)
    - Style: 0.3 (conversational, not exaggerated)
    - System prompt: "You are Nova, a warm and encouraging spending coach. You help users understand their spending patterns with empathy and positive reinforcement. You notice details, celebrate wins, and frame challenges as opportunities. Speak conversationally, use 'I noticed...' to introduce observations, and always ask permission before giving advice."
    - Temperature: 0.7 (creative but focused)
    - Max tokens: 200 (keep responses concise for voice)
    - Voice ID: Josh
    - Stability: 0.7 (more consistent, authoritative)
    - Similarity boost: 0.8
    - Style: 0.1 (serious, professional)
    - System prompt: "You are Atlas, an investment advisor and financial planner. You provide data-driven insights with patience and clarity. You explain complex concepts simply, use numbers to support recommendations, and frame decisions in terms of long-term consequences. Speak deliberately, start with data, and help users understand trade-offs."
    - Temperature: 0.5 (more focused, less creative)
    - Max tokens: 250 (can be more detailed)
    - Voice ID: Custom (create or select androgynous voice)
    - Stability: 0.4 (dynamic, energetic)
    - Similarity boost: 0.7
    - Style: 0.5 (more expressive)
    - System prompt: "You are Mercury, a charismatic bill negotiator. You find savings opportunities and help users reduce costs. You're confident, action-oriented, and sometimes playfully competitive. You celebrate victories enthusiastically and frame bill reduction as a game you're very good at winning."
    - Temperature: 0.8 (most creative)
    - Max tokens: 180 (punchy responses)
    - Voice ID: Antoni
    - Stability: 0.8 (very consistent, calm)
    - Similarity boost: 0.85
    - Style: 0.0 (serious, no-nonsense)
    - System prompt: "You are Sentinel, a fraud detective and security guardian. You protect users from financial threats with vigilance and calm authority. You explain security concerns clearly without causing panic, always reassure users they're protected, and provide clear action steps. Speak directly and authoritatively."
    - Temperature: 0.4 (least creative, most focused)
    - Max tokens: 150 (brief, clear)

**Task 8.3: Conversational AI Setup**

- Initialize ElevenLabs Agent API (not just TTS):
    - Use conversational AI endpoints
    - Configure streaming for real-time responses
    - Set up WebSocket connection for bidirectional audio
- Implement conversation session management:
    - Create session on user connection
    - Maintain conversation history
    - Track speaker turns
    - Handle session timeouts (5 minutes of inactivity)
- Configure tool definitions for agents:
    - Define all available tools (search_transactions, get_balance, etc.)
    - Specify parameters and types
    - Set authorization per agent (which tools each can call)

**Task 8.4: Audio Streaming**

- Set up audio pipeline:
    - User speech → Mobile app → WebSocket → Backend
    - Backend → ElevenLabs (transcription)
    - ElevenLabs → Backend → WebSocket → Mobile app
- Implement streaming audio playback:
    - Receive audio chunks in real-time
    - Play immediately (don't wait for complete response)
    - Handle buffering and network issues
- Add audio controls:
    - Stop speaking (interrupt agent)
    - Replay last response
    - Adjust playback speed (1x, 1.25x, 1.5x)

**Orchestrator Architecture**

- Create AgentOrchestrator class:
    - Singleton pattern (one instance per server)
    - Manages all agent instances
    - Routes user messages to correct agent
    - Coordinates multi-agent conversations
    - Maintains conversation state
- Define agent registry:
    - Map agent ID to agent instance
    - Store agent metadata (name, domain, voice, status)
    - Track active conversations per agent
- Implement session management:
    - Create session on user connection
    - Store in memory (later: Redis for horizontal scaling)
    - Session includes:
        - User ID
        - Active agent(s)
        - Conversation history
        - Context snapshot
        - State (listening, thinking, responding, waiting)

**Task 9.2: Intent Classification**

- Implement classification service:
    - Receives user message
    - Calls Gemini Flash for intent analysis
    - Returns primary intent, confidence, and recommended agent
- Create intent taxonomy:
    - Define all possible intents
    - Map intents to agents
    - Handle ambiguous intents
- Build intent classifier:
    - Prompt engineering for consistent classification
    - Include conversation context in prompt
    - Parse Gemini response
    - Cache recent classifications (avoid redundant API calls)

**Task 9.3: Agent Selection Logic**

- Implement single-agent selection:
    - Based on intent classification
    - Consider conversation history (keep same agent if context continues)
    - Default to Nova if uncertain
    - Allow user to explicitly select agent
- Implement multi-agent trigger:
    - Detect complex questions (multiple domains)
    - User explicitly requests multiple opinions
    - High-stakes decisions (>$500 purchase, major financial change)
    - Educational scenarios
- Create agent activation:
    - Notify selected agent(s) of new turn
    - Provide full context
    - Start response generation
    - Track agent status (idle, thinking, speaking)

**Context Management**

- Build context pool:
    - Shared data structure accessible to all agents
    - Includes: user profile, accounts, transactions, goals, patterns
    - Updates in real-time as new data arrives
- Implement context injection:
    - When agent is activated, inject relevant context
    - Filter context by relevance (don't overload agent)
    - Format context for agent consumption (structured JSON)
- Create context update system:
    - Listen for data changes (new transaction, goal completed)
    - Update context pool immediately
    - Notify active agents of relevant changes
    - Trigger proactive agent messages (alerts, celebrations)

[gemini sdk](agentic%20integration%20290e651fd81c802db78bde2fee51a9af/gemini%20sdk%20290e651fd81c80f5b805f28b303e1c00.md)