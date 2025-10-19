import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import AgentOrb from '../components/AgentOrb';
import TransactionList from '../components/TransactionList';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { useResponsive } from '../hooks/useResponsive';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const responsive = useResponsive();
  const { user, logout } = useAuthStore();

  // Demo transactions with tagging capability
  const [transactions, setTransactions] = useState([
    { id: '1', date: 'Oct 18, 2024', merchant: 'Starbucks', amount: -5.50, category: 'coffee', tags: ['morning'] },
    { id: '2', date: 'Oct 17, 2024', merchant: 'Target', amount: -87.43, category: 'shopping', tags: ['groceries'] },
    { id: '3', date: 'Oct 16, 2024', merchant: 'Shell Gas Station', amount: -45.00, category: 'transport', tags: [] },
    { id: '4', date: 'Oct 15, 2024', merchant: 'Chipotle', amount: -12.75, category: 'food', tags: ['lunch'] },
    { id: '5', date: 'Oct 14, 2024', merchant: 'Amazon', amount: -29.99, category: 'shopping', tags: [] },
    { id: '6', date: 'Oct 13, 2024', merchant: 'Salary Deposit', amount: 3500.00, category: 'income', tags: [] },
    { id: '7', date: 'Oct 12, 2024', merchant: 'Netflix', amount: -15.99, category: 'entertainment', tags: ['subscription'] },
    { id: '8', date: 'Oct 11, 2024', merchant: 'Whole Foods', amount: -67.23, category: 'groceries', tags: [] },
  ]);

  const handleAddTag = (transactionId: string, tag: string) => {
    console.log('Dashboard handleAddTag called:', transactionId, tag);
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId
          ? { ...tx, tags: [...(tx.tags || []), tag] }
          : tx
      )
    );
  };

  // Demo accounts data
  const accounts = [
    { id: '1', type: 'Checking', balance: 2450.00, nickname: 'Main Checking' },
    { id: '2', type: 'Savings', balance: 5200.00, nickname: 'Emergency Fund' },
  ];

  // Demo budget data
  const budgets = [
    { category: 'Food & Dining', limit: 400, spent: 287, remaining: 113 },
    { category: 'Transportation', limit: 200, spent: 145, remaining: 55 },
    { category: 'Entertainment', limit: 150, spent: 89, remaining: 61 },
    { category: 'Shopping', limit: 300, spent: 234, remaining: 66 },
  ];

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0066CC', '#004499']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Alex'}</Text>
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
    color: '#0066CC',
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
});

export default DashboardScreen;