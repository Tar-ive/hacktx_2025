import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';

interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  tags?: string[];
}

interface TransactionListProps {
  transactions: Transaction[];
  onAddTag: (transactionId: string, tag: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onAddTag }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);

  const availableTags = [
    'food', 'coffee', 'dining', 'shopping', 'entertainment',
    'transport', 'utilities', 'shared', 'vacation', 'business',
    'personal', 'groceries', 'healthcare', 'education'
  ];

  const getTransactionColor = (amount: number) => {
    return amount < 0 ? '#ff4757' : '#2ed573';
  };

  const getTransactionIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'food': '🍔',
      'coffee': '☕',
      'dining': '🍽️',
      'shopping': '🛍️',
      'entertainment': '🎬',
      'transport': '🚗',
      'utilities': '💡',
      'shared': '👥',
      'vacation': '✈️',
      'business': '💼',
      'personal': '👤',
      'groceries': '🛒',
      'healthcare': '🏥',
      'education': '📚'
    };
    return icons[category] || '💳';
  };

  const handleAddTag = (tag: string) => {
    if (selectedTransaction) {
      console.log('Adding tag:', tag, 'to transaction:', selectedTransaction.id);
      onAddTag(selectedTransaction.id, tag);
      setShowTagModal(false);
      setSelectedTransaction(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Transactions</Text>
      <ScrollView style={styles.scrollView}>
        {transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.category)}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.merchantName}>{transaction.merchant}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
                <View style={styles.tagsContainer}>
                  {transaction.tags?.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.amountContainer}>
                <Text style={[styles.amount, { color: getTransactionColor(transaction.amount) }]}>
                  {transaction.amount < 0 ? '-$' : '$'}{Math.abs(transaction.amount).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={() => {
                    setSelectedTransaction(transaction);
                    setShowTagModal(true);
                  }}
                >
                  <Text style={styles.addTagText}>+ Tag</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Tag Selection Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Tag to Transaction</Text>
            <Text style={styles.merchantModalText}>
              {selectedTransaction?.merchant}
            </Text>
            <ScrollView style={styles.tagsGrid}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagOption}
                  onPress={() => handleAddTag(tag)}
                >
                  <Text style={styles.tagOptionText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTagModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addTagButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  merchantModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    maxHeight: 300,
  },
  tagOption: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#ff4757',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionList;