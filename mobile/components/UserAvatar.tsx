import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import LinearGradient from './LinearGradientWrapper';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarStyle: 'minimal' | 'futuristic';
  primaryColor: string;
  secondaryColor: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showLabel?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  avatarStyle,
  primaryColor,
  secondaryColor,
  size = 'medium',
  onPress,
  showLabel = true
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const getInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getSize = () => {
    switch (size) {
      case 'small': return 50;
      case 'large': return 90;
      default: return 70;
    }
  };

  const avatarSize = getSize();

  React.useEffect(() => {
    if (onPress) {
      // Subtle hover animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [onPress, scaleValue]);

  const animatedStyle = {
    transform: [{ scale: scaleValue }],
  };

  const renderMinimalAvatar = () => (
    <View style={[
      styles.minimalAvatar,
      {
        width: avatarSize,
        height: avatarSize,
        backgroundColor: primaryColor
      }
    ]}>
      <Text style={[styles.initials, { fontSize: avatarSize * 0.4 }]}>
        {getInitials()}
      </Text>
    </View>
  );

  const renderFuturisticAvatar = () => (
    <LinearGradient
      colors={[primaryColor, secondaryColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.futuristicAvatar,
        { width: avatarSize, height: avatarSize }
      ]}
    >
      <View style={styles.futuristicInner}>
        <Text style={[styles.initials, {
          fontSize: avatarSize * 0.35,
          color: '#ffffff',
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2
        }]}>
          {getInitials()}
        </Text>
      </View>
      {/* Cosmic particles effect */}
      <View style={[styles.cosmicParticle, { top: '20%', left: '20%' }]} />
      <View style={[styles.cosmicParticle, { top: '70%', left: '80%' }]} />
      <View style={[styles.cosmicParticle, { top: '40%', left: '60%' }]} />
    </LinearGradient>
  );

  return (
    <TouchableOpacity
      style={[styles.container, onPress && styles.pressable]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Animated.View style={[styles.avatarWrapper, animatedStyle]}>
        {avatarStyle === 'minimal' ? renderMinimalAvatar() : renderFuturisticAvatar()}
      </Animated.View>
      {showLabel && (
        <Text style={styles.nameLabel}>
          {firstName} {lastName}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    cursor: 'pointer',
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  minimalAvatar: {
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  futuristicAvatar: {
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  futuristicInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
    height: '90%',
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
    color: '#ffffff',
  },
  nameLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  cosmicParticle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
});

export default UserAvatar;