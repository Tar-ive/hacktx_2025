import React, { useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type GeminiMode = 'idle' | 'listening' | 'processing' | 'speaking';
export type GeminiAgentId = 'default' | 'nebula' | 'atlas' | 'sentinel' | 'nova';

export interface GeminiAssistantProps {
  mode: GeminiMode;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  label?: string;
  subLabel?: string;
  agent?: GeminiAgentId | null;
}

const MODE_LABELS: Record<GeminiMode, string> = {
  idle: 'Tap to talk to Gemini',
  listening: 'Listening...',
  processing: 'Analyzing your request...',
  speaking: 'Responding...'
};

const MODE_SUBLABELS: Record<GeminiMode, string> = {
  idle: 'Gemini routes you to the right specialist as needed',
  listening: 'Say anything about your finances',
  processing: 'Finding the best agent and context',
  speaking: 'Gemini is speaking back to you'
};

interface GeminiPalette {
  gradients: Record<GeminiMode, [string, string]>;
  haloBorder: string;
  haloFill: string;
  pulse: string;
  ray: string;
  sparkle: string;
  text: string;
  coreStroke: string;
  coreHighlight: string;
  accent: string;
}

const BASE_PALETTES: Record<GeminiAgentId, GeminiPalette> = {
  default: {
    gradients: {
      idle: ['#6366f1', '#312e81'],
      listening: ['#a855f7', '#ec4899'],
      processing: ['#38bdf8', '#6366f1'],
      speaking: ['#22d3ee', '#38bdf8']
    },
    haloBorder: 'rgba(165, 180, 252, 0.9)',
    haloFill: 'rgba(199, 210, 254, 0.35)',
    pulse: 'rgba(147, 197, 253, 0.45)',
    ray: 'rgba(255, 255, 255, 0.15)',
    sparkle: '#e0f2fe',
    text: '#f8fafc',
    coreStroke: 'rgba(148, 163, 246, 0.65)',
    coreHighlight: 'rgba(255, 255, 255, 0.35)',
    accent: '#60a5fa'
  },
  nebula: {
    gradients: {
      idle: ['#7c3aed', '#312e81'],
      listening: ['#c084fc', '#7c3aed'],
      processing: ['#818cf8', '#4c1d95'],
      speaking: ['#a855f7', '#6366f1']
    },
    haloBorder: 'rgba(216, 180, 254, 0.8)',
    haloFill: 'rgba(233, 213, 255, 0.25)',
    pulse: 'rgba(196, 181, 253, 0.4)',
    ray: 'rgba(216, 180, 254, 0.25)',
    sparkle: '#f5d0fe',
    text: '#faf5ff',
    coreStroke: 'rgba(221, 214, 254, 0.6)',
    coreHighlight: 'rgba(255, 255, 255, 0.3)',
    accent: '#c084fc'
  },
  atlas: {
    gradients: {
      idle: ['#2563eb', '#0f172a'],
      listening: ['#38bdf8', '#1d4ed8'],
      processing: ['#60a5fa', '#1e40af'],
      speaking: ['#3b82f6', '#1d4ed8']
    },
    haloBorder: 'rgba(96, 165, 250, 0.85)',
    haloFill: 'rgba(59, 130, 246, 0.18)',
    pulse: 'rgba(125, 211, 252, 0.35)',
    ray: 'rgba(191, 219, 254, 0.25)',
    sparkle: '#bfdbfe',
    text: '#f5fbff',
    coreStroke: 'rgba(147, 197, 253, 0.6)',
    coreHighlight: 'rgba(226, 232, 240, 0.28)',
    accent: '#38bdf8'
  },
  sentinel: {
    gradients: {
      idle: ['#0f766e', '#082f49'],
      listening: ['#14b8a6', '#0f766e'],
      processing: ['#2dd4bf', '#0d9488'],
      speaking: ['#22d3ee', '#0ea5e9']
    },
    haloBorder: 'rgba(45, 212, 191, 0.7)',
    haloFill: 'rgba(20, 184, 166, 0.22)',
    pulse: 'rgba(103, 232, 249, 0.3)',
    ray: 'rgba(125, 211, 252, 0.2)',
    sparkle: '#ccfbf1',
    text: '#ecfeff',
    coreStroke: 'rgba(94, 234, 212, 0.55)',
    coreHighlight: 'rgba(224, 255, 255, 0.25)',
    accent: '#2dd4bf'
  },
  nova: {
    gradients: {
      idle: ['#ef4444', '#7f1d1d'],
      listening: ['#f97316', '#b91c1c'],
      processing: ['#fb7185', '#be123c'],
      speaking: ['#fbbf24', '#ea580c']
    },
    haloBorder: 'rgba(248, 113, 113, 0.75)',
    haloFill: 'rgba(254, 215, 170, 0.22)',
    pulse: 'rgba(253, 164, 175, 0.35)',
    ray: 'rgba(254, 226, 226, 0.25)',
    sparkle: '#ffe4e6',
    text: '#fff7ed',
    coreStroke: 'rgba(252, 165, 165, 0.6)',
    coreHighlight: 'rgba(255, 237, 213, 0.35)',
    accent: '#fb7185'
  },
};

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({
  mode,
  onPress,
  disabled = false,
  size = 180,
  label,
  subLabel,
  agent = 'default',
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Start/stop pulsing animation when listening or speaking
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (mode === 'listening' || mode === 'speaking') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 900,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }

    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
    };
  }, [mode, pulseAnim]);

  // Halo shimmer when idle to keep it alive
  useEffect(() => {
    let haloLoop: Animated.CompositeAnimation | null = null;
    haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    haloLoop.start();

    return () => {
      if (haloLoop) {
        haloLoop.stop();
      }
    };
  }, [haloAnim]);

  // Rotation when processing to indicate thinking
  useEffect(() => {
    let rotateLoop: Animated.CompositeAnimation | null = null;

    if (mode === 'processing') {
      rotateLoop = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.start();
    } else {
      rotationAnim.stopAnimation();
      rotationAnim.setValue(0);
    }

    return () => {
      if (rotateLoop) {
        rotateLoop.stop();
      }
    };
  }, [mode, rotationAnim]);

  const palette = useMemo(() => BASE_PALETTES[agent ?? 'default'], [agent]);
  const gradientColors = useMemo(() => palette.gradients[mode], [palette, mode]);
  const computedLabel = label ?? MODE_LABELS[mode];
  const computedSubLabel = subLabel ?? MODE_SUBLABELS[mode];

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const haloOpacity = haloAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerSize = size * 0.55;
  const orbitSize = size * 0.9;
  const constellationNodes = useMemo(
    () => [
      { top: size * 0.1, left: size * 0.2 },
      { top: size * 0.18, right: size * 0.12 },
      { bottom: size * 0.15, left: size * 0.18 },
      { bottom: size * 0.1, right: size * 0.2 },
    ],
    [size],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={styles.wrapper}
    >
      <View style={[styles.container, { width: size, height: size }]}>
        <Animated.View
          style={[
            styles.haloContainer,
            {
              width: orbitSize,
              height: orbitSize,
              borderRadius: orbitSize / 2,
              opacity: haloOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={[palette.haloFill, 'transparent']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={StyleSheet.flatten([
              styles.haloGradient,
              {
                borderRadius: orbitSize / 2,
                borderColor: palette.haloBorder,
              },
            ])}
          />
        </Animated.View>

        {(mode === 'listening' || mode === 'speaking') && (
          <Animated.View
            style={[
              styles.pulse,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
                backgroundColor: palette.pulse,
              },
            ]}
          />
        )}

        <Animated.View
          style={[styles.starWrapper, { transform: [{ rotate: rotation }] }]}
        >
          <View style={[styles.ray, styles.rayVertical, { height: size * 0.9, backgroundColor: palette.ray }]} />
          <View style={[styles.ray, styles.rayHorizontal, { width: size * 0.9, backgroundColor: palette.ray }]} />
          <View
            style={[
              styles.ray,
              styles.rayDiagonal,
              {
                transform: [{ rotate: '45deg' }],
                width: size * 0.9,
                backgroundColor: palette.ray,
              },
            ]}
          />
          <View
            style={[
              styles.ray,
              styles.rayDiagonal,
              {
                transform: [{ rotate: '-45deg' }],
                width: size * 0.9,
                backgroundColor: palette.ray,
              },
            ]}
          />
        </Animated.View>

        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.core,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              borderColor: palette.coreStroke,
            },
          ]}
        >
          <View
            style={[
              styles.coreGlow,
              {
                borderRadius: (innerSize - 24) / 2,
                backgroundColor: palette.coreHighlight,
              },
            ]}
          />
          <View
            style={[
              styles.coreHighlight,
              {
                borderRadius: innerSize / 2,
                borderColor: palette.coreStroke,
              },
            ]}
          />
          <Text style={[styles.coreText, { color: palette.text }]}>Gemini</Text>
        </LinearGradient>

        <View style={styles.sparklesContainer}>
          <Animated.View
            style={[
              styles.sparkle,
              { top: size * 0.2, left: size * 0.15, opacity: haloOpacity, backgroundColor: palette.sparkle },
            ]}
          />
          <Animated.View
            style={[
              styles.sparkle,
              { top: size * 0.15, right: size * 0.2, opacity: haloOpacity, backgroundColor: palette.sparkle },
            ]}
          />
          <Animated.View
            style={[
              styles.sparkle,
              { bottom: size * 0.2, left: size * 0.3, opacity: haloOpacity, backgroundColor: palette.sparkle },
            ]}
          />
          <Animated.View
            style={[
              styles.sparkle,
              { bottom: size * 0.18, right: size * 0.25, opacity: haloOpacity, backgroundColor: palette.sparkle },
            ]}
          />
        </View>

        <View style={styles.constellationContainer}>
          {constellationNodes.map((node, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={`constellation-${index}`}
              style={[
                styles.constellationNode,
                node,
                { backgroundColor: palette.accent },
              ]}
            />
          ))}
          <View
            style={[
              styles.constellationArc,
              {
                borderColor: palette.accent,
                width: orbitSize * 0.85,
                height: orbitSize * 0.85,
                borderRadius: (orbitSize * 0.85) / 2,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: palette.text }]}>{computedLabel}</Text>
        <Text style={styles.subLabel}>{computedSubLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  haloContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  haloGradient: {
    flex: 1,
    borderWidth: 1.5,
    opacity: 0.8,
  },
  pulse: {
    position: 'absolute',
    backgroundColor: 'rgba(147, 197, 253, 0.4)',
  },
  starWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ray: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
  },
  rayVertical: {
    width: 6,
  },
  rayHorizontal: {
    height: 6,
  },
  rayDiagonal: {
    height: 6,
  },
  core: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  coreGlow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
  },
  coreHighlight: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    opacity: 0.5,
  },
  coreText: {
    color: '#f8fafc',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 20,
  },
  sparklesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 20,
    color: '#e2e8f0',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.82)',
    textAlign: 'center',
  },
  constellationContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  constellationNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  constellationArc: {
    position: 'absolute',
    top: '7%',
    left: '7%',
    borderWidth: 0.6,
    opacity: 0.25,
  },
});

export default GeminiAssistant;
