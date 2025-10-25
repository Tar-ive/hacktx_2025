import React, { useState, useEffect, useRef } from 'react';
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
import { useADKAgentStore } from '../stores/adkAgentStore';
import adkService, { AgentId } from '../services/ADKService';
import ToolExecutionIndicator from '../components/ToolExecutionIndicator';
import ErrorBoundary from '../components/ErrorBoundary';

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
  const { 
    activeAgent, 
    setActiveAgent, 
    addMessage, 
    sessionHistory,
    getCurrentConversationContext,
    conversationId,
    setConversationId,
  } = useADKAgentStore();
  
  const { agentId } = route.params;
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTools, setCurrentTools] = useState<string[]>([]);
  const [toolStatus, setToolStatus] = useState<'running' | 'completed' | 'failed'>('running');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

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

    // Set active agent
    setActiveAgent(agentId as AgentId);

    // Welcome animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Add welcome message if no history
    if (sessionHistory.length === 0) {
      setTimeout(() => {
        addMessage({
          type: 'agent',
          text: agent.greeting,
          agent: agentId as AgentId,
        });
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [sessionHistory]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !user?.customerId) return;

    const messageText = inputText.trim();
    
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Add user message to store
    addMessage({
      type: 'user',
      text: messageText,
    });

    setInputText('');
    setIsTyping(true);
    setError(null);
    setCurrentTools([]);

    try {
      // Simulate typing delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 300));

      // Call ADK service with conversation context
      const response = await adkService.sendMessage(
        messageText,
        {
          customer_id: user.customerId,
          conversation_id: conversationId || undefined,
          history: getCurrentConversationContext(),
        },
        agentId as AgentId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get response');
      }

      // Update conversation ID if returned
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      // Show tools that were used
      if (response.context_used?.tools_called) {
        setCurrentTools(response.context_used.tools_called);
        setToolStatus('running');
        
        // Mark tools as completed after a delay
        setTimeout(() => {
          setToolStatus('completed');
        }, 800);
      }

      // Add agent response to store
      addMessage({
        type: 'agent',
        text: response.response,
        agent: response.agent,
        context: response.context_used,
      });

      // Update active agent if different
      if (response.agent !== agentId) {
        setActiveAgent(response.agent);
      }

      console.log('✓ ADK Response:', {
        agent: response.agent,
        tools: response.context_used?.tools_called,
        time: response.context_used?.execution_time_ms,
      });

    } catch (err) {
      console.error('❌ Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setToolStatus('failed');
      
      // Add error message to store
      addMessage({
        type: 'system',
        text: `⚠️ ${errorMessage}. Tap retry to try again.`,
      });

      // Auto-retry after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 3000);

    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async () => {
    // Get the last user message and resend
    const lastUserMessage = sessionHistory
      .filter(m => m.type === 'user')
      .pop();
    
    if (lastUserMessage) {
      setInputText(lastUserMessage.text);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ErrorBoundary>
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
                  {error ? '⚠️ Connection issue' : '🔗 Connected to ADK • Real data'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Chat Messages */}
        <View style={styles.messagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
          >
            {sessionHistory.map((message) => (
              <View key={message.id}>
                <View
                  style={[
                    styles.messageBubble,
                    message.type === 'user' && styles.userMessage,
                    message.type === 'agent' && styles.agentMessage,
                    message.type === 'system' && styles.systemMessage,
                  ]}
                >
                  {message.agent && message.agent !== agentId && (
                    <Text style={styles.agentRoutedLabel}>
                      🤖 Routed to {message.agent.charAt(0).toUpperCase() + message.agent.slice(1)}
                    </Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    message.type === 'user' && styles.userMessageText,
                    message.type === 'agent' && styles.agentMessageText,
                    message.type === 'system' && styles.systemMessageText,
                  ]}>
                    {message.text}
                  </Text>
                  {message.context && message.context.tools_called && message.context.tools_called.length > 0 && (
                    <Text style={styles.contextLabel}>
                      📊 Used: {message.context.tools_called.join(', ')}
                    </Text>
                  )}
                  <Text style={[
                    styles.messageTime,
                    message.type === 'user' && styles.userMessageTime,
                    message.type === 'agent' && styles.agentMessageTime,
                  ]}>
                    {formatTime(message.timestamp)}
                    {message.confidence !== undefined && ` • ${Math.round(message.confidence * 100)}%`}
                  </Text>
                </View>
                
                {/* Show tool execution indicator right after agent message */}
                {message.type === 'agent' && message.context?.tools_called && (
                  <ToolExecutionIndicator
                    tools={message.context.tools_called}
                    status="completed"
                    compact
                  />
                )}
              </View>
            ))}

            {/* Show tool execution during typing */}
            {isTyping && currentTools.length > 0 && (
              <ToolExecutionIndicator
                tools={currentTools}
                status={toolStatus}
              />
            )}

            {isTyping && (
              <View style={[styles.messageBubble, styles.agentMessage]}>
                <Text style={styles.typingText}>🧠 {agent.name} is thinking...</Text>
              </View>
            )}

            {error && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>⟳ Tap to Retry</Text>
              </TouchableOpacity>
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
    </ErrorBoundary>
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
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 12,
    maxWidth: '90%',
  },
  systemMessageText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
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
  retryButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  retryButtonText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AgentChatScreen;