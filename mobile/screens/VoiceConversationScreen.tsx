/**
 * Voice Conversation Screen - Real-time voice interaction with AI agents
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VoiceActivationButton } from '../components/VoiceActivationButton';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { getWebSocketService, resetWebSocketService, WebSocketMessage, WebSocketService } from '../services/WebSocketService';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ConversationMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  text: string;
  agent?: string;
  timestamp: Date;
  confidence?: number;
  metadata?: any;
}

export interface VoiceConversationScreenProps {
  navigation: any;
}

const VoiceConversationScreen: React.FC<VoiceConversationScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [transcribingText, setTranscribingText] = useState('');
  const [serviceToken, setServiceToken] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const wsService = useRef<WebSocketService | null>(null);
  const previousCustomerId = useRef<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    isRecording,
    isPreparing,
    startRecording,
    stopRecording,
    duration,
    error: recordingError,
  } = useAudioRecording(wsService.current);

  useEffect(() => {
    const customerId = user?.customerId;

    if (!customerId) {
      wsService.current?.disconnect();
      wsService.current = null;
      previousCustomerId.current = null;
      setIsConnected(false);
      setSessionId(null);
      setServiceToken(prev => prev + 1);
      return;
    }

    if (previousCustomerId.current !== customerId) {
      resetWebSocketService();
      wsService.current = getWebSocketService(API_BASE_URL, customerId);
      previousCustomerId.current = customerId;
      setServiceToken(prev => prev + 1);
    }
  }, [user?.customerId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const service = wsService.current;
    const customerId = user?.customerId;

    if (!service || !customerId) {
      return;
    }

    let isMounted = true;

    const connectWs = async () => {
      try {
        await service.connect();
        if (isMounted) {
          setIsConnected(true);
          console.log('✅ WebSocket connected');
        }
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        if (isMounted) {
          Alert.alert('Connection Error', 'Failed to connect to voice service');
        }
      }
    };

    connectWs();

    const handleConnectionEstablished = (message: WebSocketMessage) => {
      console.log('Connection established:', message);
      setSessionId(message.session_id ?? null);
      addSystemMessage('Connected. Tap the microphone to speak!');
    };

    const handleTranscription = (message: WebSocketMessage) => {
      console.log('Transcription received:', message.text);
      setTranscribingText('');
      addUserMessage(message.text || '', message.confidence);
    };

    const handleConversationComplete = (message: WebSocketMessage) => {
      console.log('Agent response:', message.response_text);
      setCurrentAgent(message.selected_agent);
      addAgentMessage(message.response_text || '', message.selected_agent, message);
    };

    const handleListeningStarted = () => {
      console.log('Listening started');
    };

    const handleAgentSpeaking = (msg: WebSocketMessage) => {
      console.log('Agent speaking:', msg.utterance);
    };

    const handleAgentStarted = () => {
      console.log('Agent started speaking');
      setIsAgentSpeaking(true);
    };

    const handleAgentFinished = () => {
      console.log('Agent finished speaking');
      setIsAgentSpeaking(false);
    };

    const handleError = (message: WebSocketMessage) => {
      console.error('WebSocket error:', message.message);
      Alert.alert('Error', message.message || 'An error occurred');
    };

    service.on('connection_established', handleConnectionEstablished);
    service.on('transcription_result', handleTranscription);
    service.on('conversation_turn_complete', handleConversationComplete);
    service.on('listening_started', handleListeningStarted);
    service.on('agent_started', handleAgentStarted);
    service.on('agent_speaking', handleAgentSpeaking);
    service.on('agent_finished', handleAgentFinished);
    service.on('error', handleError);

    return () => {
      isMounted = false;
      service.off('connection_established', handleConnectionEstablished);
      service.off('transcription_result', handleTranscription);
      service.off('conversation_turn_complete', handleConversationComplete);
      service.off('listening_started', handleListeningStarted);
      service.off('agent_started', handleAgentStarted);
      service.off('agent_speaking', handleAgentSpeaking);
      service.off('agent_finished', handleAgentFinished);
      service.off('error', handleError);
      service.disconnect();
      setIsConnected(false);
    };
  }, [user?.customerId, serviceToken]);

  useEffect(() => {
    if (recordingError) {
      Alert.alert('Recording Error', recordingError);
    }
  }, [recordingError]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'system',
        text,
        timestamp: new Date(),
      },
    ]);
  };

  const addUserMessage = (text: string, confidence?: number) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'user',
        text,
        timestamp: new Date(),
        confidence,
      },
    ]);
  };

  const addAgentMessage = (text: string, agent: string, metadata?: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'agent',
        text,
        agent,
        timestamp: new Date(),
        metadata,
      },
    ]);
  };

  const handleVoiceButtonPress = async () => {
    if (isRecording) {
      await stopRecording();
      setTranscribingText('Processing...');
    } else {
      if (!isConnected) {
        Alert.alert('Not Connected', 'Please wait for connection to establish');
        return;
      }
      await startRecording();
    }
  };

  const handleEndConversation = () => {
    Alert.alert(
      'End Conversation',
      'Would you like to view a summary of this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Without Summary',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'View Summary',
          onPress: () => {
            if (sessionId) {
              navigation.navigate('ConversationSummary', { sessionId });
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const getAgentColor = (agent: string): string => {
    const colors: Record<string, string> = {
      nebula: '#6B46C1',
      atlas: '#2563EB',
      nova: '#DC2626',
      sentinel: '#059669',
    };
    return colors[agent] || '#3B82F6';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user?.customerId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
          <View style={[styles.content, { padding: 24 }]}> 
            <Text style={styles.headerTitle}>Voice Assistant</Text>
            <Text style={[styles.systemMessage, { marginTop: 16 }]}>
              Link your Capital One account first to enable voice conversations.
            </Text>
            <TouchableOpacity
              style={[styles.systemButton, { marginTop: 24 }]}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <Text style={styles.systemButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Voice Assistant</Text>
              <View style={styles.statusIndicator}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isConnected ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.endButton} onPress={handleEndConversation}>
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.type === 'user' && styles.userMessage,
                  message.type === 'agent' && styles.agentMessage,
                  message.type === 'system' && styles.systemMessage,
                ]}
              >
                {message.type === 'agent' && message.agent && (
                  <View style={styles.agentHeader}>
                    <View
                      style={[
                        styles.agentIndicator,
                        { backgroundColor: getAgentColor(message.agent) },
                      ]}
                    />
                    <Text style={styles.agentName}>
                      {message.agent.charAt(0).toUpperCase() + message.agent.slice(1)}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    message.type === 'user' && styles.userMessageText,
                    message.type === 'agent' && styles.agentMessageText,
                    message.type === 'system' && styles.systemMessageText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.type === 'user' && styles.userMessageTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                  {message.confidence !== undefined && ` • ${Math.round(message.confidence * 100)}%`}
                </Text>
              </View>
            ))}

            {transcribingText && (
              <View style={[styles.messageBubble, styles.systemMessage]}>
                <Text style={styles.systemMessageText}>{transcribingText}</Text>
              </View>
            )}
          </ScrollView>

          {/* Voice Control */}
          <View style={styles.voiceControlContainer}>
            {currentAgent && (
              <Text style={styles.currentAgentText}>
                Speaking with {currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1)}
              </Text>
            )}
            <VoiceActivationButton
              isRecording={isRecording}
              isPreparing={isPreparing}
              onPress={handleVoiceButtonPress}
              disabled={!isConnected}
              size={100}
              recordingDuration={duration}
            />
            {isAgentSpeaking && (
              <Text style={styles.agentSpeakingText}>🔊 Agent is speaking...</Text>
            )}
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  endButton: {
    padding: 8,
  },
  endButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
  },
  systemButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'center',
  },
  systemButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 16,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  agentIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  agentMessageText: {
    color: '#E2E8F0',
  },
  systemMessageText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  messageTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  userMessageTime: {
    color: '#BFDBFE',
  },
  voiceControlContainer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  currentAgentText: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 12,
  },
  agentSpeakingText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 12,
    fontWeight: '600',
  },
});

export default VoiceConversationScreen;
