# Full Architecture

Complete system architecture with mermaid diagrams.

---

## System Overview

```mermaid
graph TB
    subgraph Mobile
        M[React Native App]
        WS[WebSocket Client]
    end
    
    subgraph Backend
        FA[FastAPI Server]
        OR[Orchestrator]
        RT[Router if/elif/else]
        TE[Tool Executor]
    end
    
    subgraph Caching
        L1[Layer 1: Memory 5min]
        L2[Layer 2: File 1hr]
        L3[Layer 3: Nessie API]
    end
    
    subgraph Agents
        NEB[Nebula<br/>Spending Coach]
        ATL[Atlas<br/>Investment Advisor]
        SEN[Sentinel<br/>Security Monitor]
        NOV[Nova<br/>General Assistant]
    end
    
    M -->|Audio/Text| WS
    WS -->|WebSocket| FA
    FA --> OR
    OR --> RT
    RT -->|Select Agent| TE
    TE -->|Parallel Tools| L1
    L1 -->|miss| L2
    L2 -->|miss| L3
    L3 -->|Fresh Data| L2
    L2 -->|Cache Data| L1
    TE -->|Context| OR
    OR -->|Context Only| NEB
    OR -->|Context Only| ATL
    OR -->|Context Only| SEN
    OR -->|Context Only| NOV
    NEB -->|Response| FA
    ATL -->|Response| FA
    SEN -->|Response| FA
    NOV -->|Response| FA
    FA -->|Audio Stream| WS
    WS --> M
    
    style NEB fill:#6B46C1
    style ATL fill:#2563EB
    style SEN fill:#059669
    style NOV fill:#DC2626
    style RT fill:#FFA500
    style TE fill:#FFD700
```

---

## Parallel Tool Execution Flow

```mermaid
sequenceDiagram
    participant M as Mobile
    participant F as FastAPI
    participant R as Router
    participant TE as ToolExecutor
    participant T1 as get_transactions
    participant T2 as get_balance
    participant T3 as analyze_spending
    participant C as Cache Layer
    participant N as Nessie API
    participant A as ElevenLabs Agent
    
    M->>F: User message (audio)
    F->>R: Route to agent
    Note over R: Deterministic if/elif/else<br/>NO ML, pure keyword matching
    R-->>F: Selected: "nebula"
    
    F->>TE: Execute parallel tools
    
    par Parallel Execution
        TE->>T1: Call tool
        TE->>T2: Call tool
        TE->>T3: Call tool
    end
    
    par Tools query cache
        T1->>C: Get data
        T2->>C: Get data
        T3->>C: Get data
    end
    
    alt Cache Hit
        C-->>T1: Cached data
        C-->>T2: Cached data
        C-->>T3: Cached data
    else Cache Miss
        C->>N: Fetch fresh
        N-->>C: Fresh data
        C-->>T1: Fresh data
        C-->>T2: Fresh data
        C-->>T3: Fresh data
    end
    
    T1-->>TE: Result 1
    T2-->>TE: Result 2
    T3-->>TE: Result 3
    
    TE-->>F: Aggregated context
    Note over TE: {<br/>transactions: [...],<br/>balance: 1500,<br/>patterns: {...},<br/>execution_time_ms: 450<br/>}
    
    F->>A: Call agent with context
    Note over A: Agent receives pre-computed data<br/>NO tool access<br/>Generates response from context
    A-->>F: Response text + audio
    F-->>M: Stream audio response
```

---

## Deterministic Agent Routing

```mermaid
flowchart TD
    Start([User Message]) --> Clean[Clean & Tokenize]
    Clean --> S1{Contains<br/>SENTINEL<br/>Keywords?}
    
    S1 -->|Yes| Sentinel[Sentinel Agent]
    S1 -->|No| S2{Contains<br/>ATLAS<br/>Keywords?}
    
    S2 -->|Yes| Atlas[Atlas Agent]
    S2 -->|No| S3{Contains<br/>NEBULA<br/>Keywords?}
    
    S3 -->|Yes| Nebula[Nebula Agent]
    S3 -->|No| S4{Contains<br/>NOVA<br/>Keywords?}
    
    S4 -->|Yes| Nova[Nova Agent]
    S4 -->|No| Fallback[Nova Agent<br/>Fallback]
    
    Sentinel --> Exec[Execute Tools]
    Atlas --> Exec
    Nebula --> Exec
    Nova --> Exec
    Fallback --> Exec
    
    Exec --> Response[Generate Response]
    
    style Sentinel fill:#059669
    style Atlas fill:#2563EB
    style Nebula fill:#6B46C1
    style Nova fill:#DC2626
    style Fallback fill:#DC2626
    style S1 fill:#FFA500
    style S2 fill:#FFA500
    style S3 fill:#FFA500
    style S4 fill:#FFA500
```

---

## Multi-Layer Cache Architecture

```mermaid
graph TD
    subgraph Request Flow
        R[Request for Data]
    end
    
    subgraph Layer 1
        L1[Memory Cache]
        L1C{Fresh?<br/>TTL: 5 min}
    end
    
    subgraph Layer 2
        L2[File Cache<br/>data/cache/*.json]
        L2C{Fresh?<br/>TTL: 1 hour}
    end
    
    subgraph Layer 3
        L3[Nessie API]
        L3C{Success?}
    end
    
    subgraph Fallback
        FB[Stale File Cache]
    end
    
    R --> L1C
    L1C -->|Yes| HIT1[Return<br/>~1ms]
    L1C -->|No| L2C
    
    L2C -->|Yes| HIT2[Return + Promote to L1<br/>~10ms]
    L2C -->|No| L3
    
    L3 --> L3C
    L3C -->|Yes| HIT3[Return + Store L1 & L2<br/>~500ms]
    L3C -->|No| FB
    
    FB -->|Available| HIT4[Return Stale + Warning<br/>~10ms]
    FB -->|Not Available| ERR[Error 500]
    
    style HIT1 fill:#90EE90
    style HIT2 fill:#90EE90
    style HIT3 fill:#90EE90
    style HIT4 fill:#FFD700
    style ERR fill:#FF6B6B
```

---

## Agent Isolation Model

```mermaid
graph TB
    subgraph Orchestrator Layer
        O[Orchestrator]
        R[Router<br/>if/elif/else]
        TE[Tool Executor]
        
        O --> R
        R --> O
        O --> TE
        TE --> O
    end
    
    subgraph Tool Layer Parallel
        T1[get_transactions]
        T2[get_balance]
        T3[analyze_spending]
        T4[detect_fraud]
        T5[get_deposits]
        T6[get_customer_info]
        
        TE -.->|async parallel| T1
        TE -.->|async parallel| T2
        TE -.->|async parallel| T3
        TE -.->|async parallel| T4
        TE -.->|async parallel| T5
        TE -.->|async parallel| T6
    end
    
    subgraph Data Sources
        Cache[Multi-Layer Cache]
        Nessie[Nessie API]
        
        T1 --> Cache
        T2 --> Cache
        T3 --> Cache
        T4 --> Cache
        T5 --> Cache
        T6 --> Cache
        
        Cache --> Nessie
    end
    
    subgraph Agent Layer ISOLATED
        NEB[Nebula]
        ATL[Atlas]
        SEN[Sentinel]
        NOV[Nova]
        
        O -->|Context Only| NEB
        O -->|Context Only| ATL
        O -->|Context Only| SEN
        O -->|Context Only| NOV
    end
    
    Note1[NO Direct Tool Access]
    Note2[Pre-computed Context]
    Note3[Agents are Passive]
    
    style NEB fill:#6B46C1
    style ATL fill:#2563EB
    style SEN fill:#059669
    style NOV fill:#DC2626
    style TE fill:#FFD700
    style R fill:#FFA500
```

---

## Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Received: User sends message
    
    Received --> Routing: FastAPI receives request
    
    Routing --> ToolExecution: Agent selected<br/>(Deterministic if/elif/else)
    
    ToolExecution --> CacheCheck: Determine required tools
    
    CacheCheck --> CacheHit: Data in cache
    CacheCheck --> APICall: Cache miss
    
    CacheHit --> Aggregation: Retrieve from cache
    APICall --> Aggregation: Fetch from Nessie
    
    Aggregation --> AgentInvocation: Combine tool results
    
    AgentInvocation --> ResponseGeneration: Pass context to agent
    
    ResponseGeneration --> Streaming: Generate response text/audio
    
    Streaming --> [*]: Stream back to mobile
    
    note right of Routing
        Priority:
        1. Sentinel
        2. Atlas
        3. Nebula
        4. Nova (fallback)
    end note
    
    note right of ToolExecution
        All tools execute
        in parallel using
        asyncio.gather
    end note
    
    note right of AgentInvocation
        Agent receives
        context only.
        NO tool access.
    end note
```

---

## Caching Performance Impact

```mermaid
graph LR
    subgraph No Cache
        NC1[Request] --> NC2[API Call<br/>1200ms]
        NC2 --> NC3[Processing<br/>300ms]
        NC3 --> NC4[Response<br/>Total: 1500ms]
    end
    
    subgraph Memory Cache
        MC1[Request] --> MC2[Memory Hit<br/>1ms]
        MC2 --> MC3[Processing<br/>50ms]
        MC3 --> MC4[Response<br/>Total: 51ms]
    end
    
    subgraph File Cache
        FC1[Request] --> FC2[File Read<br/>10ms]
        FC2 --> FC3[Processing<br/>50ms]
        FC3 --> FC4[Response<br/>Total: 60ms]
    end
    
    style NC4 fill:#FF6B6B
    style MC4 fill:#90EE90
    style FC4 fill:#90EE90
```

**Speedup**:
- Memory cache: **30x faster**
- File cache: **25x faster**

---

## Error Handling Flow

```mermaid
flowchart TD
    Start[Tool Execution] --> Try{Attempt<br/>Execution}
    
    Try -->|Success| Return[Return Result]
    Try -->|Timeout| Timeout[10s Timeout]
    Try -->|API Error| Error[API Error]
    
    Timeout --> Cache1{Check<br/>Cache}
    Error --> Cache1
    
    Cache1 -->|Fresh Cache| UseFresh[Use Cached Data]
    Cache1 -->|Stale Cache| UseStale[Use Stale Data<br/>+ Warning]
    Cache1 -->|No Cache| Fail[Return Error Object]
    
    UseFresh --> Aggregate[Aggregate Results]
    UseStale --> Aggregate
    Fail --> Aggregate
    Return --> Aggregate
    
    Aggregate --> Agent[Pass to Agent]
    Agent --> Decision{Has Enough<br/>Data?}
    
    Decision -->|Yes| Respond[Generate Response]
    Decision -->|No| Apologize[Apologize + Suggest Retry]
    
    Respond --> End[Return to User]
    Apologize --> End
    
    style Return fill:#90EE90
    style UseFresh fill:#90EE90
    style UseStale fill:#FFD700
    style Fail fill:#FF6B6B
```

---

## Data Flow Example

### User Query: "How much did I spend on groceries?"

```mermaid
graph TB
    Q[User: How much did I<br/>spend on groceries?]
    
    Q --> R[Router: Analyze Keywords]
    R -->|Found: spend, groceries| N[Select: NEBULA]
    
    N --> T[Determine Tools:<br/>1. get_recent_transactions<br/>2. get_account_balance<br/>3. analyze_spending_patterns]
    
    T --> P[Execute in Parallel]
    
    P --> T1[Tool 1: 350ms]
    P --> T2[Tool 2: 250ms]
    P --> T3[Tool 3: 400ms]
    
    T1 --> A[Aggregate: 400ms<br/>slowest tool determines total]
    T2 --> A
    T3 --> A
    
    A --> C[Context:<br/>transactions: 12 items<br/>groceries total: $87.50<br/>balance: $1500]
    
    C --> NEB[Nebula Agent]
    NEB --> RES[Response: You spent $87.50<br/>on groceries this week across<br/>2 stores. That's below your<br/>average of $95/week. Great job!]
    
    RES --> M[Stream to Mobile]
    
    style N fill:#6B46C1
    style NEB fill:#6B46C1
    style P fill:#FFD700
    style A fill:#FFD700
```

---

## Performance Metrics

### Without Optimizations
```
Sequential Tool Execution: 1000ms
No Caching: Every request hits API
Result: 1000-1500ms per request
```

### With Optimizations
```
Parallel Tool Execution: 400ms (2.5x faster)
Memory Cache (80% hit rate): 50ms (20x faster)
File Cache (15% hit rate): 60ms (17x faster)
API Call (5% miss rate): 500ms

Average: 80ms per request
```

**Overall Improvement: 18x faster on average**

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Mobile App
        MA[React Native<br/>Expo]
    end
    
    subgraph Backend Docker
        FA[FastAPI<br/>Container]
        FV[Volume:<br/>data/cache]
    end
    
    subgraph External APIs
        NA[Nessie API]
        GA[Gemini API]
        EA[ElevenLabs API]
    end
    
    MA -->|WebSocket| FA
    FA -->|HTTP| NA
    FA -->|HTTP| GA
    FA -->|HTTP| EA
    FA -->|Read/Write| FV
    
    style FA fill:#4169E1
    style FV fill:#FFD700
```

---

## Summary

### Key Architectural Decisions

1. **Deterministic Routing**: `if/elif/else` for predictability
2. **Parallel Execution**: Minimize latency with `asyncio.gather`
3. **Multi-Layer Cache**: Memory → File → API with graceful degradation
4. **Agent Isolation**: Agents receive context, don't call tools
5. **Fail-Safe Design**: Fallbacks at every layer

### Benefits

- ✅ **Fast**: 50-500ms response time
- ✅ **Reliable**: Multiple fallback layers
- ✅ **Testable**: Deterministic behavior
- ✅ **Scalable**: Stateless, cache-friendly
- ✅ **Maintainable**: Clear separation of concerns
