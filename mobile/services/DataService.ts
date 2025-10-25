/**
 * Centralized Data Service
 * Fetches ALL user financial data from backend's centralized storage.
 * 
 * This is the SINGLE source of truth for user data in the mobile app.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface UserFinancialData {
  customer?: {
    _id: string;
    first_name: string;
    last_name: string;
    address?: Record<string, any>;
  };
  accounts: any[];
  balance: {
    total_balance: number;
    accounts: any[];
  };
  transactions_30d: any[];
  transactions_90d: any[];
  spending_by_category: Record<string, number>;
  spending_patterns: {
    total_last_30_days: number;
    average_transaction_amount: number;
    month_over_month_change?: number;
  };
  deposits_history: any[];
  unusual_transactions: any[];
  insights: {
    monthly_spending: number;
    average_transaction: number;
    top_spending_category?: {
      category: string;
      amount: number;
    };
    total_balance: number;
    num_accounts: number;
    transaction_count_30d: number;
    unusual_transaction_count?: number;
    security_alert?: boolean;
  };
  _metadata: {
    customer_id: string;
    last_updated: string;
    version: string;
  };
  total_spent?: number;
  call_count?: number;
  avg_call_cost?: number;
  summary_highlights?: string[];
  summary_follow_ups?: string[];
  summary_audio?: {
    url: string;
    expires_at?: string;
    codec?: string;
  };
  summary_agent?: string | null;
  summary_tool_runs?: Array<{
    tool: string;
    latency_ms?: number | null;
    cached?: boolean;
  }>;
}

export class DataService {
  private static cache: Map<string, {data: UserFinancialData, timestamp: number}> = new Map();
  private static cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all financial data for a customer.
   * Uses local cache for 5 minutes, then fetches from backend.
   * 
   * @param customerId - The Nessie customer ID
   * @param forceRefresh - Force refresh from API
   */
  static async getUserData(customerId: string, forceRefresh: boolean = false): Promise<UserFinancialData> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(customerId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
        console.log('📦 Using cached data for', customerId);
        return cached.data;
      }
    }

    console.log('🔄 Fetching data from backend for', customerId);
    
    try {
      const url = `${API_BASE_URL}/api/v1/data/${customerId}${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from backend');
      }
      
      const data = result.data as UserFinancialData;
      
      // Cache the data
      this.cache.set(customerId, {
        data,
        timestamp: Date.now()
      });
      
      console.log('✓ Data fetched and cached for', customerId);
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      
      // Try to return stale cache if available
      const cached = this.cache.get(customerId);
      if (cached) {
        console.log('⚠️  Returning stale cached data');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Force refresh data from Nessie API.
   * Use this when user explicitly wants to see latest data.
   */
  static async refreshData(customerId: string): Promise<void> {
    console.log('🔄 Force refreshing data from Nessie API...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/data/${customerId}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✓ Data refreshed:', result.message);
      
      // Clear cache to force refetch
      this.cache.delete(customerId);
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      throw error;
    }
  }

  /**
   * Clear local cache
   */
  static clearCache() {
    this.cache.clear();
    console.log('🗑️  Cache cleared');
  }

  /**
   * Get cache age in seconds
   */
  static getCacheAge(customerId: string): number | null {
    const cached = this.cache.get(customerId);
    if (!cached) return null;
    return (Date.now() - cached.timestamp) / 1000;
  }
}
