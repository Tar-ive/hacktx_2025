import { PostCallTranscription, SummaryBundle } from '../types/WebhookTypes';
import { UserFinancialData } from './DataService';

type FinancialTransaction = UserFinancialData['transactions_90d'][number];

export class WebhookTransformer {
  /**
   * Transform webhook data to match UserFinancialData transaction format.
   */
  static transformCallToTransaction(webhook: PostCallTranscription): FinancialTransaction {
    const { data } = webhook;

    return {
      id: data.conversation_id,
      _id: data.conversation_id,
      purchase_date: new Date(data.metadata.start_time_unix_secs * 1000).toISOString(),
      transaction_date: new Date(data.metadata.start_time_unix_secs * 1000).toISOString(),
      description: data.analysis.transcript_summary || 'Voice Call',
      merchant_name: `AI Call - ${data.agent_id}`,
      amount: (data.metadata.cost ?? 0) / 100,
      category: this.categorizeCall(data),
      call_duration: data.metadata.call_duration_secs,
      call_status: data.status,
      call_successful: data.analysis.call_successful,
      user_id: data.user_id,
      agent_id: data.agent_id,
    } as FinancialTransaction;
  }

  /**
   * Categorize call based on content/analysis.
   */
  private static categorizeCall(data: PostCallTranscription['data']): string {
    const summary = (data.analysis.transcript_summary || '').toLowerCase();

    const categories: Record<string, string[]> = {
      customer_support: ['support', 'help', 'issue', 'problem'],
      sales: ['purchase', 'buy', 'pricing', 'quote'],
      information: ['information', 'fact', 'tell me'],
      consultation: ['advice', 'recommendation', 'suggest'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => summary.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Filter webhook data based on criteria.
   */
  static filterWebhookData(
    webhook: PostCallTranscription,
    filters: {
      minCost?: number;
      maxCost?: number;
      status?: string[];
      userId?: string;
      successOnly?: boolean;
      dateRange?: { start: Date; end: Date };
    },
  ): boolean {
    const { data } = webhook;

    if (filters.minCost !== undefined && data.metadata.cost < filters.minCost) {
      return false;
    }
    if (filters.maxCost !== undefined && data.metadata.cost > filters.maxCost) {
      return false;
    }
    if (filters.status && !filters.status.includes(data.status)) {
      return false;
    }
    if (filters.userId && data.user_id !== filters.userId) {
      return false;
    }
    if (filters.successOnly && data.analysis.call_successful !== 'success') {
      return false;
    }
    if (filters.dateRange) {
      const callDate = new Date(data.metadata.start_time_unix_secs * 1000);
      if (callDate < filters.dateRange.start || callDate > filters.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Transform array of webhooks to UserFinancialData format.
   */
  static transformToFinancialData(
    webhooks: PostCallTranscription[],
    existingData?: UserFinancialData,
  ): UserFinancialData {
    const transactions = webhooks.map((webhook) => this.transformCallToTransaction(webhook));

    const baseTransactions = existingData ? existingData.transactions_90d : [];
    const merged = [...baseTransactions, ...transactions];

    const uniqueTransactions = Array.from(new Map(merged.map((tx) => [tx.id || tx._id, tx])).values());

    uniqueTransactions.sort(
      (a, b) =>
        new Date(b.transaction_date || b.purchase_date).getTime() -
        new Date(a.transaction_date || a.purchase_date).getTime(),
    );

    const totalSpent = uniqueTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const callCount = uniqueTransactions.length;

    return {
      ...(existingData || ({} as UserFinancialData)),
      transactions_90d: uniqueTransactions,
      total_spent: totalSpent,
      call_count: callCount,
      avg_call_cost: callCount ? totalSpent / callCount : 0,
    } as UserFinancialData & {
      total_spent: number;
      call_count: number;
      avg_call_cost: number;
    };
  }

  static applySummaryBundle(
    summary: SummaryBundle | undefined,
    existingData?: UserFinancialData | null,
  ): UserFinancialData | null {
    if (!summary || !existingData) {
      return existingData ?? null;
    }

    const updated: UserFinancialData = {
      ...existingData,
      spending_by_category: { ...existingData.spending_by_category },
      insights: { ...existingData.insights },
    };

    const spendingViz = summary.visualizations.find(
      (viz) => viz.type === 'pie' && viz.data_tool === 'get_spending_by_category' && viz.data,
    );

    if (spendingViz && spendingViz.data) {
      updated.spending_by_category = spendingViz.data as Record<string, number>;
      const topCategory = Object.entries(updated.spending_by_category).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
      if (topCategory) {
        updated.insights.top_spending_category = {
          category: topCategory[0],
          amount: topCategory[1],
        };
      }
    }

    summary.key_metrics.forEach((metric) => {
      const label = metric.label.toLowerCase();
      if (label.includes('total spend')) {
        updated.spending_patterns.total_last_30_days = metric.value;
      } else if (label.includes('average daily')) {
        updated.spending_patterns.average_transaction_amount = metric.value;
      } else if (label.includes('total balance') && updated.balance) {
        updated.balance = {
          ...updated.balance,
          total_balance: metric.value,
        };
      } else if (label.includes('security score')) {
        updated.insights.security_alert = metric.value < 60;
      }
    });

    if (summary.call_metrics) {
      if (summary.call_metrics.total_spent !== undefined) {
        updated.total_spent = summary.call_metrics.total_spent ?? undefined;
      }
      if (summary.call_metrics.call_count !== undefined) {
        updated.call_count = summary.call_metrics.call_count ?? undefined;
      }
      if (summary.call_metrics.avg_call_cost !== undefined) {
        updated.avg_call_cost = summary.call_metrics.avg_call_cost ?? undefined;
      }
    }

    if (summary.highlights?.length) {
      updated.summary_highlights = summary.highlights;
    }
    if (summary.follow_ups?.length) {
      updated.summary_follow_ups = summary.follow_ups;
    }
    if (summary.audio) {
      updated.summary_audio = summary.audio;
    }
    if (summary.agent) {
      updated.summary_agent = summary.agent;
    }
    if (summary.tool_runs?.length) {
      updated.summary_tool_runs = summary.tool_runs;
    }

    return updated;
  }
}
