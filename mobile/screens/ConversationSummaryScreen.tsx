/**
 * Conversation Summary Screen - Display summary and insights from voice conversation
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface ConversationSummaryScreenProps {
  route: {
    params: {
      sessionId: string;
    };
  };
  navigation: any;
}

interface ConversationSummary {
  session_id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  turns: number;
  user_messages: any[];
  agent_messages: any[];
  events: any[];
  context_snapshots: any[];
  metadata: any;
}

const ConversationSummaryScreen: React.FC<ConversationSummaryScreenProps> = ({
  route,
  navigation,
}) => {
  const { sessionId } = route.params;
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [sessionId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/conversation/${sessionId}/summary`
      );

      setSummary(response.data);
    } catch (err: any) {
      console.error('Failed to fetch conversation summary:', err);
      setError(err.response?.data?.detail || 'Failed to load conversation summary');
      Alert.alert('Error', 'Failed to load conversation summary');
    } finally {
      setLoading(false);
    }
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

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading conversation summary...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error || 'No summary available'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchSummary}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButtonAlt}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonTextAlt}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const agents = [...new Set(summary.agent_messages.map((msg) => msg.agent))];
  const toolsCalled = summary.context_snapshots.flatMap((snapshot) =>
    Object.keys(snapshot.context).filter((key) => key !== 'execution_time_ms')
  );
  const uniqueTools = [...new Set(toolsCalled)];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversation Summary</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.turns}</Text>
              <Text style={styles.statLabel}>Conversation Turns</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.user_messages.length}</Text>
              <Text style={styles.statLabel}>Your Messages</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.agent_messages.length}</Text>
              <Text style={styles.statLabel}>Agent Responses</Text>
            </View>
          </View>

          {/* Agents Involved */}
          {agents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🤖 Agents Consulted</Text>
              <View style={styles.agentsContainer}>
                {agents.map((agent, index) => (
                  <View
                    key={index}
                    style={[
                      styles.agentChip,
                      { borderColor: getAgentColor(agent) },
                    ]}
                  >
                    <View
                      style={[
                        styles.agentDot,
                        { backgroundColor: getAgentColor(agent) },
                      ]}
                    />
                    <Text style={styles.agentChipText}>
                      {agent.charAt(0).toUpperCase() + agent.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tools Used */}
          {uniqueTools.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔧 Tools Used</Text>
              <View style={styles.toolsContainer}>
                {uniqueTools.map((tool, index) => (
                  <View key={index} style={styles.toolChip}>
                    <Text style={styles.toolChipText}>{tool}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Conversation Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Conversation</Text>
            <View style={styles.timeline}>
              {summary.user_messages.map((msg, index) => {
                const agentResponse = summary.agent_messages[index];
                return (
                  <View key={index} style={styles.turnContainer}>
                    {/* User Message */}
                    <View style={styles.userTurn}>
                      <View style={styles.userBubble}>
                        <Text style={styles.turnLabel}>You</Text>
                        <Text style={styles.userTurnText}>{msg.content}</Text>
                        <Text style={styles.turnTimestamp}>
                          {formatTimestamp(msg.timestamp)}
                        </Text>
                      </View>
                    </View>

                    {/* Agent Response */}
                    {agentResponse && (
                      <View style={styles.agentTurn}>
                        <View
                          style={[
                            styles.agentBubble,
                            {
                              borderLeftColor: getAgentColor(agentResponse.agent),
                            },
                          ]}
                        >
                          <View style={styles.agentTurnHeader}>
                            <View
                              style={[
                                styles.agentTurnDot,
                                {
                                  backgroundColor: getAgentColor(agentResponse.agent),
                                },
                              ]}
                            />
                            <Text style={styles.turnLabel}>
                              {agentResponse.agent.charAt(0).toUpperCase() +
                                agentResponse.agent.slice(1)}
                            </Text>
                          </View>
                          <Text style={styles.agentTurnText}>{agentResponse.content}</Text>
                          <Text style={styles.turnTimestamp}>
                            {formatTimestamp(agentResponse.timestamp)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Session Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ Session Info</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Session ID:</Text>
                <Text style={styles.infoValue}>{summary.session_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Started:</Text>
                <Text style={styles.infoValue}>{formatTimestamp(summary.created_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>
                  {Math.round(
                    (new Date(summary.updated_at).getTime() -
                      new Date(summary.created_at).getTime()) /
                      1000
                  )}{' '}
                  seconds
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.primaryButtonText}>📊 View Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('AIHome')}
          >
            <Text style={styles.secondaryButtonText}>🏠 Back to Home</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSpacer: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    padding: 12,
  },
  backButtonTextAlt: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  agentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agentChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  toolsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  toolChipText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '500',
  },
  timeline: {
    gap: 16,
  },
  turnContainer: {
    gap: 12,
  },
  userTurn: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  turnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  userTurnText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  agentTurn: {
    alignItems: 'flex-start',
  },
  agentBubble: {
    maxWidth: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    padding: 12,
  },
  agentTurnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  agentTurnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agentTurnText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  turnTimestamp: {
    fontSize: 10,
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
  },
});

export default ConversationSummaryScreen;
