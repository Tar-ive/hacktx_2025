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
import GeminiAssistant, { GeminiMode } from '../components/GeminiAssistant';
import UserAvatar from '../components/UserAvatar';
import { useAuthStore } from '../stores/authStore';

const AIHomeScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuthStore();
  const [geminiMode, setGeminiMode] = useState<GeminiMode>('idle');
  const [isRouting, setIsRouting] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const transitionTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const specialists = [
    {
      id: 'nebula',
      name: 'Nebula',
      role: 'Spending Coach',
      focus: 'Budgets, groceries, daily cashflow'
    },
    {
      id: 'atlas',
      name: 'Atlas',
      role: 'Investment Advisor',
      focus: 'Retirement, portfolio, savings rate'
    },
    {
      id: 'sentinel',
      name: 'Sentinel',
      role: 'Security Monitor',
      focus: 'Fraud alerts and unusual activity'
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

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
    };
  }, []);

  const handleGeminiPress = () => {
    if (isRouting) {
      return;
    }

    setIsRouting(true);
    setGeminiMode('listening');

    transitionTimeout.current = setTimeout(() => {
      navigation.navigate('VoiceConversation');
      setGeminiMode('idle');
      setIsRouting(false);
    }, 400);
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

            {/* User Avatar Section */}
            {user && user.avatarStyle && (
              <View style={styles.userAvatarSection}>
                <UserAvatar
                  firstName={user.firstName || user.name.split(' ')[0]}
                  lastName={user.lastName || user.name.split(' ').slice(1).join(' ') || ''}
                  avatarStyle={user.avatarStyle}
                  primaryColor={user.primaryColor || '#667eea'}
                  secondaryColor={user.secondaryColor || '#764ba2'}
                  size="medium"
                  showLabel={true}
                />
                {user.capitalOneData && (
                  <Text style={styles.capitalOneBadge}>✨ Capital One Connected</Text>
                )}
              </View>
            )}
          </View>

          {/* Gemini Voice Assistant */}
          <View style={styles.geminiSection}>
            <GeminiAssistant
              mode={geminiMode}
              onPress={handleGeminiPress}
              label={
                geminiMode === 'idle'
                  ? 'Gemini is your voice-first greeter'
                  : undefined
              }
              subLabel={
                geminiMode === 'idle'
                  ? 'Tap once and start speaking—Gemini handles STT and routing'
                  : undefined
              }
            />
            <View style={styles.geminiHintCard}>
              <Text style={styles.geminiHintTitle}>How it works</Text>
              <Text style={styles.geminiHintText}>
                Gemini greets you, listens in real time, then sends the right requests to
                specialist agents like Nebula or Atlas. Responses flow back as voice and text.
              </Text>
            </View>
          </View>

          <View style={styles.specialistsContainer}>
            <Text style={styles.sectionTitle}>Specialists Gemini Can Call</Text>
            <View style={styles.specialistsGrid}>
              {specialists.map((specialist) => (
                <View key={specialist.id} style={styles.specialistCard}>
                  <Text style={styles.specialistName}>{specialist.name}</Text>
                  <Text style={styles.specialistRole}>{specialist.role}</Text>
                  <Text style={styles.specialistFocus}>{specialist.focus}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => navigation.navigate('VoiceConversation')}
            >
              <Text style={styles.primaryButtonText}>🎤 Start Voice Chat</Text>
            </TouchableOpacity>

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
  userAvatarSection: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  capitalOneBadge: {
    marginTop: 10,
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
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
    // textShadow: '0 2px 4px rgba(59, 130, 246, 0.5)',
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: '#CBD5E1',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: width > 768 ? 400 : 300,
  },
  geminiSection: {
    alignItems: 'center',
    marginBottom: height > 768 ? 70 : 50,
  },
  sectionTitle: {
    fontSize: width > 768 ? 24 : 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 30,
    textAlign: 'center',
  },
  geminiHintCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    maxWidth: width > 768 ? 420 : 340,
  },
  geminiHintTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  geminiHintText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    textAlign: 'center',
  },
  specialistsContainer: {
    alignItems: 'center',
    marginBottom: height > 768 ? 60 : 45,
  },
  specialistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: width > 768 ? 18 : 12,
    maxWidth: width > 768 ? 640 : 320,
  },
  specialistCard: {
    width: width > 768 ? 190 : 150,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  specialistName: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  specialistRole: {
    fontSize: 13,
    color: '#cbd5f5',
    textAlign: 'center',
    marginBottom: 4,
  },
  specialistFocus: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
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
