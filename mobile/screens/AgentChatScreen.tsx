import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AgentChatScreenProps {
  route: {
    params: {
      agentId: string;
    };
  };
  navigation: any;
}

interface Message {
  type: 'user' | 'agent';
  text: string;
  timestamp: Date;
  agent?: string;
  context?: any;
}

const AgentChatScreen = ({ route, navigation }: AgentChatScreenProps) => {
  const { user } = useAuthStore();
  const { agentId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Agent data (UI display info only - backend handles routing)
  const agents = {
    nebula: {
      name: 'Nebula',
      color: '#6B46C1',
      description: 'Financial Strategy & Insights',
      greeting: 'Hello! I\'m Nebula, your financial strategy assistant. I\'ll analyze your real financial data to provide personalized advice. What would you like to know?'
    },
    atlas: {
      name: 'Atlas',
      color: '#2563EB',
      description: 'Budget Management & Planning',
      greeting: 'Hi! Atlas here. I have access to your actual spending and account data. Ask me anything about your finances!'
    },
    nova: {
      name: 'Nova',
      color: '#DC2626',
      description: 'Spending Patterns & Habits',
      greeting: 'Hello! I\'m Nova. I can see your real spending patterns and transactions. How can I help you understand your financial habits?'
    },
    sentinel: {
      name: 'Sentinel',
      color: '#059669',
      description: 'Security & Fraud Detection',
      greeting: 'Secure connection established. I\'m Sentinel, monitoring your actual account activity. What security concerns can I address?'
    }
  };

  const agent = agents[agentId as keyof typeof agents];

  useEffect(() => {
    // Check if user is properly logged in
    if (!user?.customerId) {
      Alert.alert(
        'Login Required',
        'Please log in with your account to use chat features.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Welcome animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Add welcome message
    setTimeout(() => {
      setMessages([{
        type: 'agent',
        text: agent.greeting,
        timestamp: new Date()
      }]);
    }, 1000);
  }, []);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !user?.customerId) return;

    const messageText = inputText.trim();
    
    // Add user message
    const userMessage: Message = {
      type: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    try {
      // Call backend API - this is where ALL intelligence happens!
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: user.customerId,
          message: messageText,
          session_id: `agent_chat_${user.customerId}_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Add agent response from backend
      const agentMessage: Message = {
        type: 'agent',
        text: data.response || 'I received your message and am processing it.',
        timestamp: new Date(),
        agent: data.agent,
        context: data.context_used
      };

      setMessages(prev => [...prev, agentMessage]);
      
      console.log('✓ Backend response:', {
        agent: data.agent,
        tools_used: data.context_used?.tools_called,
        execution_time: data.context_used?.execution_time_ms
      });

    } catch (err) {
      console.error('❌ Error calling backend:', err);
      setError('Failed to get response. Please try again.');
      
      // Add error message
      setMessages(prev => [...prev, {
        type: 'agent',
        text: '❌ Sorry, I\'m having trouble connecting to the server. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[agent.color, `${agent.color}80`]}
        style={styles.header}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.agentIcon}>
              <Text style={styles.agentIconText}>
                {agent.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentStatus}>
                {error ? '⚠️ Connection issue' : '🔗 Connected to backend • Real data'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Chat Messages */}
      <View style={styles.messagesContainer}>
        <ScrollView
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.type === 'user' ? styles.userMessage : styles.agentMessage
              ]}
            >
              {message.agent && message.agent !== agentId && (
                <Text style={styles.agentRoutedLabel}>
                  🤖 Routed to {message.agent.charAt(0).toUpperCase() + message.agent.slice(1)}
                </Text>
              )}
              <Text style={[
                styles.messageText,
                message.type === 'user' ? styles.userMessageText : styles.agentMessageText
              ]}>
                {message.text}
              </Text>
              {message.context && (
                <Text style={styles.contextLabel}>
                  📊 Used: {message.context.tools_called?.join(', ') || 'real financial data'}
                </Text>
              )}
              <Text style={[
                styles.messageTime,
                message.type === 'user' ? styles.userMessageTime : styles.agentMessageTime
              ]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubble, styles.agentMessage]}>
              <Text style={styles.typingText}>🧠 {agent.name} is typing...</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        style={styles.inputContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask me anything about your finances..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Text style={styles.sendButtonText}>🚀</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  agentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerText: {
    flex: 1,
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  agentStatus: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 18,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 6,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#F3F4F6',
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  userMessageTime: {
    color: '#DBEAFE',
  },
  agentMessageTime: {
    color: '#9CA3AF',
  },
  typingText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  agentRoutedLabel: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.9,
  },
  contextLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.8,
  },
  inputContainer: {
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#374151',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#F3F4F6',
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  sendButtonText: {
    fontSize: 18,
  },
});

export default AgentChatScreen;