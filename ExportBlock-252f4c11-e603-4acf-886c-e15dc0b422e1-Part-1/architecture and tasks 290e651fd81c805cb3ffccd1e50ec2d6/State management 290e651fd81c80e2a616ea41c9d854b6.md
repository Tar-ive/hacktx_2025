# State management

State Machine for Conversation Flows**

**States:**

**IDLE:**

- No active conversation
- Agents monitoring for events (fraud detection, bill reminders)
- Ready to respond to user initiation

**LISTENING:**

- User is speaking
- Audio being transcribed
- Intent classification in progress
- No agent response yet

**THINKING:**

- Message received and transcribed
- Gemini analyzing intent and context
- Determining which agent(s) to activate
- Preparing response structure
- Visual: Avatar shows "thinking" animation

**AGENT_RESPONDING:**

- Selected agent speaking
- Audio streaming to user
- Visual: Agent orb pulsing with voice waveform
- Other agents can queue follow-ups

**WAITING_FOR_USER:**

- Agent asked a question
- Waiting for user response
- Timeout: 60 seconds, then gentle prompt
- Visual: Listening indicator active

**TOOL_EXECUTION:**

- Agent called a tool (e.g., fetch transactions, create budget)
- Nessie API or Gemini processing
- Agent can narrate: "Let me check that..."
- Visual: Data flow animation from Nessie orb to agent orb

**ERROR:**

- Something failed (API error, network issue)
- Graceful error message from agent
- Offer alternatives: "I can't access that right now, but I can tell you..."
- Recovery: Return to IDLE or retry

**State Transitions:**

- IDLE → LISTENING: User taps microphone or says wake word
- LISTENING → THINKING: Transcription complete
- THINKING → AGENT_RESPONDING: Agent selected, response ready
- AGENT_RESPONDING → WAITING_FOR_USER: Agent asks question
- AGENT_RESPONDING → LISTENING: Agent gets interrupted, then starts listening again
- WAITING_FOR_USER → LISTENING: User responds
- ANY → ERROR: Failure detected
- ERROR → IDLE: Error resolved or dismissed