/**
 * WebSocket service for real-time voice communication with backend.
 * Handles audio streaming, transcription events, and agent lifecycle.
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface TranscriptionResult {
  type: 'transcription_result';
  text: string;
  confidence: number;
  service: string;
  detected_intent: string;
}

export interface ConversationTurnComplete {
  type: 'conversation_turn_complete';
  transcribed_text: string;
  selected_agent: string;
  routing_reasoning: string;
  response_text: string;
  session_id: string;
  context_summary: {
    tools_called: string[];
    execution_time_ms: number;
    using_real_agent: boolean;
  };
  success: boolean;
  transcription_metadata: {
    confidence: number;
    service: string;
    detected_intent: string;
  };
}

export interface AgentEvent {
  type: 'agent_started' | 'agent_speaking' | 'agent_finished';
  agent_id: string;
  agent_name?: string;
  conversation_id?: string;
  session_id?: string;
  utterance?: string;
  timestamp?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private customerId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting = false;
  private sessionId: string | null = null;

  constructor(baseUrl: string, customerId: string) {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    this.url = `${wsUrl}/ws/${customerId}`;
    this.customerId = customerId;
  }

  /**
   * Connect to WebSocket server.
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        console.log(`🔌 Connecting to WebSocket: ${this.url}`);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;

          // Attempt reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.sessionId = null;
  }

  /**
   * Send audio chunk to server (binary data).
   */
  sendAudioChunk(audioData: Uint8Array | ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    } else {
      console.warn('WebSocket not ready, cannot send audio');
    }
  }

  /**
   * Send text message (JSON command).
   */
  sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not ready, cannot send message');
    }
  }

  /**
   * Start conversation (signal that user is about to speak).
   */
  startConversation(): void {
    this.sendMessage({ type: 'start_conversation' });
  }

  /**
   * Stop conversation (signal end of user speech).
   */
  stopConversation(): void {
    this.sendMessage({ type: 'stop_conversation' });
  }

  /**
   * Send text message instead of audio.
   */
  sendTextMessage(text: string): void {
    this.sendMessage({
      type: 'text_message',
      message: text,
    });
  }

  /**
   * Register message handler for specific message type.
   */
  on(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * Unregister message handler.
   */
  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if WebSocket is connected.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('📨 WebSocket message:', message.type);

    // Store session ID if provided
    if (message.session_id) {
      this.sessionId = message.session_id;
    }

    // Call registered handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Call wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }
}

// Singleton instance factory
let sharedInstance: WebSocketService | null = null;

export function getWebSocketService(baseUrl: string, customerId: string): WebSocketService {
  if (!sharedInstance) {
    sharedInstance = new WebSocketService(baseUrl, customerId);
  }
  return sharedInstance;
}

export function resetWebSocketService(): void {
  if (sharedInstance) {
    sharedInstance.disconnect();
    sharedInstance = null;
  }
}
