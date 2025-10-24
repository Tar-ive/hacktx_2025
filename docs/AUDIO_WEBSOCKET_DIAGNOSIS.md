# Audio WebSocket Processing Diagnosis

## Date: 2025-10-19

## System Status

### ✅ What's Working

1. **Backend Server** - Running and healthy
   - Status: Running on `127.0.0.1:8000`
   - Health endpoint: `/health` responds with 200 OK
   - WebSocket endpoint: `/ws/{customer_id}` is active

2. **Configuration** - All credentials configured
   - ✅ Gemini API Key: Configured
   - ✅ ElevenLabs API Key: Configured
   - ✅ Nessie API Key: Configured
   - ✅ All 4 ElevenLabs agents created (Nebula, Atlas, Sentinel, Nova)

3. **Code Architecture** - Complete implementation
   - ✅ Gemini-based intent analysis (LLM Orchestrator)
   - ✅ Speech-to-text using Gemini multimodal
   - ✅ Agent routing logic
   - ✅ Tool execution framework
   - ✅ WebSocket handler with audio buffer management

## Audio Processing Flow

### Expected Flow
```
Mobile App → WebSocket → Backend Processing
    ↓           ↓              ↓
  Audio      Binary       Gemini STT
Recording   Transfer     Transcription
              ↓              ↓
         WebSocket     LLM Orchestrator
         Handler       (Intent Analysis)
              ↓              ↓
         Audio         Agent Selection
         Buffer        + Tool Calls
              ↓              ↓
         Silence      ElevenLabs Agent
        Detection      Response
              ↓              ↓
        Process         Send Response
        Speech          to Mobile
```

### Implementation Details

#### 1. Mobile App (`mobile/hooks/useAudioRecording.ts`)
- **Audio Format**: 16kHz, 16-bit PCM, mono
- **Recording**: Uses `expo-av` Audio API
- **Sending**: Converts to `Uint8Array` and sends via WebSocket binary
- **Logging**: `console.log('📤 Sending audio (${bytes.length} bytes) to WebSocket')`

#### 2. WebSocket Service (`mobile/services/WebSocketService.ts`)
- **Connection**: Native WebSocket (not socket.io)
- **URL Pattern**: `ws://localhost:8000/ws/{customer_id}`
- **Binary Send**: `ws.send(audioData)` for audio chunks
- **Text Send**: `ws.send(JSON.stringify(message))` for commands

#### 3. Backend Handler (`backend/src/orchestrator/websocket_handler.py`)
- **Audio Reception**: Line 388-395 - handles `websocket.receive_bytes`
- **Silence Detection**: Uses `AudioBuffer` with amplitude-based VAD
- **Transcription**: Calls Gemini STT service
- **Routing**: Uses `llm_orchestrator.route()` with Gemini 2.5 Flash
- **Agent Call**: Calls ElevenLabs agent with context

## 🔍 Diagnosis

### Issue: Audio not being processed

**Root Causes Identified:**

### 1. **WebSocket URL Mismatch** ⚠️
```typescript
// Mobile App (AnalyticsScreen.tsx:103)
const websocketUrl = process.env.EXPO_PUBLIC_WEBHOOK_WS_URL || 'ws://localhost:8000/ws';

// Backend Server (main.py:85)
@app.websocket("/ws/{customer_id}")
```

**Problem**: Mobile app may be connecting to wrong WebSocket endpoint
- Mobile connects to: `ws://localhost:8000/ws` (missing customer_id)
- Backend expects: `ws://localhost:8000/ws/{customer_id}`

**Impact**: WebSocket connection fails or hangs

### 2. **Gemini Audio Format Support** ⚠️
```python
# backend/src/services/speech_to_text.py:96-99
if audio_data[:4] == b'\x1a\x45\xdf\xa3':
    audio_format = "webm"  # WebM magic bytes
else:
    audio_format = "wav"  # Default to WAV
```

**Problem**: Gemini might not support raw PCM audio
- Mobile sends: Raw 16-bit PCM audio (no WAV header)
- Gemini expects: Proper audio file format (WAV, MP3, WebM)
- Current code: Assumes format without validation

**Impact**: Transcription fails silently

### 3. **Silence Detection Timing** ⚠️
```python
# backend/src/orchestrator/websocket_handler.py:34-39
analyzer = AudioAnalyzer(
    sample_rate=16000,
    sample_width=2,  # 16-bit
    channels=1,  # mono
    silence_threshold=500.0,  # RMS threshold
    silence_duration=1.0  # 1 second of silence
)
```

**Problem**: May be too aggressive or too lenient
- Might process incomplete speech
- Might wait too long before processing

### 4. **Audio Buffer Management** ⚠️
```python
# Line 393-395
should_process, audio_segments = connection_manager.add_audio_chunk(
    customer_id, audio_data
)
```

**Problem**: No chunking strategy visible
- Mobile sends entire recording as one blob
- Backend expects streaming chunks
- Buffer might overflow or underflow

### 5. **Error Handling Gaps** ⚠️
```python
# Line 172-179
except Exception as e:
    print(f"⚠️ STT error: {e}")
    return {
        "text": "",
        "confidence": 0.0,
        "error": str(e),
        "service": "error"
    }
```

**Problem**: Errors logged but not sent to mobile
- Mobile app doesn't see transcription errors
- No feedback loop for debugging

## 🔧 Recommended Fixes

### Fix 1: Correct WebSocket Connection
```typescript
// mobile/screens/VoiceConversationScreen.tsx
const wsService = new WebSocketService(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  user.customerId  // Make sure customer ID is passed!
);
```

### Fix 2: Add WAV Header to Audio
```typescript
// mobile/hooks/useAudioRecording.ts
function addWavHeader(pcmData: Uint8Array, sampleRate: number, bitDepth: number, channels: number): Uint8Array {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Combine header + PCM data
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);

  return wavData;
}
```

### Fix 3: Add Error Feedback to Mobile
```python
# backend/src/orchestrator/websocket_handler.py
# After line 406 (transcription result)
if not transcription_result.get("text"):
    await connection_manager.send_to_client(customer_id, {
        "type": "transcription_error",
        "error": transcription_result.get("error", "Unknown error"),
        "service": transcription_result.get("service", "unknown"),
        "message": "Could not transcribe audio. Please try again."
    })
    connection_manager.clear_audio_buffer(customer_id)
    continue  # Don't process empty transcription
```

### Fix 4: Add Verbose Logging
```python
# backend/src/orchestrator/websocket_handler.py:389
elif message["type"] == "websocket.receive_bytes":
    audio_data = message["bytes"]
    print(f"🔊 Received audio chunk: {len(audio_data)} bytes")  # ADD THIS

    should_process, audio_segments = connection_manager.add_audio_chunk(
        customer_id, audio_data
    )
    print(f"🎯 Should process: {should_process}, segments: {len(audio_segments) if audio_segments else 0}")  # ADD THIS
```

### Fix 5: Test with Mock Data
```bash
# backend/test_websocket_audio_manual.py
import asyncio
import websockets
import json
import wave
import io

async def test_audio_websocket():
    uri = "ws://localhost:8000/ws/68f42c289683f20dd51a0293"

    async with websockets.connect(uri) as websocket:
        # Wait for connection established
        msg = await websocket.recv()
        print(f"Connected: {msg}")

        # Generate test audio (1 second of 440Hz sine wave)
        sample_rate = 16000
        duration = 1.0
        # ... generate audio ...

        # Send audio
        await websocket.send(audio_bytes)

        # Wait for transcription
        response = await websocket.recv()
        print(f"Response: {response}")

asyncio.run(test_audio_websocket())
```

## 🚀 Testing Steps

1. **Check WebSocket Connection**
   ```bash
   cd backend
   python test_websocket_simple.py
   ```

2. **Enable Debug Logging**
   ```bash
   # backend/.env
   DEBUG=true
   LOG_LEVEL=DEBUG
   ```

3. **Test Mobile Connection**
   - Open React Native debugger
   - Check console for: "🔌 Connecting to WebSocket"
   - Check for: "✅ WebSocket connected"

4. **Monitor Backend Logs**
   ```bash
   cd backend
   uv run uvicorn src.main:app --reload --log-level debug
   ```

5. **Verify Audio Received**
   - Look for: `🔊 Received audio chunk: X bytes`
   - Look for: `🎯 Should process: True`
   - Look for: `✓ LLM Orchestrator routed to: {agent}`

## 📊 Next Steps

### Immediate Actions
1. Add WAV header to audio before sending
2. Fix WebSocket URL in mobile app
3. Add error feedback messages
4. Add verbose logging

### Testing
1. Create manual WebSocket test script
2. Test with known audio samples
3. Verify Gemini STT works with test audio
4. Check agent routing with mock transcriptions

### Monitoring
1. Add metrics for audio processing time
2. Track transcription success/failure rates
3. Monitor WebSocket connection stability
4. Log agent routing decisions

## 🎯 Success Criteria

- [ ] WebSocket connects successfully
- [ ] Audio chunks received by backend
- [ ] Gemini STT transcribes audio correctly
- [ ] LLM orchestrator routes to correct agent
- [ ] Mobile app receives agent response
- [ ] End-to-end latency < 3 seconds

## Additional Notes

The architecture is **solid and well-designed**. The issue is likely in the details:
- Audio format compatibility
- WebSocket connection parameters
- Error handling and feedback

All the pieces are in place - just need to debug the connection and data flow!
