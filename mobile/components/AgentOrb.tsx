import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';

interface AgentOrbProps {
  name: string;
  color: string;
  isActive?: boolean;
  isSpeaking?: boolean;
  onPress?: () => void;
}

const AgentOrb: React.FC<AgentOrbProps> = ({
  name,
  color,
  isActive = false,
  isSpeaking = false,
  onPress
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isSpeaking) {
      // Pulsing animation when speaking
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleValue.setValue(1);
    }
  }, [isSpeaking, scaleValue]);

  const animatedStyle = {
    transform: [{ scale: scaleValue }],
  };

  return (
    <TouchableOpacity
      style={[
        styles.orbContainer,
        isActive && styles.orbContainerActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: color },
          animatedStyle,
          isSpeaking && styles.orbSpeaking,
        ]}
      >
        {isSpeaking && (
          <View style={styles.waveformContainer}>
            <View style={styles.waveformBar} />
            <View style={styles.waveformBar} />
            <View style={styles.waveformBar} />
          </View>
        )}
      </Animated.View>
      <Text style={styles.agentName}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orbContainer: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  orbContainerActive: {
    transform: [{ scale: 1.1 }],
  },
  orb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  orbSpeaking: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveformBar: {
    width: 2,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  agentName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});

export default AgentOrb;