import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';

const DashboardScreen = () => {
  const { user, logout } = useAuthStore();

  // Demo data - will be replaced with real data from backend
  const demoData = {
    user: user || {
      name: 'Alex',
      balance: 2450.00,
    },
    accounts: [
      { type: 'Checking', balance: user?.balance || 2450.00, nickname: 'Main Checking' },
    ],
    budgets: [
      { category: 'Entertainment', limit: 300, spent: 187, remaining: 113 },
    ],
  };

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
            <Text style={styles.userName}>{demoData.user.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Balance</Text>
          <Text style={styles.balanceAmount}>${demoData.user.balance?.toLocaleString() || '0.00'}</Text>
          <Text style={styles.accountType}>Main Checking</Text>
        </View>

        {/* Budget Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entertainment Budget</Text>
          <View style={styles.budgetContainer}>
            <Text style={styles.budgetInfo}>
              ${demoData.budgets[0].spent} of ${demoData.budgets[0].limit}
            </Text>
            <Text style={styles.budgetRemaining}>
              ${demoData.budgets[0].remaining} remaining
            </Text>
          </View>

          {/* Simple progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(demoData.budgets[0].spent / demoData.budgets[0].limit) * 100}%`
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Ask Agent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>View Transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Analyze Spending</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <Text style={styles.placeholderText}>
            Transaction history will appear here
          </Text>
        </View>

        {/* AI Agent Status Placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Assistant Status</Text>
          <Text style={styles.placeholderText}>
            AI agents ready to help you with your finances
          </Text>
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
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 5,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetInfo: {
    fontSize: 16,
    color: '#333',
  },
  budgetRemaining: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#f0f7ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default DashboardScreen;