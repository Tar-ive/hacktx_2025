# WebSocket Audio Streaming API

## Overview

The WebSocket API enables real-time voice conversations with the banking assistants. It supports both audio streaming and text messaging.

## Connection

**Endpoint:** `ws://localhost:8000/ws/{customer_id}`

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/68f42c289683f20dd51a0293');
```

## Protocol

### 1. Connection Establishment

**Server → Client:**
```json
{
  "type": "connection_established",
  "session_id": "session_1234567890",
  "message": "Ready for audio streaming"
}
```

### 2. Message Types

#### Client → Server Messages

**Start Conversation:**
```json
{
  "type": "start_conversation"
}
```

**Text Message:**
```json
{
  "type": "text_message",
  "message": "What's my account balance?"
}
```

**Audio Data:**
Send binary WebSocket messages containing raw audio data (16kHz, 16-bit PCM).

#### Server → Client Messages

**Listening Started:**
```json
{
  "type": "listening_started",
  "message": "Listening... Speak now"
}
```

**Transcription Result:**
```json
{
  "type": "transcription_result",
  "text": "How much did I spend on groceries last month?",
  "confidence": 0.95,
  "service": "gemini",
  "detected_intent": "spending_analysis"
}
```

**Conversation Turn Complete:**
```json
{
  "type": "conversation_turn_complete",
  "transcribed_text": "How much did I spend on groceries last month?",
  "selected_agent": "nebula",
  "routing_reasoning": "Spending keywords detected: groceries",
  "response_text": "Based on your recent transactions, you spent $324.50 on groceries in the last month.",
  "session_id": "session_1234567890",
  "context_summary": {
    "tools_called": ["get_recent_transactions", "analyze_spending_patterns"],
    "execution_time_ms": 450,
    "using_real_agent": true
  },
  "success": true,
  "transcription_metadata": {
    "confidence": 0.95,
    "service": "gemini",
    "detected_intent": "spending_analysis"
  }
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Processing error: Audio too short"
}
```

## Audio Streaming Workflow

### Client Implementation

```javascript
let audioBuffer = [];
let isListening = false;

// Start recording
async function startListening() {
    isListening = true;
    audioBuffer = [];

    // Send start signal
    ws.send(JSON.stringify({ type: "start_conversation" }));

    // Start recording from microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
        if (isListening) {
            // Convert audio to 16kHz, 16-bit PCM
            const audioData = convertToPCM(event.inputBuffer);
            // Send audio chunk
            ws.send(audioData);
        }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
}

// Stop recording
function stopListening() {
    isListening = false;
}
```

### Silence Detection

The client should implement local silence detection to optimize network usage:

```javascript
let silenceTimeout;

function handleAudioChunk(audioData) {
    // Send audio chunk
    ws.send(audioData);

    // Reset silence timeout
    clearTimeout(silenceTimeout);

    // Set new silence timeout (2 seconds of silence)
    silenceTimeout = setTimeout(() => {
        // Silence detected, stop listening
        stopListening();
    }, 2000);
}
```

## Configuration

### Audio Requirements

- **Format:** 16-bit PCM
- **Sample Rate:** 16kHz
- **Channels:** Mono
- **Chunk Size:** 100ms (1600 bytes)
- **Silence Threshold:** 1-2 seconds

### Environment Variables

```bash
# Required for Gemini speech-to-text
GEMINI_API_KEY=your_gemini_api_key

# Required for ElevenLabs agents
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Required for fallback speech recognition (optional)
# Note: SpeechRecognition requires system audio libraries
```

## Testing

### Manual Testing

1. Start the server:
```bash
cd backend
uv run uvicorn src.main:app --reload
```

2. Run the test script:
```bash
python test_websocket_audio.py
```

### Using WebSocket Client

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000/ws/68f42c289683f20dd51a0293');

ws.on('open', () => {
    console.log('Connected');

    // Send test message
    ws.send(JSON.stringify({
        type: 'text_message',
        message: 'What is my account balance?'
    }));
});

ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log('Received:', response);
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});
```

## Error Handling

The system handles various error conditions:

1. **Audio Too Short:** Chunks less than 0.5 seconds are ignored
2. **Transcription Failure:** Falls back to mock service if Gemini is unavailable
3. **Agent Unavailable:** Uses cached data if ElevenLabs agents fail
4. **Connection Issues:** Automatic cleanup on disconnect

## Performance

- **Latency:** <2s for audio-to-response
- **Caching:** 60-min TTL on financial data
- **Concurrent Users:** WebSocket manages multiple connections
- **Bandwidth:** Optimized with silence detection

## Integration with Mobile App

The mobile app should:

1. **Record Audio:** Use device microphone with proper encoding
2. **Stream in Real-time:** Send audio chunks as they're recorded
3. **Handle Silence:** Implement local silence detection
4. **Display Feedback:** Show transcription status and agent responses
5. **Manage State:** Handle connection drops and reconnection

## Security

1. **Authentication:** Customer ID serves as identifier
2. **Data Validation:** All messages validated on server
3. **Rate Limiting:** Built-in timeout protection
4. **Error Logging:** Comprehensive error tracking

## Future Enhancements

1. **Voice Activity Detection:** Server-side silence detection
2. **Multi-language Support:** Additional language models
3. **Audio Compression:** Reduce bandwidth usage
4. **Session Persistence:** Save conversation history
5. **Real-time Analytics:** Conversation metrics and insights