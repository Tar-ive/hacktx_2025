/**
 * ADK Agent Store - Manages agent conversation state across the app
 * 
 * Features:
 * - Current active agent tracking
 * - Agent state (idle, listening, thinking, speaking)
 * - Conversation history with context
 * - Tool execution tracking
 * - Multi-agent handoff support
 */

import { create } from 'zustand';

export type AgentId = 'nebula' | 'atlas' | 'sentinel' | 'nova';
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  text: string;
  timestamp: Date;
  agent?: AgentId;
  confidence?: number;
  context?: {
    tools_called?: string[];
    execution_time_ms?: number;
    data_fetched?: boolean;
  };
}

export interface ToolExecution {
  id: string;
  tool_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  result?: any;
  error?: string;
}

export interface AgentMetadata {
  name: string;
  color: string;
  description: string;
  specialty: string;
}

const agentMetadata: Record<AgentId, AgentMetadata> = {
  nebula: {
    name: 'Nebula',
    color: '#6B46C1',
    description: 'Financial Strategy & Insights',
    specialty: 'Daily spending analysis and budgeting',
  },
  atlas: {
    name: 'Atlas',
    color: '#2563EB',
    description: 'Investment & Planning',
    specialty: 'Long-term wealth and retirement planning',
  },
  sentinel: {
    name: 'Sentinel',
    color: '#059669',
    description: 'Security & Fraud Detection',
    specialty: 'Account security and fraud monitoring',
  },
  nova: {
    name: 'Nova',
    color: '#DC2626',
    description: 'General Banking Assistant',
    specialty: 'General banking questions and assistance',
  },
};

interface ADKAgentStore {
  // Agent state
  activeAgent: AgentId | null;
  agentState: AgentState;
  previousAgent: AgentId | null;
  
  // Conversation
  conversationId: string | null;
  sessionHistory: Message[];
  
  // Tool tracking
  activeToolExecutions: ToolExecution[];
  
  // Connection
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  setActiveAgent: (agent: AgentId | null) => void;
  setAgentState: (state: AgentState) => void;
  setConversationId: (id: string | null) => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
  clearHistory: () => void;
  addToolExecution: (tool: Omit<ToolExecution, 'id'>) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  setConnected: (connected: boolean, error?: string) => void;
  handleAgentHandoff: (fromAgent: AgentId, toAgent: AgentId, reason?: string) => void;
  reset: () => void;
  
  // Getters
  getAgentMetadata: (agent: AgentId) => AgentMetadata;
  getCurrentConversationContext: () => Array<{ role: 'user' | 'agent'; content: string; agent?: AgentId }>;
}

const useADKAgentStore = create<ADKAgentStore>((set, get) => ({
  // Initial state
  activeAgent: null,
  agentState: 'idle',
  previousAgent: null,
  conversationId: null,
  sessionHistory: [],
  activeToolExecutions: [],
  isConnected: false,
  connectionError: null,

  // Actions
  setActiveAgent: (agent) => {
    const current = get().activeAgent;
    set({ 
      activeAgent: agent,
      previousAgent: current,
    });
  },

  setAgentState: (state) => {
    set({ agentState: state });
  },

  setConversationId: (id) => {
    set({ conversationId: id });
  },

  addMessage: (message) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      sessionHistory: [...state.sessionHistory, fullMessage],
    }));
  },

  clearHistory: () => {
    set({ 
      sessionHistory: [],
      conversationId: null,
      activeToolExecutions: [],
    });
  },

  addToolExecution: (tool) => {
    const id = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTool: ToolExecution = {
      ...tool,
      id,
    };

    set((state) => ({
      activeToolExecutions: [...state.activeToolExecutions, fullTool],
    }));
  },

  updateToolExecution: (id, updates) => {
    set((state) => ({
      activeToolExecutions: state.activeToolExecutions.map((tool) =>
        tool.id === id ? { ...tool, ...updates } : tool
      ),
    }));
  },

  setConnected: (connected, error) => {
    set({ 
      isConnected: connected,
      connectionError: error || null,
    });
  },

  handleAgentHandoff: (fromAgent, toAgent, reason) => {
    const { addMessage, setActiveAgent } = get();
    
    // Add system message about handoff
    addMessage({
      type: 'system',
      text: reason || `Transferring from ${fromAgent} to ${toAgent} for specialized assistance`,
    });

    // Update active agent
    setActiveAgent(toAgent);
  },

  reset: () => {
    set({
      activeAgent: null,
      agentState: 'idle',
      previousAgent: null,
      conversationId: null,
      sessionHistory: [],
      activeToolExecutions: [],
      isConnected: false,
      connectionError: null,
    });
  },

  // Getters
  getAgentMetadata: (agent) => agentMetadata[agent],

  getCurrentConversationContext: () => {
    const history = get().sessionHistory;
    
    // Return last 10 messages for context
    return history.slice(-10).map((msg) => ({
      role: msg.type === 'user' ? 'user' : 'agent',
      content: msg.text,
      agent: msg.agent,
    }));
  },
}));

export { useADKAgentStore, agentMetadata };
export default useADKAgentStore;
