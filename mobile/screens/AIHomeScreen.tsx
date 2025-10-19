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
      role: 'Spending Constellation Guide',
      focus: 'Keeps budgets balanced and cravings in check',
      vibe: '“I orbit your purchases and spot the drift before it hurts.”',
      accent: ['#c084fc', '#7c3aed']
    },
    {
      id: 'atlas',
      name: 'Atlas',
      role: 'Wealth Navigator',
      focus: 'Maps retirement arcs and portfolio maneuvers',
      vibe: '“Point me at a goal and I’ll bend compounding gravity toward it.”',
      accent: ['#38bdf8', '#1d4ed8']
    },
    {
      id: 'sentinel',
      name: 'Sentinel',
      role: 'Signal Guardian',
      focus: 'Scans for anomalies, locks down fraud fast',
      vibe: '“If it flickers weird on radar, I’m already on it.”',
      accent: ['#2dd4bf', '#0f766e']
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

  const starDots = React.useMemo(
    () => (
      [
        { top: '8%' as const, left: '18%' as const, size: 5, opacity: 0.8 },
        { top: '12%' as const, right: '14%' as const, size: 4, opacity: 0.65 },
        { top: '28%' as const, left: '32%' as const, size: 4, opacity: 0.75 },
        { top: '34%' as const, right: '22%' as const, size: 6, opacity: 0.7 },
        { top: '48%' as const, left: '12%' as const, size: 4, opacity: 0.8 },
        { top: '56%' as const, right: '18%' as const, size: 3, opacity: 0.6 },
        { bottom: '24%' as const, left: '28%' as const, size: 5, opacity: 0.7 },
        { bottom: '18%' as const, right: '26%' as const, size: 4, opacity: 0.75 },
        { bottom: '8%' as const, left: '14%' as const, size: 3, opacity: 0.65 },
        { top: '20%' as const, right: '45%' as const, size: 4, opacity: 0.6 },
      ]
    ),
    []
  );

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
        <View style={styles.celestialOverlay}>
          <LinearGradient
            colors={['rgba(148, 163, 184, 0.15)', 'transparent']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.mistLayer}
          />
          {starDots.map((dot, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={`star-dot-${index}`}
              style={[
                styles.starDot,
                {
                  top: dot.top,
                  bottom: dot.bottom,
                  left: dot.left,
                  right: dot.right,
                  opacity: dot.opacity,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                },
              ]}
            />
          ))}
          <View style={[styles.starGlow, { top: height * 0.18, left: width * 0.15 }]} />
          <View style={[styles.starGlow, { bottom: height * 0.22, right: width * 0.18 }]} />
        </View>
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

            {/* User Avatar Section */}
            {user && user.avatarStyle && (
              <View style={styles.userAvatarSection}>
                <UserAvatar
                  firstName={user.firstName || user.name.split(' ')[0]}
                  lastName={user.lastName || user.name.split(' ').slice(1).join(' ') || ''}
                  avatarStyle={user.avatarStyle}
                  primaryColor={user.primaryColor || '#667eea'}
                  secondaryColor={user.secondaryColor || '#764ba2'}
                  size="small"
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
                  ? 'Tap once to start talking!'
                  : undefined
              }
              size={width > 768 ? 260 : 230}
            />
            <View style={styles.geminiHintCard}>
              <Text style={styles.geminiHintText}>
                Gemini greets you, listens in real time, then sends the right requests to
                specialist agents like Nebula or Atlas. Responses flow back as voice and text.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={[styles.actionButtonHalf, styles.primaryButton]}
                onPress={handleViewDashboard}
              >
                <Text style={styles.primaryButtonText}>📊 Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButtonHalf, styles.secondaryButton]}
                onPress={() => navigation.navigate('Analytics')}
              >
                <Text style={styles.secondaryButtonText}>📈 Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.specialistsContainer}>
            <Text style={styles.sectionTitle}>Gemini’s Specialist Crew</Text>
            <Text style={styles.sectionSubtitle}>Each one is on-call the moment Gemini hears their territory.</Text>
            <View style={styles.specialistsGrid}>
              {specialists.map((specialist) => (
                <LinearGradient
                  key={specialist.id}
                  colors={['rgba(192, 132, 252, 0.15)', 'rgba(45, 212, 191, 0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.specialistGradient}
                >
                  <View style={styles.specialistCard}>
                    <Text style={styles.specialistName}>{specialist.name}</Text>
                    <Text style={styles.specialistRole}>{specialist.role}</Text>
                    <Text style={styles.specialistFocus}>{specialist.focus}</Text>
                    <Text style={styles.specialistVibe}>{specialist.vibe}</Text>
                  </View>
                </LinearGradient>
              ))}
            </View>
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
    marginBottom: height > 768 ? 40 : 25,
  },
  userAvatarSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
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
    marginBottom: height > 768 ? 45 : 30,
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
    marginBottom: height > 768 ? 50 : 36,
    paddingHorizontal: 12,
  },
  specialistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: width > 768 ? 18 : 14,
    maxWidth: width > 768 ? 680 : 360,
  },
  specialistGradient: {
    borderRadius: 18,
    width: width > 768 ? 210 : 170,
  },
  specialistCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
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
    marginBottom: 8,
  },
  specialistVibe: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.85)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: height > 768 ? 48 : 28,
    width: '100%',
  },
  actionButton: {
    width: width > 768 ? 260 : 230,
    height: width > 768 ? 58 : 50,
    borderRadius: 17,
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
  actionButtonHalf: {
    flex: 1,
    height: width > 768 ? 54 : 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: width > 768 ? 520 : 340,
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
    backgroundColor: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
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
  celestialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  mistLayer: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.1,
    width: width * 1.4,
    height: height * 1.2,
    opacity: 0.3,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#e2e8f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  starGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    opacity: 0.4,
    shadowColor: 'rgba(14, 165, 233, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  sectionSubtitle: {
    fontSize: width > 768 ? 14 : 12,
    color: 'rgba(203, 213, 225, 0.75)',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: width > 768 ? 460 : 320,
  },
});

export default AIHomeScreen;
