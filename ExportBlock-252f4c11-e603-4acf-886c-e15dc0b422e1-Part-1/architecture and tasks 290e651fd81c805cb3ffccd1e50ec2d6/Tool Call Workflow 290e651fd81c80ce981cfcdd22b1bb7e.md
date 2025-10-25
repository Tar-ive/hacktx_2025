# Tool Call Workflow

**Phase 1: Agent Requests Tool**

- Agent determines need for data
- Constructs tool call request
- ElevenLabs agent emits tool call event
- Orchestrator receives tool call request

**Phase 2: Validation**

- Orchestrator validates:
    - Tool exists in registry
    - Agent authorized to call this tool
    - Required parameters present
    - Parameters are valid types
- If invalid: Return error to agent, agent handles gracefully

**Phase 3: Execution**

- Orchestrator routes to appropriate service:
    - Nessie tools → Nessie service
    - Gemini tools → Gemini service
    - Internal tools → Internal handlers
- Execute with timeout (10 seconds max)
- Handle errors (retry once, then fail gracefully)

**Phase 4: Result Processing**

- Raw result from service
- Orchestrator enriches data:
    - Add computed fields
    - Format for readability
    - Attach metadata
- Return to agent

**Phase 5: Agent Response**

- Agent receives tool result
- Integrates into conversation naturally
- ElevenLabs generates speech
- User hears result