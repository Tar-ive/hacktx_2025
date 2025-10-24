# Mobile App Testing Guide - Google ADK Integration

## Pre-Flight Checklist

### Backend Setup ✅
```bash
cd backend

# 1. Verify environment variables
cat .env | grep -E "(GEMINI_API_KEY|ENABLE_ADK_AGENTS|NESSIE)"

# Expected output:
# GEMINI_API_KEY=AIza...
# ENABLE_ADK_AGENTS=true
# NESSIE_API_KEY=...
# NESSIE_CUSTOMER_ID=68f42c289683f20dd51a0293

# 2. Start backend
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected startup message**:
```
✓ Configuration validated
✓ ADK Agents: ENABLED (Gemini responses active)
✓ Server ready on 0.0.0.0:8000
```

### Mobile Setup ✅
```bash
cd mobile

# 1. Verify .env file
cat .env

# Expected:
# EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
# (Or http://YOUR_LOCAL_IP:8000 for physical device)

# 2. Start Expo
npm start

# Then press 'w' for web, 'i' for iOS, or 'a' for Android
```

---

## Test Scenarios

### Test 1: Agent Chat Screen with ADK

#### Setup
1. Start backend and mobile app
2. Login: `taylor@rebankaustin.com` / `demo1234`
3. Navigate to AI Home → Select "Nebula" agent

#### Test Cases

**Case 1.1: Basic Chat**
- **Action**: Type "How much did I spend on groceries?"
- **Expected**:
  - ✅ Message appears instantly
  - ✅ "🧠 Nebula is thinking..." indicator shows
  - ✅ Tool execution indicator appears: `📊 Analyzing Spending`
  - ✅ Response appears with actual dollar amount (e.g., "$456.78")
  - ✅ Tool badge shows: `✓ Used: get_spending_by_category`
- **Success Criteria**: Response contains real financial data

**Case 1.2: Error Handling**
- **Action**: Stop backend → Send message → Start backend
- **Expected**:
  - ✅ Error message appears: "Network error: Unable to reach server"
  - ✅ System message: "⚠️ Network error... Tap retry to try again."
  - ✅ Retry button appears at bottom
  - ✅ After 3 seconds, error clears automatically
  - ✅ Click retry button → Message resends successfully
- **Success Criteria**: Graceful error handling with recovery

**Case 1.3: Tool Execution Tracking**
- **Action**: Ask "What's my account balance and recent transactions?"
- **Expected**:
  - ✅ Multiple tool indicators appear
  - ✅ `💰 Checking Balance`
  - ✅ `📝 Fetching Transactions`
  - ✅ Tools complete with checkmark: `✓ Used: 2 tools`
- **Success Criteria**: Visual feedback for all tools used

**Case 1.4: Agent Routing**
- **Action**: While in Nebula chat, ask "Are there suspicious transactions?"
- **Expected**:
  - ✅ System message: "🤖 Routed to Sentinel"
  - ✅ Response from Sentinel agent
  - ✅ Active agent updates to Sentinel
- **Success Criteria**: Backend intelligently routes to correct agent

**Case 1.5: Conversation Persistence**
- **Action**: Send 3 messages → Navigate back → Return to chat
- **Expected**:
  - ✅ All 3 messages still visible
  - ✅ Conversation context preserved
  - ✅ Can continue conversation naturally
- **Success Criteria**: History persists across navigation

### Test 2: Voice Conversation Screen

#### Setup
1. Navigate to AI Home → "Voice Conversation"
2. Ensure microphone permissions granted

#### Test Cases

**Case 2.1: Voice Input**
- **Action**: Tap Gemini orb → Speak "What's my balance?"
- **Expected**:
  - ✅ Orb animates (listening state)
  - ✅ "Gemini is listening" hint appears
  - ✅ Stop recording → "Processing..." appears
  - ✅ Transcription appears in message bubble
  - ✅ Agent responds with voice + text
- **Success Criteria**: Complete voice-to-text-to-voice flow works

**Case 2.2: Tool Tracking During Voice**
- **Action**: Ask "How much did I spend on dining?"
- **Expected**:
  - ✅ Transcription appears
  - ✅ Agent analyzes with tools
  - ✅ Tool execution visible: `📊 Analyzing Spending`
  - ✅ Response includes actual dining spending
  - ✅ Audio plays back response
- **Success Criteria**: Tools tracked during voice conversations

**Case 2.3: Multi-Turn Conversation**
- **Action**: 
  1. Ask "What's my balance?"
  2. Then ask "And my recent transactions?"
  3. Then "Any unusual activity?"
- **Expected**:
  - ✅ Each turn transcribed correctly
  - ✅ Conversation context maintained
  - ✅ Agent remembers previous questions
  - ✅ Responses build on context
- **Success Criteria**: Natural multi-turn dialogue

### Test 3: Error Boundary Testing

#### Test Cases

**Case 3.1: Graceful Error Handling**
- **Action**: Simulate crash (modify code temporarily to throw error)
- **Expected**:
  - ✅ Error boundary catches crash
  - ✅ User-friendly error screen appears
  - ✅ "Try Again" button shown
  - ✅ Click button → App recovers
- **Success Criteria**: No white screen of death

**Case 3.2: Network Errors**
- **Action**: Turn off backend → Try various actions
- **Expected**:
  - ✅ All actions show clear error messages
  - ✅ No crashes
  - ✅ Retry functionality available
  - ✅ App remains responsive
- **Success Criteria**: App handles offline gracefully

### Test 4: State Management

#### Test Cases

**Case 4.1: Shared State Between Screens**
- **Action**:
  1. Chat with Nebula: "Show spending"
  2. Navigate to Voice Conversation
  3. Check conversation history
- **Expected**:
  - ✅ Chat history NOT shared between chat and voice
  - ✅ Each has independent history
  - ✅ Agent state independent per screen
- **Success Criteria**: Proper state isolation

**Case 4.2: Connection State**
- **Action**:
  1. Start backend
  2. Open chat → Check status
  3. Stop backend
  4. Send message
- **Expected**:
  - ✅ Status shows "🔗 Connected to ADK • Real data"
  - ✅ After backend stops: "⚠️ Connection issue"
  - ✅ Status updates automatically
- **Success Criteria**: Real-time connection state

---

## Performance Testing

### Metrics to Measure

1. **Response Time**
   - Tap send → Response appears
   - Target: < 3 seconds
   - Measure: Check Chrome DevTools Network tab

2. **Tool Execution Time**
   - Tool starts → Tool completes
   - Target: < 2 seconds
   - Displayed in tool execution indicator

3. **Message Rendering**
   - Large conversation (20+ messages)
   - Target: Smooth scrolling, no lag
   - Test: Scroll through history

4. **Error Recovery Time**
   - Network error → Retry → Success
   - Target: < 5 seconds total
   - Test: Manual retry after backend restart

---

## Integration Testing

### End-to-End User Journey

**Scenario**: New user explores AI banking

1. **Login**
   - Email: `taylor@rebankaustin.com`
   - Password: `demo1234`
   - ✅ Login successful

2. **Dashboard Exploration**
   - Navigate to Dashboard
   - ✅ Real transactions visible
   - Pull to refresh
   - ✅ Data updates

3. **Chat with Nebula**
   - Go to AI Home → Nebula
   - Ask: "Analyze my spending patterns"
   - ✅ Real analysis with tools
   - ✅ Actual dollar amounts
   - ✅ Tool execution tracked

4. **Voice Conversation**
   - Go to Voice Conversation
   - Say: "What's my biggest expense?"
   - ✅ Transcription accurate
   - ✅ Agent responds with real data
   - ✅ Audio playback works

5. **Error Recovery**
   - Stop backend mid-conversation
   - Try to send message
   - ✅ Error message appears
   - ✅ Retry button works
   - Restart backend → Retry
   - ✅ Conversation continues

6. **Navigation**
   - Navigate between screens
   - ✅ State preserves
   - ✅ No crashes
   - ✅ Smooth transitions

---

## Troubleshooting

### Backend Issues

**Problem**: "ADK Agents: Disabled"

**Solutions**:
```bash
# 1. Check .env file
cat backend/.env | grep ENABLE_ADK_AGENTS
# Should be: ENABLE_ADK_AGENTS=true

# 2. Check Gemini API key
cat backend/.env | grep GEMINI_API_KEY
# Should have valid key

# 3. Restart backend
cd backend && uv run uvicorn src.main:app --reload
```

**Problem**: Backend crashes on startup

**Solutions**:
```bash
# 1. Check Python version
python3 --version
# Should be 3.9+

# 2. Reinstall dependencies
cd backend && rm -rf .venv && uv venv && uv sync

# 3. Check logs
# Look for specific error in console output
```

### Mobile Issues

**Problem**: "Network error" immediately

**Solutions**:
```bash
# 1. Check mobile .env
cat mobile/.env
# For web: http://localhost:8000
# For device: http://YOUR_LOCAL_IP:8000

# 2. Test backend directly
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

# 3. Check firewall
# Ensure port 8000 is accessible
```

**Problem**: No tool execution indicators

**Solutions**:
- Check backend logs for tool calls
- Verify ADK agents are enabled
- Check that response includes `tools_called`
- Ensure ToolExecutionIndicator component imported

**Problem**: Conversations don't persist

**Solutions**:
- Check adkAgentStore is properly initialized
- Verify no errors in console
- Check that addMessage is being called
- Ensure store is not being reset

### Common Errors

**"Cannot read property 'map' of undefined"**
- Likely sessionHistory is undefined
- Check adkAgentStore initialization
- Verify store import is correct

**"Network request failed"**
- Backend not running
- Wrong API_BASE_URL
- CORS issues (check backend logs)

**"Agent not responding"**
- Check Gemini API key valid
- Verify ADK agents enabled
- Check backend logs for errors

---

## Success Criteria Checklist

### Core Functionality
- [ ] ✅ Agent chat works with real responses
- [ ] ✅ Voice conversation transcribes correctly
- [ ] ✅ Tool execution tracked and displayed
- [ ] ✅ Error handling works gracefully
- [ ] ✅ Retry functionality works
- [ ] ✅ Conversation history persists

### User Experience
- [ ] ✅ Loading states show clearly
- [ ] ✅ Error messages are user-friendly
- [ ] ✅ Animations smooth (60fps)
- [ ] ✅ Response times acceptable (<3s)
- [ ] ✅ Tool indicators informative
- [ ] ✅ Navigation intuitive

### Reliability
- [ ] ✅ No crashes during testing
- [ ] ✅ Error boundaries catch errors
- [ ] ✅ Network errors handled
- [ ] ✅ Offline mode functional
- [ ] ✅ State management robust

### Code Quality
- [ ] ✅ TypeScript errors: 0
- [ ] ✅ Console warnings: 0
- [ ] ✅ Proper error handling everywhere
- [ ] ✅ Code follows patterns consistently

---

## Next Steps After Testing

1. **If all tests pass**: Ready for deployment!
2. **If issues found**: Document in GitHub issues
3. **Performance issues**: Profile with React DevTools
4. **UI polish needed**: Add loading skeletons, animations
5. **Production deployment**: Follow Expo deployment guide

---

## Test Results Template

```
Test Date: ___________
Tester: ___________
Device: ___________
OS Version: ___________

✅ PASSED:
- [Test Name]
  - Expected: [description]
  - Actual: [description]

❌ FAILED:
- [Test Name]
  - Expected: [description]
  - Actual: [description]
  - Error: [error message]

Notes:
[Additional observations]
```

---

## Contact & Support

- Backend Issues: Check `backend/README.md`
- Mobile Issues: Check `MOBILE_APP_ENHANCEMENTS.md`
- ADK Integration: Check `backend/google_adk.md`
