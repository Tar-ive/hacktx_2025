/**
 * Voice Activation Button component with animated microphone and recording indicator.
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface VoiceActivationButtonProps {
  isRecording: boolean;
  isPreparing: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  recordingDuration?: number;
}

export const VoiceActivationButton: React.FC<VoiceActivationButtonProps> = ({
  isRecording,
  isPreparing,
  onPress,
  disabled = false,
  size = 80,
  recordingDuration = 0,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulsing animation for recording indicator
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();

      return () => {
        pulse.stop();
        pulseAnim.setValue(0);
      };
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    if (isPreparing) {
      // Rotating animation for preparing state
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      rotate.start();

      return () => {
        rotate.stop();
        rotateAnim.setValue(0);
      };
    }
  }, [isPreparing, rotateAnim]);

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isPreparing}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Pulse ring for recording state */}
          {isRecording && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  width: size * 1.4,
                  height: size * 1.4,
                  borderRadius: (size * 1.4) / 2,
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                },
              ]}
            />
          )}

          {/* Main button */}
          <Animated.View
            style={[
              styles.button,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: isPreparing ? [{ rotate: rotation }] : [],
              },
            ]}
          >
            <LinearGradient
              colors={
                isRecording
                  ? ['#EF4444', '#DC2626']
                  : isPreparing
                  ? ['#F59E0B', '#D97706']
                  : disabled
                  ? ['#6B7280', '#4B5563']
                  : ['#3B82F6', '#2563EB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradient, { borderRadius: size / 2 }]}
            >
              <View style={styles.iconContainer}>
                {isPreparing ? (
                  <Text style={[styles.icon, { fontSize: size * 0.4 }]}>⏳</Text>
                ) : isRecording ? (
                  <View
                    style={[
                      styles.recordingDot,
                      { width: size * 0.3, height: size * 0.3 },
                    ]}
                  />
                ) : (
                  <Text style={[styles.icon, { fontSize: size * 0.5 }]}>🎤</Text>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      {/* Status text */}
      <View style={styles.statusContainer}>
        {isRecording && (
          <>
            <Text style={styles.statusText}>Recording...</Text>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </>
        )}
        {isPreparing && <Text style={styles.statusText}>Preparing...</Text>}
        {!isRecording && !isPreparing && (
          <Text style={styles.statusText}>Tap to speak</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
  },
  recordingDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  statusContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
});
