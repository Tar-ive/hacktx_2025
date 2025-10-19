import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';

interface SpendingAnalyticsProps {
  transactions: Array<{
    id: string;
    date: string;
    merchant: string;
    amount: number;
    category: string;
    tags?: string[];
  }>;
}

const SpendingAnalytics: React.FC<SpendingAnalyticsProps> = ({ transactions }) => {
  // Calculate spending by category
  const spendingByCategory = transactions.reduce((acc, transaction) => {
    if (transaction.amount < 0) { // Only count expenses
      const amount = Math.abs(transaction.amount);
      acc[transaction.category] = (acc[transaction.category] || 0) + amount;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly trends (simplified demo data)
  const monthlyTrends = [
    { month: 'Jul', amount: 1200 },
    { month: 'Aug', amount: 1450 },
    { month: 'Sep', amount: 1100 },
    { month: 'Oct', amount: 980 },
  ];

  // Calculate top spending categories
  const topCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const totalSpending = Object.values(spendingByCategory).reduce((sum, amount) => sum + amount, 0);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'food': '🍔',
      'coffee': '☕',
      'dining': '🍽️',
      'shopping': '🛍️',
      'entertainment': '🎬',
      'transport': '🚗',
      'utilities': '💡',
      'groceries': '🛒',
      'healthcare': '🏥',
      'education': '📚'
    };
    return icons[category] || '💳';
  };

  const getSpendingLevel = (amount: number) => {
    if (amount > 500) return { color: '#ff4757', label: 'High' };
    if (amount > 200) return { color: '#ffa502', label: 'Medium' };
    return { color: '#2ed573', label: 'Low' };
  };

  const getMonthDifference = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(change).toFixed(1),
      direction: change >= 0 ? '↑' : '↓',
      color: change >= 0 ? '#ff4757' : '#2ed573'
    };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending Analytics</Text>

      {/* Monthly Trend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Trend</Text>
        <View style={styles.trendContainer}>
          <View style={styles.trendChart}>
            {monthlyTrends.map((trend, index) => {
              const maxAmount = Math.max(...monthlyTrends.map(t => t.amount));
              const height = (trend.amount / maxAmount) * 80;
              const prevTrend = index > 0 ? monthlyTrends[index - 1] : null;
              const comparison = prevTrend ? getMonthDifference(trend.amount, prevTrend.amount) : null;

              return (
                <View key={trend.month} style={styles.trendColumn}>
                  <View style={styles.trendBarContainer}>
                    <View style={[styles.trendBar, { height: `${height}%` }]} />
                    {comparison && (
                      <Text style={[styles.trendChange, { color: comparison.color }]}>
                        {comparison.direction}{comparison.change}%
                      </Text>
                    )}
                  </View>
                  <Text style={styles.trendMonth}>{trend.month}</Text>
                  <Text style={styles.trendAmount}>${trend.amount}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending by Category</Text>
        <View style={styles.categoryList}>
          {topCategories.map(([category, amount], index) => {
            const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
            const spendingLevel = getSpendingLevel(amount);

            return (
              <View key={category} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
                    <View style={styles.categoryDetails}>
                      <Text style={styles.categoryName}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                      <Text style={styles.categoryAmount}>${amount.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={[styles.spendingLevel, { color: spendingLevel.color }]}>
                      {spendingLevel.label}
                    </Text>
                    <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: spendingLevel.color
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Spending Insights */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Insights</Text>
        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>📊</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Total Monthly Spending</Text>
              <Text style={styles.insightValue}>${totalSpending.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>🎯</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Top Spending Category</Text>
              <Text style={styles.insightValue}>
                {topCategories[0] ?
                  `${topCategories[0][0].charAt(0).toUpperCase() + topCategories[0][0].slice(1)} (${topCategories[0][1].toFixed(2)})` :
                  'No data'
                }
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>📈</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Spending Trend</Text>
              <Text style={[styles.insightValue, { color: '#2ed573' }]}>
                {monthlyTrends.length >= 2 ?
                  `${getMonthDifference(monthlyTrends[monthlyTrends.length - 1].amount, monthlyTrends[monthlyTrends.length - 2].amount).direction}${getMonthDifference(monthlyTrends[monthlyTrends.length - 1].amount, monthlyTrends[monthlyTrends.length - 2].amount).change}% vs last month` :
                  'Insufficient data'
                }
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  trendContainer: {
    alignItems: 'center',
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: 120,
    marginBottom: 10,
  },
  trendColumn: {
    alignItems: 'center',
    flex: 1,
  },
  trendBarContainer: {
    alignItems: 'center',
    height: 80,
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: 30,
    backgroundColor: '#0066CC',
    borderRadius: 4,
    minHeight: 10,
  },
  trendChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  trendMonth: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  trendAmount: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
  },
  categoryList: {
    gap: 15,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryDetails: {
    gap: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#666',
  },
  categoryStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  spendingLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsList: {
    gap: 15,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightContent: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default SpendingAnalytics;