import {
  WebhookEvent,
  WebhookEventType,
  PostCallTranscription,
  ConversationSummaryReady,
} from '../types/WebhookTypes';

type GenericCallback = (data: WebhookEvent) => void;

export class WebhookService {
  private static listeners: Map<WebhookEventType, GenericCallback[]> = new Map();
  private static ws: WebSocket | null = null;
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  static connect(url: string, userId: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const socketUrl = url.includes('{userId}')
      ? url.replace('{userId}', encodeURIComponent(userId))
      : `${url.replace(/\/$/, '')}/${encodeURIComponent(userId)}`;
    console.log(`🔌 Connecting to webhook stream: ${socketUrl}`);

    this.ws = new WebSocket(socketUrl);

    this.ws.onmessage = (event) => {
      try {
        const message: WebhookEvent = JSON.parse(event.data);
        if (message && typeof message === 'object' && 'type' in message) {
          this.handleWebhook(message);
        }
      } catch (error) {
        console.error('❌ Error parsing webhook message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Webhook WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 Webhook WebSocket disconnected');
      this.ws = null;
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect(url, userId);
        }, 5000);
      }
    };
  }

  static disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  static subscribe<T extends WebhookEventType>(
    eventType: T,
    callback: (data: Extract<WebhookEvent, { type: T }>) => void,
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    const callbacks = this.listeners.get(eventType)!;
    callbacks.push(callback as GenericCallback);

    return () => {
      const list = this.listeners.get(eventType);
      if (!list) return;
      const index = list.indexOf(callback);
      if (index !== -1) {
        list.splice(index, 1);
      }
    };
  }

  private static handleWebhook(webhook: WebhookEvent) {
    const description =
      webhook.type === 'post_call_transcription'
        ? (webhook as PostCallTranscription).data.conversation_id
        : (webhook as ConversationSummaryReady).session_id;

    console.log(`📥 Received webhook ${webhook.type} ${description ?? ''}`.trim());

    const callbacks = this.listeners.get(webhook.type) || [];
    callbacks.forEach((callback) => {
      try {
        callback(webhook);
      } catch (error) {
        console.error('❌ Webhook callback failed:', error);
      }
    });
  }
}
