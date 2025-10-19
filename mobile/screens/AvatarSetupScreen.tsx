import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const AvatarSetupScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // This screen is kept for backward compatibility. We now run the
    // registration flow directly so redirect users instantly.
    const timeout = setTimeout(() => {
      navigation.replace('Register');
    }, 100);

    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0066CC', '#004499']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>Redirecting…</Text>
          <Text style={styles.subtitle}>
            Avatar setup now happens as part of registration. Taking you there now.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default AvatarSetupScreen;
