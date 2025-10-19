# 🎤 Voice Testing Guide

How to test your ElevenLabs agents with **actual voice** (not just text).

---

## ✅ Your Agents Are Ready

All 4 agents exist in your ElevenLabs account:

| Agent | ID | Voice | Status |
|-------|-----|-------|--------|
| **Nebula** | agent_0901k7xas6p0... | Sarah (warm) | ✅ Active |
| **Atlas** | agent_7101k7xas7n8... | George (British) | ✅ Active |
| **Sentinel** | agent_1401k7xas9c2... | Brian (comforting) | ✅ Active |
| **Nova** | agent_6701k7xasabb... | River (neutral) | ✅ Active |

---

## 🎙️ Method 1: Test in ElevenLabs Dashboard (EASIEST)

This is the **fastest way** to test voice:

### Steps:

1. **Open ElevenLabs Dashboard**
   ```
   https://elevenlabs.io/app/conversational-ai
   ```

2. **Click on any agent** (Nebula, Atlas, Sentinel, or Nova)

3. **Click the "Test" button** (usually in top-right)

4. **Allow microphone access**

5. **Start talking!** 🎤
   - "How much did I spend this week?"
   - "Should I invest for retirement?"
   - "I see a suspicious charge"
   - "What is my balance?"

### What You'll Hear:

- **Real voice responses** from your agents
- **Personality-specific tones** (Sarah's warmth, George's authority, etc.)
- **Conversational AI** that understands context

---

## 💻 Method 2: Test with ElevenLabs Widget

For integrating into your own web app:

### Step 1: Create test HTML file

**Already created:** `test_voice.html`

### Step 2: Update with your credentials

Edit `test_voice.html` and add your API key (already done ✅)

### Step 3: Open in browser

```bash
# From backend directory
open test_voice.html

# Or manually open:
# file:///path/to/hacktx_2025/backend/test_voice.html
```

### Step 4: Click an agent button

Click "Nebula", "Atlas", "Sentinel", or "Nova"

### What Happens:

The widget will:
1. Connect to ElevenLabs
2. Start voice conversation
3. Listen to your microphone
4. Respond with agent's voice

---

## 📱 Method 3: Test via Mobile (Future)

For your mobile app integration:

### iOS/Android SDK:

```swift
// iOS Example
import ElevenLabs

let agent = ConversationalAIAgent(
    agentId: "agent_0901k7xas6p0eg79kjbrcg0ac4r4",
    apiKey: "your_api_key"
)

agent.startConversation()
```

### WebRTC Streaming:

```javascript
// JavaScript/React Native
const agent = new ElevenLabsAgent({
  agentId: 'agent_0901k7xas6p0eg79kjbrcg0ac4r4',
  apiKey: 'your_api_key'
});

await agent.connect();
// Speak into microphone
```

---

## 🧪 Method 4: Test Current Backend (Text Mode)

Your current backend provides **text responses** with cached data:

### What Works Now:

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "How much did I spend?"
  }'
```

**Returns:**
- ✅ Text response with financial data
- ✅ Agent routing (Nebula for spending)
- ✅ 60-min cached data
- ✅ All tools executed

**Doesn't include:**
- ❌ Voice synthesis
- ❌ Audio streaming
- ❌ Microphone input

### Why?

ElevenLabs Conversational AI requires:
1. **WebSocket connection** for audio streaming
2. **Signed URLs** for secure access
3. **Client-side JavaScript** or mobile SDK

REST API can't stream audio bidirectionally.

---

## 🔄 Current Backend Architecture

```
Your Backend (REST API)
  ↓
[Text Input] → Agent Routing → Tools → Cache → [Text Output]
                                                      ↓
                                                To get voice:
                                                      ↓
                                        ElevenLabs Dashboard/Widget
                                                      ↓
                                            [Audio Input/Output]
```

---

## 🎯 Recommended Testing Workflow

### For Development (Now):

1. **Test text functionality**:
   ```bash
   # Your backend
   curl -X POST http://localhost:8000/api/v1/chat/message \
     -H "Content-Type: application/json" \
     -d '{"customer_id": "...", "message": "..."}'
   ```
   ✅ Verifies: routing, tools, caching, data

2. **Test voice separately**:
   - Go to https://elevenlabs.io/app/conversational-ai
   - Click agent → Test
   - Speak to verify voice works
   
   ✅ Verifies: voice synthesis, personality, audio quality

### For Production (Mobile App):

You'll need to:

1. **Keep your backend** (routing, tools, caching)
2. **Add ElevenLabs mobile SDK** for voice
3. **Connect them**:
   ```
   Mobile App
     ↓ (text)
   Your Backend API → routing + tools + cache
     ↓ (data)
   ElevenLabs SDK → voice synthesis
     ↓ (audio)
   User hears response
   ```

---

## ✅ Quick Verification Checklist

Run this to verify everything:

```bash
# 1. Verify agents exist
cd backend
uv run python scripts/test_agent_exists.py

# 2. Test backend routing
curl -X POST http://localhost:8000/api/v1/agent/select \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend?"}' | jq

# 3. Test backend with tools
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "68f42c289683f20dd51a0293",
    "message": "spending"
  }' | jq '.agent, .context_used.tools_called'

# 4. Test voice in dashboard
# → Open https://elevenlabs.io/app/conversational-ai
```

---

## 🎤 Voice Testing Results

### ✅ What Should Work:

When you test in ElevenLabs dashboard:

1. **Nebula (Spending)**:
   - Say: "How much did I spend this week?"
   - Hear: Sarah's warm voice analyzing your spending

2. **Atlas (Investment)**:
   - Say: "Should I invest for retirement?"
   - Hear: George's authoritative voice with advice

3. **Sentinel (Security)**:
   - Say: "I see a suspicious charge"
   - Hear: Brian's comforting voice checking security

4. **Nova (General)**:
   - Say: "What is my balance?"
   - Hear: River's neutral voice with account info

### ⚠️ Current Limitation:

Agents **don't have access to real-time financial data** when tested in dashboard because:
- They're not connected to your backend
- No tool execution
- No cache access

**Solution**: For full integration with data:
1. Backend provides text responses with data ✅ (working now)
2. Mobile app uses ElevenLabs SDK for voice
3. Combine: data from backend + voice from SDK

---

## 📊 Architecture Options

### Option A: Current (Text + Dashboard Voice)
```
[User Text] → Backend API → [Text + Data] ← Cache ← Tools
[User Voice] → ElevenLabs Dashboard → [Voice Response]
```
✅ Backend: Full data access  
✅ Voice: Separate testing  
❌ Not integrated

### Option B: Mobile Integration (Recommended)
```
[User Voice] → Mobile App
                  ↓
                Backend API → [Data] ← Cache ← Tools
                  ↓
              ElevenLabs SDK → [Voice with Data]
                  ↓
              [User Hears]
```
✅ Backend: Full data access  
✅ Voice: Real-time  
✅ Fully integrated

### Option C: WebSocket (Advanced)
```
[User Voice] → Web App
                  ↓
              WebSocket → Backend → Tools → Cache
                  ↓
              ElevenLabs API → [Voice]
                  ↓
              [User Hears]
```
✅ Real-time bidirectional  
✅ Full integration  
⚠️ More complex

---

## 🚀 Next Steps

### For Hackathon Demo:

1. **Show backend functionality**:
   ```bash
   # Terminal
   curl -X POST http://localhost:8000/api/v1/chat/message ...
   
   # Swagger UI
   open http://localhost:8000/docs
   ```

2. **Show voice separately**:
   - Open ElevenLabs dashboard
   - Click agent
   - Test voice
   - Demo personality differences

3. **Explain integration**:
   "Backend provides intelligence and data, ElevenLabs provides voice"

### For Production:

1. **Add ElevenLabs mobile SDK**
2. **Connect backend API + voice SDK**
3. **Stream: User voice → Backend → Data → Voice response**

---

## 📝 Summary

| Test Method | Voice? | Data? | When to Use |
|-------------|--------|-------|-------------|
| **Backend API** | ❌ Text | ✅ Full | Testing logic/data |
| **ElevenLabs Dashboard** | ✅ Voice | ❌ None | Testing voice quality |
| **Mobile SDK** | ✅ Voice | ✅ Full | Production app |
| **WebSocket** | ✅ Voice | ✅ Full | Web apps |

**Your current setup is perfect for:**
- ✅ Testing agent routing
- ✅ Testing tool execution
- ✅ Testing caching
- ✅ Demonstrating intelligence

**To add voice, you need:**
- ElevenLabs mobile SDK OR
- WebSocket integration OR
- ElevenLabs widget in web app

---

## 🎉 You're All Set!

Your agents are **ready and working**. Test voice in dashboard, test data in backend, then combine for mobile app!

**Test voice now:**
```
https://elevenlabs.io/app/conversational-ai
```

**Test backend now:**
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "68f42c289683f20dd51a0293", "message": "balance"}'
```
