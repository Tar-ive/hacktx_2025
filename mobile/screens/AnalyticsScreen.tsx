import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { useResponsive } from '../hooks/useResponsive';
import { DataService, UserFinancialData } from '../services/DataService';

const AnalyticsScreen = ({ navigation }: { navigation: any }) => {
  const responsive = useResponsive();
  const { user } = useAuthStore();
  
  const [financialData, setFinancialData] = useState<UserFinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      tags: []
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
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#4299E1', '#4299E1']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToDashboard}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Spending Analytics</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299E1" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#4299E1', '#4299E1']} style={styles.header}>
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
        colors={['#4299E1', '#4299E1']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToDashboard}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Spending Analytics</Text>
            <Text style={styles.headerSubtitle}>Detailed insights & trends</Text>
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
            tintColor="#4299E1"
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
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📧 Email Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🎯 Set Alerts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💡 Get Tips</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📈 Compare Periods</Text>
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
    marginTop: 4,
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
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: '45%',
  },
  actionButtonText: {
    color: '#4299E1',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
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
    backgroundColor: '#4299E1',
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