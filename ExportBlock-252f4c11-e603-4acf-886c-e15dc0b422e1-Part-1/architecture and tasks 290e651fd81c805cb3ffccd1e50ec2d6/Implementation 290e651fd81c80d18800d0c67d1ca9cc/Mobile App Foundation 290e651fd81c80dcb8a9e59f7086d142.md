# Mobile App Foundation

**React Native Setup**

- Initialize Expo managed workflow
- Configure app.json:
    - App name, slug, version
    - Icon and splash screen
    - Permissions (camera, microphone, notifications)
    - Orientation (portrait only for simplicity)
    - Status bar style
- Set up TypeScript configuration
- Configure Metro bundler

- Install React Navigation
- Create navigation hierarchy:
    - Auth Stack (Login, Signup, Onboarding)
    - Main Tab Navigator:
        - Home (Dashboard with 3D constellation)
        - Chat (Direct agent conversations)
        - Transactions (List and detail views)
        - Profile (Settings and preferences)
    - Modal Stack (overlays for actions)
- Implement deep linking for notifications
- Set up navigation types for TypeScript

**Core UI Components**

- Create design system components:
    - Button (primary, secondary, ghost variants)
    - Text (headings, body, caption with consistent sizing)
    - Card (container for content blocks)
    - Input (text, number, date with validation)
    - Modal (bottom sheet and full-screen variants)
    - Loading (skeleton screens and spinners)
- Implement theme provider:
    - Colors (space theme: Capital One theme, red and blue)
    - Typography (sizes, weights, line heights)
    - Spacing (consistent padding/margin scale)
    - Shadows (elevation for depth)
- Set up NativeWind (Tailwind for React Native)

**State Management**

- `authStore` - User authentication state
- `accountStore` - Banking accounts and balances
- `transactionStore` - Transaction list and filters
- `agentStore` - Active agent and conversation
- `uiStore` - UI state (modals, loading, toasts)
- Implement persistence for key stores
- Create selectors for derived state

Deliverable: Mobile app shell with navigation and UI components.

Authentication: registration only, one user for demo, can use the data in users.json for now (potential for db)

Build Signup screen (cuz demo will start with signup, so only this needs to work for the hackathon)

- username, password, gets saved to the csv, but will demo with sign up feature only
- Add authentication middleware to backend routes
- Implement route guards in mobile navigation

### **Nessie Service Layer**

**Task 5.1: HTTP Client Setup**

- Create axios instance for Nessie API
- Base URL: [http://api.nessieisreal.com](http://api.nessieisreal.com/)
- Default headers with API key
- Request/response interceptors for logging
- Retry logic with exponential backoff
- Timeout configuration (10 seconds)

**Task 5.2: Account Operations**

- Implement getAccounts:
    - Fetch all accounts for the username/email
    - Transform response to app format

Implement getAccountById:

- Fetch specific account details
- Include recent transaction preview
- Calculate available vs current balance
- Cache for persistence (json file)

**Transaction Operations**

- Implement searchTransactions:
    - Support complex filtering (date range, amount, merchant, category)
    - Merge purchases, bills, deposits into unified list
    - Sort by date (newest first by default)
    - Paginate results (50 per page)
    - Cache with 30-second TTL (transactions change frequently)
- Implement createPurchase:
    - Validate purchase data
    - Call Nessie API
    - Trigger categorization (Gemini)
    - Clear transaction cache
    - Emit WebSocket event for real-time update
- Implement createDeposit:
    - Similar flow to createPurchase
    - Identify income vs other deposits
    - Trigger savings rule evaluation
- Implement tagTransaction:
    - Store tags in Firestore (Nessie doesn't support tags)
    - Link by transaction ID
    - Support bulk tagging
    - Enable tag-based filtering

[interface](Mobile%20App%20Foundation%20290e651fd81c80dcb8a9e59f7086d142/interface%20290e651fd81c804292bfc1dd35a2456a.md)

[agentic integration](Mobile%20App%20Foundation%20290e651fd81c80dcb8a9e59f7086d142/agentic%20integration%20290e651fd81c802db78bde2fee51a9af.md)

[financial forecasting](Mobile%20App%20Foundation%20290e651fd81c80dcb8a9e59f7086d142/financial%20forecasting%20290e651fd81c80e8af4dfe795cfd8af8.md)