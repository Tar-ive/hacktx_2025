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
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';

interface AgentChatScreenProps {
  route: {
    params: {
      agentId: string;
    };
  };
  navigation: any;
}

const AgentChatScreen = ({ route, navigation }: AgentChatScreenProps) => {
  const { user } = useAuthStore();
  const { agentId } = route.params;
  const [messages, setMessages] = useState<Array<{type: 'user' | 'agent', text: string, timestamp: Date}>>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Agent data
  const agents = {
    nebula: {
      name: 'Nebula',
      color: '#6B46C1',
      description: 'Financial Strategy & Insights',
      greeting: 'Hello! I\'m Nebula, your financial strategy assistant. How can I help you with your investment goals today?'
    },
    atlas: {
      name: 'Atlas',
      color: '#2563EB',
      description: 'Budget Management & Planning',
      greeting: 'Hi there! Atlas here, ready to help you manage your budget and plan for the future. What\'s on your mind?'
    },
    nova: {
      name: 'Nova',
      color: '#DC2626',
      description: 'Spending Patterns & Habits',
      greeting: 'Greetings! I\'m Nova, specializing in spending analysis and financial habits. Let\'s explore your financial behavior together!'
    },
    sentinel: {
      name: 'Sentinel',
      color: '#059669',
      description: 'Security & Fraud Detection',
      greeting: 'Secure connection established. I\'m Sentinel, your financial security companion. How can I protect your assets today?'
    }
  };

  const agent = agents[agentId as keyof typeof agents];

  useEffect(() => {
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

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const userMessage = {
      type: 'user' as const,
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = {
        nebula: [
          'I\'ve analyzed your spending patterns and found opportunities for investment growth. Would you like to explore specific investment options?',
          'Based on your current portfolio, I recommend diversifying into index funds for long-term growth.',
          'Your financial health score is 8.2/10. Excellent work on maintaining savings discipline!'
        ],
        atlas: [
          'I\'ve updated your monthly budget forecast. You\'re on track to save 15% more this month!',
          'Your dining out expenses are 23% higher than last month. Would you like me to suggest meal planning strategies?',
          'Great job staying under your entertainment budget! You have $150 remaining for this category.'
        ],
        nova: [
          'I notice you tend to spend more on weekends. Let\'s create a weekend budget strategy together.',
          'Your coffee spending pattern shows consistent weekday purchases. Consider a subscription to save money.',
          'Your transportation costs have decreased by 18% since last month. Great progress!'
        ],
        sentinel: [
          'I\'ve detected and blocked a suspicious transaction attempt on your account. Your funds are secure.',
          'Your account security score is 9.8/10. All protective measures are active and up to date.',
          'I recommend enabling two-factor authentication for your primary banking app for enhanced security.'
        ]
      };

      const agentResponses = responses[agentId as keyof typeof responses];
      const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];

      setMessages(prev => [...prev, {
        type: 'agent',
        text: randomResponse,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 2000);
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
              <Text style={styles.agentStatus}>Online • Ready to help</Text>
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
              <Text style={[
                styles.messageText,
                message.type === 'user' ? styles.userMessageText : styles.agentMessageText
              ]}>
                {message.text}
              </Text>
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