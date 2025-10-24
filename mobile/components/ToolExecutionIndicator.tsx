/**
 * ToolExecutionIndicator - Shows which financial tools are being executed by agents
 * 
 * Displays real-time feedback when agents call tools like:
 * - get_spending_by_category
 * - get_account_balance
 * - detect_unusual_transactions
 * - etc.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';

interface ToolExecutionIndicatorProps {
  tools: string[];
  status: 'running' | 'completed' | 'failed';
  compact?: boolean;
}

const ToolExecutionIndicator: React.FC<ToolExecutionIndicatorProps> = ({
  tools,
  status,
  compact = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in when tools appear
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation while running
    if (status === 'running') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getToolIcon = (tool: string): string => {
    const toolMap: Record<string, string> = {
      get_spending_by_category: '📊',
      get_account_balance: '💰',
      get_recent_transactions: '📝',
      detect_unusual_transactions: '🔍',
      get_bills: '🧾',
      get_merchant_info: '🏪',
      analyze_spending_patterns: '📈',
      get_savings_goals: '🎯',
      calculate_budget: '💳',
    };
    return toolMap[tool] || '🔧';
  };

  const getToolLabel = (tool: string): string => {
    const labels: Record<string, string> = {
      get_spending_by_category: 'Analyzing Spending',
      get_account_balance: 'Checking Balance',
      get_recent_transactions: 'Fetching Transactions',
      detect_unusual_transactions: 'Scanning for Fraud',
      get_bills: 'Reviewing Bills',
      get_merchant_info: 'Looking up Merchant',
      analyze_spending_patterns: 'Analyzing Patterns',
      get_savings_goals: 'Checking Goals',
      calculate_budget: 'Computing Budget',
    };
    return labels[tool] || tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'running':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'running':
        return '⏳';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '';
    }
  };

  if (tools.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.compactText}>
          {getStatusIcon()} Using {tools.length} tool{tools.length > 1 ? 's' : ''}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.header, { borderLeftColor: getStatusColor() }]}>
        <Text style={styles.headerText}>
          {status === 'running' ? '🔄 Processing' : status === 'completed' ? '✓ Complete' : '✗ Failed'}
        </Text>
      </View>
      
      <View style={styles.toolsList}>
        {tools.map((tool, index) => (
          <Animated.View
            key={`${tool}-${index}`}
            style={[
              styles.toolItem,
              { transform: [{ scale: status === 'running' ? pulseAnim : 1 }] },
            ]}
          >
            <Text style={styles.toolIcon}>{getToolIcon(tool)}</Text>
            <Text style={styles.toolLabel}>{getToolLabel(tool)}</Text>
            {status === 'running' && (
              <View style={styles.spinner}>
                <Text style={styles.spinnerText}>⋯</Text>
              </View>
            )}
            {status === 'completed' && (
              <Text style={styles.completedIcon}>✓</Text>
            )}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    borderLeftWidth: 3,
    paddingLeft: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  toolsList: {
    gap: 6,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 8,
    gap: 8,
  },
  toolIcon: {
    fontSize: 16,
  },
  toolLabel: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
  },
  spinner: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  completedIcon: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  compactContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  compactText: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '600',
  },
});

export default ToolExecutionIndicator;
