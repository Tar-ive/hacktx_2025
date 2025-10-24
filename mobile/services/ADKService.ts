/**
 * ADKService - Dedicated client for communicating with Google ADK backend agents
 * 
 * Handles:
 * - Agent selection and routing
 * - Conversation context management
 * - Retry logic with exponential backoff
 * - Connection state management
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type AgentId = 'nebula' | 'atlas' | 'sentinel' | 'nova';

export interface AgentResponse {
  success: boolean;
  agent: AgentId;
  response: string;
  context_used?: {
    tools_called?: string[];
    data_fetched?: boolean;
    execution_time_ms?: number;
  };
  conversation_id?: string;
  error?: string;
}

export interface ConversationContext {
  customer_id: string;
  conversation_id?: string;
  history?: Array<{
    role: 'user' | 'agent';
    content: string;
    agent?: AgentId;
  }>;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class ADKService {
  private client: AxiosInstance;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };
  private connectionState: 'online' | 'offline' | 'connecting' = 'online';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        this.connectionState = 'online';
        return response;
      },
      (error) => {
        if (!error.response) {
          this.connectionState = 'offline';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a message to an ADK agent
   */
  async sendMessage(
    message: string,
    context: ConversationContext,
    preferredAgent?: AgentId
  ): Promise<AgentResponse> {
    return this.withRetry(async () => {
      const payload = {
        customer_id: context.customer_id,
        message: message.trim(),
        session_id: context.conversation_id || `agent_chat_${context.customer_id}_${Date.now()}`,
        preferred_agent: preferredAgent,
        conversation_history: context.history,
      };

      const response = await this.client.post<AgentResponse>(
        '/api/v1/chat/message',
        payload
      );

      return response.data;
    });
  }

  /**
   * Select the best agent for a given message (without sending)
   */
  async selectAgent(message: string): Promise<{ agent: AgentId; confidence: number }> {
    return this.withRetry(async () => {
      const response = await this.client.post<{ agent: AgentId; confidence: number }>(
        '/api/v1/agent/select',
        { message }
      );
      return response.data;
    });
  }

  /**
   * Get user's complete financial data
   */
  async getUserData(customerId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/api/v1/data/${customerId}`);
      return response.data;
    });
  }

  /**
   * Refresh user's financial data from source
   */
  async refreshUserData(customerId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/api/v1/data/${customerId}/refresh`);
      return response.data;
    });
  }

  /**
   * Health check for backend connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      this.connectionState = 'online';
      return response.status === 200;
    } catch (error) {
      this.connectionState = 'offline';
      return false;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'online' | 'offline' | 'connecting' {
    return this.connectionState;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      this.connectionState = retryCount > 0 ? 'connecting' : 'online';
      return await fn();
    } catch (error) {
      if (retryCount >= this.retryConfig.maxRetries) {
        this.connectionState = 'offline';
        throw this.normalizeError(error);
      }

      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          throw this.normalizeError(error);
        }
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, retryCount),
        this.retryConfig.maxDelay
      );

      console.log(`Retry attempt ${retryCount + 1}/${this.retryConfig.maxRetries} after ${delay}ms`);
      
      await this.sleep(delay);
      return this.withRetry(fn, retryCount + 1);
    }
  }

  /**
   * Normalize errors to a consistent format
   */
  private normalizeError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // Server responded with error
        const data: any = axiosError.response.data;
        return new Error(data?.message || data?.error || `Server error: ${axiosError.response.status}`);
      } else if (axiosError.request) {
        // Request made but no response
        return new Error('Network error: Unable to reach server');
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred');
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Update base URL (useful for switching environments)
   */
  setBaseURL(url: string): void {
    this.client.defaults.baseURL = url;
  }
}

// Export singleton instance
export const adkService = new ADKService();

export default adkService;
