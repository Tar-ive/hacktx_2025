## Webhook & Analytics Tunnel Setup

This flow lets ElevenLabs reach your local backend and pushes real-time analytics into the mobile app.

### 1. Prerequisites
- `ngrok` installed and authenticated (`ngrok config add-authtoken ...`).
- Backend running locally (FastAPI on port 8000):  
  ```bash
  cd backend
  uvicorn src.main:app --reload
  ```
- Mobile app configured with the correct environment values (see step 4).

### 2. Start the ElevenLabs webhook tunnel
Expose the FastAPI server so ElevenLabs can POST to `/api/v1/webhooks/elevenlabs`:

```bash
ngrok http 8000 --domain=<your-reserved-domain>.ngrok-free.app
```

If you do not have a reserved domain, omit the `--domain` flag and use the hostname ngrok prints (e.g. `https://dcc566e23cfe.ngrok-free.app`).

### 3. Point ElevenLabs at the tunnel
- Sign in to the ElevenLabs dashboard.
- Configure the webhook URL:  
  `https://<ngrok-domain>/api/v1/webhooks/elevenlabs`
- If you use a webhook secret, set `ELEVENLABS_WEBHOOK_SECRET` in your backend `.env` to match.

### 4. Wire up the mobile app
Update your Expo env (e.g. `mobile/.env` or shell export) so the app talks to the tunnel:

```bash
export EXPO_PUBLIC_API_BASE_URL=https://<ngrok-domain>
export EXPO_PUBLIC_WEBHOOK_WS_URL=wss://<ngrok-domain>/ws
```

The analytics screen now listens for `post_call_transcription` events over WebSocket and merges new calls into the spending view.

### 5. Monitor the tunnel
Use `curl` to verify the webhook endpoint responds:

```bash
curl -i https://<ngrok-domain>/api/v1/webhooks/elevenlabs
```

Ngrok also provides a replay dashboard at `http://127.0.0.1:4040` where you can inspect and resend webhook calls during testing.
