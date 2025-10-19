import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import LinearGradient from '../components/LinearGradientWrapper';
import { useAuthStore } from '../stores/authStore';
import AgentOrb from '../components/AgentOrb';
import TransactionList from '../components/TransactionList';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { useResponsive } from '../hooks/useResponsive';
import { DataService, UserFinancialData } from '../services/DataService';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const responsive = useResponsive();
  const { user, logout } = useAuthStore();

  // State for user data from centralized storage
  const [financialData, setFinancialData] = useState<UserFinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load financial data from centralized storage
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
      
      console.log('✓ Financial data loaded for customer:', user.customerId);
    } catch (err) {
      console.error('❌ Error loading financial data:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
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

  // Prepare data for components
  const getTransactions = () => {
    if (!financialData) return [];
    
    return financialData.transactions_30d.map((tx: any) => ({
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
    })).slice(0, 10);
  };

  const getAccounts = () => {
    if (!financialData) return [];
    
    return financialData.accounts.map((account: any) => ({
      id: account._id || account.id,
      type: account.type,
      balance: account.balance,
      nickname: account.nickname || `${account.type} Account`
    }));
  };

  const getBudgets = () => {
    if (!financialData?.spending_by_category) return [];
    
    return Object.entries(financialData.spending_by_category).map(([category, spent]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      limit: Math.max((spent as number) * 1.2, 200),
      spent: spent as number,
      remaining: Math.max((spent as number) * 1.2, 200) - (spent as number)
    }));
  };

  const getTotalBalance = () => {
    return financialData?.balance?.total_balance || 0;
  };

  // Show loading state
  if (loading) {
    return (
      <LinearGradient colors={['#0F2027', '#203A43', '#2C5364']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading your financial data...</Text>
      </LinearGradient>
    );
  }

  // Show error state
  if (error) {
    return (
      <LinearGradient colors={['#0F2027', '#203A43', '#2C5364']} style={styles.loadingContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const transactions = getTransactions();
  const accounts = getAccounts();
  const budgets = getBudgets();
  const totalBalance = getTotalBalance();

  const handleLogout = () => {
    logout();
  };

  const handleAddTag = (transactionId: string, tag: string) => {
    console.log('Adding tag:', tag, 'to transaction:', transactionId);
    // Tags could be saved to backend here
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#413d8cff', '#413d8cff']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || 'Alex'}</Text>
              {user?.capitalOneData && (
                <View style={styles.capitalOneBadge}>
                  <Text style={styles.capitalOneBadgeText}>Capital One</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
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
            tintColor="#fff"
            title="Pull to refresh"
            titleColor="#fff"
          />
        }
      >
        {/* Accounts Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accounts</Text>
          <View style={styles.accountsContainer}>
            {accounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.nickname}</Text>
                  <Text style={styles.accountType}>{account.type}</Text>
                </View>
                <Text style={styles.accountBalance}>
                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.totalBalanceContainer}>
            <Text style={styles.totalBalanceLabel}>Total Balance</Text>
            <Text style={styles.totalBalanceAmount}>
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Budget Tracking */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Budgets</Text>
          <View style={styles.budgetsContainer}>
            {budgets.map((budget, index) => {
              const percentage = (budget.spent / budget.limit) * 100;
              return (
                <View key={index} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetCategory}>{budget.category}</Text>
                    <Text style={styles.budgetAmounts}>
                      ${budget.spent} / ${budget.limit}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: percentage > 90 ? '#ff4757' :
                                           percentage > 70 ? '#ffa502' : '#2ed573'
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[
                    styles.budgetRemaining,
                    { color: budget.remaining > 0 ? '#2ed573' : '#ff4757' }
                  ]}>
                    ${budget.remaining} remaining
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Transaction List */}
        <TransactionList
          transactions={transactions}
          onAddTag={handleAddTag}
        />

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💸 Send Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.actionButtonText}>📊 View Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🎯 Set Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💬 Get Advice</Text>
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
  welcomeText: {
    fontSize: 16,
    color: '#B3D1FF',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capitalOneBadge: {
    backgroundColor: '#e31837', // Capital One red
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capitalOneBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  accountsContainer: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  totalBalanceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalBalanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  budgetsContainer: {
    gap: 20,
  },
  budgetItem: {
    gap: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  budgetAmounts: {
    fontSize: 14,
    color: '#666',
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
  budgetRemaining: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#f3f0ff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  actionButtonText: {
    color: '#7C3AED',
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
    color: '#fff',
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
    backgroundColor: '#7C3AED',
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

export default DashboardScreen;