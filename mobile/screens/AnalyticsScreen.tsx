import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { useResponsive } from '../hooks/useResponsive';
import { DataService, UserFinancialData } from '../services/DataService';
import { WebhookService } from '../services/WebhookService';
import { WebhookTransformer } from '../services/WebhookTransformer';
import { ConversationSummaryReady, PostCallTranscription } from '../types/WebhookTypes';

const AnalyticsScreen = ({ navigation }: { navigation: any }) => {
  const responsive = useResponsive();
  const { user } = useAuthStore();
  
  const [financialData, setFinancialData] = useState<UserFinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  // Load financial data
  const loadData = async () => {
    if (!user?.customerId) {
      setLoading(false);
      setError('No customer ID found. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await DataService.getUserData(user.customerId);
      setFinancialData(data);
      console.log('✓ Analytics data loaded');
    } catch (err) {
      console.error('❌ Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    if (!user?.customerId) return;
    
    try {
      setRefreshing(true);
      await DataService.refreshData(user.customerId);
      await loadData();
    } catch (err) {
      console.error('❌ Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, [user?.customerId]);

  const handleWebhookUpdate = (webhook: PostCallTranscription) => {
    console.log('🔄 Processing real-time webhook update');

    const filters = {
      userId: user?.customerId,
      successOnly: false,
      minCost: 0,
      dateRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };

    if (!WebhookTransformer.filterWebhookData(webhook, filters)) {
      console.log('⏭️ Webhook filtered out');
      return;
    }

    setFinancialData((prev) => WebhookTransformer.transformToFinancialData([webhook], prev || undefined));

    Alert.alert('New Activity', 'A new call has been recorded', [{ text: 'OK' }]);
  };

  const handleSummaryReady = (event: ConversationSummaryReady) => {
    if (!event.summary_bundle) {
      return;
    }
    console.log('🧾 Applying conversation summary bundle');
    setFinancialData((prev) => WebhookTransformer.applySummaryBundle(event.summary_bundle, prev));

    if (event.summary_bundle.highlights?.length) {
      Alert.alert('New Insights Ready', event.summary_bundle.highlights[0], [{ text: 'View' }]);
    }
  };

  useEffect(() => {
    if (!user?.customerId || !realtimeEnabled) {
      return;
    }

    const websocketUrl =
      process.env.EXPO_PUBLIC_WEBHOOK_WS_URL || 'ws://localhost:8000/ws';

    WebhookService.connect(websocketUrl, user.customerId);
    const unsubscribeTransactions = WebhookService.subscribe('post_call_transcription', handleWebhookUpdate);
    const unsubscribeSummaries = WebhookService.subscribe(
      'conversation_summary_ready',
      handleSummaryReady,
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeSummaries();
      WebhookService.disconnect();
    };
  }, [user?.customerId, realtimeEnabled]);
  
  // Transform data for SpendingAnalytics component
  const getTransactions = () => {
    if (!financialData) return [];
    
    return financialData.transactions_90d.map((tx: any) => ({
      id: tx._id || tx.id,
      date: new Date(tx.purchase_date || tx.transaction_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      merchant: tx.description || tx.merchant_name || 'Transaction',
      amount: tx.amount || 0,
      category: tx.category || 'other',
      tags: [],
      callDuration: tx.call_duration,
      callStatus: tx.call_status,
    }));
  };

  const handleBackToDashboard = () => {
    navigation.navigate('Dashboard');
  };

  const handleExportReport = () => {
    Alert.alert(
      'Export Report',
      'Choose export format',
      [
        { text: 'PDF', onPress: () => console.log('Export PDF') },
        { text: 'Excel', onPress: () => console.log('Export Excel') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const toggleRealtime = () => {
    setRealtimeEnabled((prev) => !prev);
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0066CC', '#004499']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToDashboard}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Spending Analytics</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0066CC', '#004499']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToDashboard}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Spending Analytics</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const transactions = getTransactions();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0066CC', '#004499']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToDashboard}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Spending Analytics</Text>
            <View style={styles.realtimeIndicator}>
              <View
                style={[
                  styles.realtimeDot,
                  realtimeEnabled ? styles.realtimeDotActive : undefined,
                ]}
              />
              <Text style={styles.headerSubtitle}>
                {realtimeEnabled ? 'Live Updates' : 'Updates Paused'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportReport}>
            <Text style={styles.exportButtonText}>📊 Export</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={[styles.content, responsive.isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066CC"
            title="Pull to refresh"
            titleColor="#666"
          />
        }
      >
        <SpendingAnalytics transactions={transactions} />

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={toggleRealtime}>
              <Text style={styles.actionButtonText}>
                {realtimeEnabled ? '⏸️ Pause Live' : '▶️ Resume Live'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Email report')}>
              <Text style={styles.actionButtonText}>📧 Email Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Set alerts')}>
              <Text style={styles.actionButtonText}>🎯 Set Alerts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Get tips')}>
              <Text style={styles.actionButtonText}>💡 Get Tips</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B3D1FF',
    textAlign: 'center',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 6,
  },
  realtimeDotActive: {
    backgroundColor: '#4ade80',
  },
  exportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  actionsCard: {
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
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  actionButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },

  // Responsive styles
  contentDesktop: {
    paddingHorizontal: 40,
    paddingTop: 30,
  },
  
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AnalyticsScreen;
