import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import LinearGradient from '../components/LinearGradientWrapper';
import { useAuthStore } from '../stores/authStore';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginScreen = () => {
  const responsive = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const { login, isLoading, isAuthenticated, error, clearError } = useAuthStore();

  // Handle auth store errors
  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
      clearError();
    }
  }, [error, clearError]);

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    // Basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }

    // Password validation
    if (formData.password.length < 6) {
      Alert.alert('Password Error', 'Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called with:', formData);
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    try {
      console.log('Attempting login...');
      // Call auth store login function
      await login(formData.email, formData.password);
      console.log('Login completed');

      // Navigation will happen automatically via App.tsx based on auth state

    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const starDots = React.useMemo(
    () => (
      [
        { top: '6%' as const, left: '20%' as const, size: 3, opacity: 0.7 },
        { top: '14%' as const, right: '18%' as const, size: 2, opacity: 0.55 },
        { top: '32%' as const, left: '28%' as const, size: 2, opacity: 0.6 },
        { top: '40%' as const, right: '24%' as const, size: 3, opacity: 0.65 },
        { bottom: '38%' as const, left: '16%' as const, size: 2, opacity: 0.5 },
        { bottom: '28%' as const, right: '30%' as const, size: 2, opacity: 0.55 },
        { bottom: '16%' as const, left: '24%' as const, size: 3, opacity: 0.6 },
        { top: '22%' as const, right: '48%' as const, size: 2, opacity: 0.5 },
      ]
    ),
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#070B16', '#101623', '#1b2536']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.celestialBackdrop}>
          {starDots.map((dot, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={`login-star-${index}`}
              style={[
                styles.starDot,
                {
                  top: dot.top,
                  bottom: dot.bottom,
                  left: dot.left,
                  right: dot.right,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  opacity: dot.opacity,
                },
              ]}
            />
          ))}
          <LinearGradient
            colors={['rgba(79, 70, 229, 0.2)', 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.mist}
          />
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, responsive.isDesktop && styles.scrollContentDesktop]}>
          <View style={styles.logoSection}>
            <Text style={[styles.logoText, responsive.isDesktop && styles.logoTextDesktop]}>ReBank</Text>
            <Text style={[styles.tagline, responsive.isDesktop && styles.taglineDesktop]}>Banking Reimagined</Text>
          </View>

          <View style={[styles.formSection, responsive.isDesktop && styles.formSectionDesktop]}>
            <Text style={styles.title}>
              Welcome Back, Voyager
            </Text>
            <Text style={styles.subtitle}>Log in to let Gemini pick up where you left off.</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={() => {
                console.log('Button clicked!');
                handleSubmit();
              }}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Please wait...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.toggleButtonText}>
                Need an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  celestialBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  starDot: {
    position: 'absolute',
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#e0f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 4,
  },
  mist: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: '50%',
    opacity: 0.4,
  },
  glowOne: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    opacity: 0.4,
    shadowColor: 'rgba(56, 189, 248, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 12,
  },
  glowTwo: {
    position: 'absolute',
    bottom: '14%',
    right: '16%',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    opacity: 0.35,
    shadowColor: 'rgba(99, 102, 241, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e0f2fe',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(191, 219, 254, 0.75)',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(8, 11, 19, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#e2e8f0',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  submitButton: {
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#60a5fa',
    fontSize: 14,
  },

  // Responsive styles
  scrollContentDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoTextDesktop: {
    fontSize: 64,
  },
  taglineDesktop: {
    fontSize: 24,
  },
  formSectionDesktop: {
    width: 400,
    maxWidth: '90%',
  },
});

export default LoginScreen;
