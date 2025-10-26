export type AgentState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'alert';

export interface AgentConfig {
  id: 'nova' | 'atlas' | 'mercury' | 'sentinel';
  label: string;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitVariance?: number;
  description: string;
  state: AgentState;
}

export interface AccountConfig {
  id: string;
  label: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit';
  activityLevel: 'low' | 'medium' | 'high';
}

export interface TransactionFlow {
  id: string;
  amount: number;
  category: 'food' | 'entertainment' | 'bills' | 'income';
  direction: 'inbound' | 'outbound';
  source?: string;
  target?: string;
}

export interface ConstellationSnapshot {
  netWorth: number;
  healthScore: number;
  agents: AgentConfig[];
  accounts: AccountConfig[];
  transactions: TransactionFlow[];
}

export const constellationSnapshot: ConstellationSnapshot = {
  netWorth: 182450,
  healthScore: 78,
  agents: [
    {
      id: 'nova',
      label: 'Nova',
      color: '#FFB800',
      orbitRadius: 5,
      orbitSpeed: 0.5,
      orbitVariance: 0.4,
      description: 'Proactive cash-flow strategist focused on growth opportunities.',
      state: 'speaking'
    },
    {
      id: 'atlas',
      label: 'Atlas',
      color: '#00D9FF',
      orbitRadius: 5.5,
      orbitSpeed: 0.3,
      orbitVariance: 0.8,
      description: 'Long-range planner keeping the financial plan stable.',
      state: 'thinking'
    },
    {
      id: 'mercury',
      label: 'Mercury',
      color: '#C0C0C0',
      orbitRadius: 5,
      orbitSpeed: 0.7,
      orbitVariance: 1,
      description: 'High-speed analyst monitoring markets and trends.',
      state: 'listening'
    },
    {
      id: 'sentinel',
      label: 'Sentinel',
      color: '#FF3366',
      orbitRadius: 3,
      orbitSpeed: 0.6,
      description: 'Risk guardian watching for alerts and anomalies.',
      state: 'idle'
    }
  ],
  accounts: [
    {
      id: 'checking-01',
      label: 'Everyday Checking',
      balance: 4820,
      type: 'checking',
      activityLevel: 'high'
    },
    {
      id: 'savings-01',
      label: 'Rainy Day Savings',
      balance: 15800,
      type: 'savings',
      activityLevel: 'medium'
    },
    {
      id: 'credit-visa',
      label: 'Aurora Rewards Visa',
      balance: -1200,
      type: 'credit',
      activityLevel: 'high'
    },
    {
      id: 'brokerage',
      label: 'Nebula Brokerage',
      balance: 132830,
      type: 'savings',
      activityLevel: 'low'
    }
  ],
  transactions: [
    {
      id: 'txn-income',
      amount: 4800,
      category: 'income',
      direction: 'inbound',
      source: 'employment',
      target: 'checking-01'
    },
    {
      id: 'txn-food',
      amount: 86,
      category: 'food',
      direction: 'outbound',
      source: 'checking-01'
    },
    {
      id: 'txn-entertainment',
      amount: 120,
      category: 'entertainment',
      direction: 'outbound',
      source: 'credit-visa'
    },
    {
      id: 'txn-bills',
      amount: 240,
      category: 'bills',
      direction: 'outbound',
      source: 'checking-01'
    }
  ]
};
