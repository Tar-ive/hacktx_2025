import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { useResponsive } from '../hooks/useResponsive';

const AnalyticsScreen = ({ navigation }: { navigation: any }) => {
  const responsive = useResponsive();
  const { user, logout } = useAuthStore();

  // Demo transactions for analytics
  const [transactions] = useState([
    { id: '1', date: 'Oct 18, 2024', merchant: 'Starbucks', amount: -5.50, category: 'coffee', tags: ['morning'] },
    { id: '2', date: 'Oct 17, 2024', merchant: 'Target', amount: -87.43, category: 'shopping', tags: ['groceries'] },
    { id: '3', date: 'Oct 16, 2024', merchant: 'Shell Gas Station', amount: -45.00, category: 'transport', tags: [] },
    { id: '4', date: 'Oct 15, 2024', merchant: 'Chipotle', amount: -12.75, category: 'food', tags: ['lunch'] },
    { id: '5', date: 'Oct 14, 2024', merchant: 'Amazon', amount: -29.99, category: 'shopping', tags: [] },
    { id: '6', date: 'Oct 13, 2024', merchant: 'Salary Deposit', amount: 3500.00, category: 'income', tags: [] },
    { id: '7', date: 'Oct 12, 2024', merchant: 'Netflix', amount: -15.99, category: 'entertainment', tags: ['subscription'] },
    { id: '8', date: 'Oct 11, 2024', merchant: 'Whole Foods', amount: -67.23, category: 'groceries', tags: [] },
    { id: '9', date: 'Oct 10, 2024', merchant: 'Uber', amount: -23.50, category: 'transport', tags: [] },
    { id: '10', date: 'Oct 9, 2024', merchant: 'Apple Store', amount: -999.00, category: 'electronics', tags: ['work'] },
    { id: '11', date: 'Oct 8, 2024', merchant: 'Gym Membership', amount: -49.99, category: 'health', tags: ['subscription'] },
    { id: '12', date: 'Oct 7, 2024', merchant: 'Restaurant', amount: -85.20, category: 'dining', tags: ['date'] },
  ]);

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

export default AnalyticsScreen;