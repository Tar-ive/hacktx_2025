# Quick Start - Mobile App with Google ADK

## ⚡ 5-Minute Quick Start

### Prerequisites
- Backend running (port 8000)
- Mobile dependencies installed (`npm install` already done)

### Start Testing NOW

```bash
# Terminal 1: Backend
cd backend
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Mobile
cd mobile  
npm start
# Press 'w' for web

# Login: taylor@rebankaustin.com / demo1234
# Navigate: AI Home → Select Agent → Start Chatting
```

---

## 🎯 What to Test First

### 1. Agent Chat (30 seconds)
1. Login → AI Home → "Nebula"
2. Type: "How much did I spend on groceries?"
3. **Watch for**:
   - Tool execution indicator appears
   - Response has real dollar amount
   - "✓ Used: get_spending_by_category" badge

### 2. Error Handling (1 minute)
1. Stop backend (`Ctrl+C`)
2. Send message in chat
3. **Watch for**:
   - Error message appears
   - Retry button shows
   - Click retry → Works after backend restarts

### 3. Voice Conversation (2 minutes)
1. Navigate to Voice Conversation
2. Tap microphone → Say "What's my balance?"
3. **Watch for**:
   - Transcription appears
   - Agent responds
   - Tool indicators show

---

## ✅ Success Indicators

### Everything Working:
- ✅ Messages send instantly
- ✅ Responses have real financial data
- ✅ Tool indicators animate nicely
- ✅ Errors show retry button
- ✅ No crashes or white screens

### Something's Wrong:
- ❌ "Network error" immediately → Check backend is running
- ❌ No tool indicators → Check ADK enabled in backend
- ❌ Generic responses → Check backend logs
- ❌ Crashes → Check console for errors

---

## 🔧 Quick Fixes

### Backend Not Starting
```bash
cd backend
cat .env | grep ENABLE_ADK_AGENTS
# Should show: ENABLE_ADK_AGENTS=true

# If missing:
echo "ENABLE_ADK_AGENTS=true" >> .env
```

### Mobile Can't Connect
```bash
cd mobile
cat .env
# Should show: EXPO_PUBLIC_API_BASE_URL=http://localhost:8000

# Test backend:
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Tools Not Showing
- Check backend console for "ADK Agents: ENABLED"
- If disabled, check Gemini API key in backend/.env
- Restart backend after changes

---

## 📱 What We Built

### New Features ✨
1. **ADKService**: Smart retry logic + connection management
2. **adkAgentStore**: Centralized conversation state
3. **ToolExecutionIndicator**: Visual feedback for AI tools
4. **ErrorBoundary**: Crash protection + recovery
5. **Enhanced Chat**: Tool tracking + retry + better UX
6. **Enhanced Voice**: State management + tool tracking

### Architecture 🏗️
```
Mobile (Thin Client)
  ↓
ADKService (Network + Retry)
  ↓
Backend ADK Agents (Intelligence)
  ↓
Google Gemini 2.5 Flash
```

---

## 📋 Quick Test Checklist

- [ ] Backend starts with "ADK Agents: ENABLED"
- [ ] Mobile connects successfully
- [ ] Login works
- [ ] Send chat message → Get response with real data
- [ ] Tool execution indicators appear
- [ ] Stop backend → Error message shows
- [ ] Retry button works
- [ ] Voice conversation transcribes
- [ ] No crashes during normal use

---

## 📚 Full Documentation

- **Testing Guide**: `MOBILE_TESTING_GUIDE.md` (comprehensive)
- **Implementation Details**: `MOBILE_APP_ENHANCEMENTS.md` (technical)
- **Summary**: `IMPLEMENTATION_SUMMARY_FINAL.md` (overview)

---

## 🆘 Need Help?

### Check Logs
```bash
# Backend logs
cd backend && uv run uvicorn src.main:app --reload
# Watch for errors

# Mobile console
# Open browser DevTools (F12)
# Check Console tab for errors
```

### Common Issues

**"TypeError: Cannot read property 'map'"**
- Zustand store not initialized
- Refresh page/restart app

**"Network error: Unable to reach server"**  
- Backend not running
- Wrong API_BASE_URL
- Check curl http://localhost:8000/health

**"ADK Agents: Disabled"**
- Missing ENABLE_ADK_AGENTS=true
- Missing GEMINI_API_KEY
- Check backend/.env file

---

## 🎉 Success!

When you see:
- ✅ Backend: "ADK Agents: ENABLED"
- ✅ Mobile: Connects successfully
- ✅ Chat: Real financial data in responses
- ✅ Tools: Indicators show during processing
- ✅ Errors: Handled gracefully with retry

**You're ready to demo!** 🚀

---

## Next: Full Testing

Once quick start works, do comprehensive testing:

```bash
# Follow the detailed guide
cat MOBILE_TESTING_GUIDE.md

# Test scenarios:
1. Agent chat with all 4 agents
2. Voice conversation flows
3. Error handling & recovery
4. Tool execution tracking
5. Performance metrics
```

---

**Time to implement**: ~2 hours
**Time to test quickly**: ~5 minutes  
**Time for full testing**: ~30 minutes
**Status**: ✅ READY FOR TESTING
