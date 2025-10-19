import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AgentOrb from '../components/AgentOrb';

const AIHomeScreen = ({ navigation }: { navigation: any }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  // AI agents data
  const agents = [
    {
      id: 'nebula',
      name: 'Nebula',
      color: '#6B46C1',
      description: 'Financial Strategy & Insights',
      specialty: 'Investment analysis and wealth building'
    },
    {
      id: 'atlas',
      name: 'Atlas',
      color: '#2563EB',
      description: 'Budget Management & Planning',
      specialty: 'Expense tracking and financial planning'
    },
    {
      id: 'nova',
      name: 'Nova',
      color: '#DC2626',
      description: 'Spending Patterns & Habits',
      specialty: 'Behavioral analysis and recommendations'
    },
    {
      id: 'sentinel',
      name: 'Sentinel',
      color: '#059669',
      description: 'Security & Fraud Detection',
      specialty: 'Transaction security and anomaly detection'
    }
  ];

  // Animation sequence
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAgentSelect = (agentId: string) => {
    setIsAnimating(true);
    setSelectedAgent(agentId);

    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        // Navigate to agent chat
        navigation.navigate('AgentChat', { agentId });
        setIsAnimating(false);
        setSelectedAgent(null);
      }, 500);
    });
  };

  const handleViewDashboard = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      {/* Animated background */}
      <Animated.View
        style={[
          styles.animatedBackground,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>ReBank AI</Text>
            <Text style={styles.subtitle}>Your Intelligent Financial Companion</Text>
          </View>

          {/* Agent Constellation */}
          <View style={styles.constellationContainer}>
            <Text style={styles.sectionTitle}>Choose Your AI Assistant</Text>
            <View style={styles.agentsGrid}>
              {agents.map((agent, index) => (
                <TouchableOpacity
                  key={agent.id}
                  style={styles.agentWrapper}
                  onPress={() => handleAgentSelect(agent.id)}
                  activeOpacity={0.8}
                >
                  <AgentOrb
                    name={agent.name}
                    color={agent.color}
                    isActive={selectedAgent === agent.id}
                    isSpeaking={selectedAgent === agent.id}
                  />
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentDescription}>{agent.description}</Text>
                    <Text style={styles.agentSpecialty}>{agent.specialty}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleViewDashboard}
            >
              <Text style={styles.primaryButtonText}>📊 View Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Text style={styles.secondaryButtonText}>📈 View Analytics</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Powered by Advanced AI</Text>
            <Text style={styles.footerSubtext}>Real-time financial insights</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 768 ? 40 : 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: height > 768 ? 60 : 40,
  },
  welcomeText: {
    fontSize: width > 768 ? 24 : 20,
    color: '#94A3B8',
    fontWeight: '400',
    marginBottom: 8,
  },
  title: {
    fontSize: width > 768 ? 48 : 36,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: '#CBD5E1',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: width > 768 ? 400 : 300,
  },
  constellationContainer: {
    alignItems: 'center',
    marginBottom: height > 768 ? 60 : 40,
  },
  sectionTitle: {
    fontSize: width > 768 ? 24 : 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 30,
    textAlign: 'center',
  },
  agentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: width > 768 ? 30 : 20,
    maxWidth: width > 768 ? 800 : 350,
  },
  agentWrapper: {
    alignItems: 'center',
    width: width > 768 ? 180 : 150,
    marginBottom: 15,
  },
  agentInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  agentName: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: width > 768 ? 14 : 12,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 4,
  },
  agentSpecialty: {
    fontSize: width > 768 ? 12 : 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 15,
    marginBottom: height > 768 ? 60 : 40,
  },
  actionButton: {
    width: width > 768 ? 280 : 250,
    height: width > 768 ? 56 : 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButton: {
    backgroundColor: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  secondaryButtonText: {
    color: '#CBD5E1',
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: width > 768 ? 16 : 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: width > 768 ? 14 : 12,
    color: '#475569',
    fontWeight: '500',
  },
});

export default AIHomeScreen;