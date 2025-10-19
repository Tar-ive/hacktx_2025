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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0066CC', '#004499']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, responsive.isDesktop && styles.scrollContentDesktop]}>
          <View style={styles.logoSection}>
            <Text style={[styles.logoText, responsive.isDesktop && styles.logoTextDesktop]}>ReBank</Text>
            <Text style={[styles.tagline, responsive.isDesktop && styles.taglineDesktop]}>Banking Reimagined</Text>
          </View>

          <View style={[styles.formSection, responsive.isDesktop && styles.formSectionDesktop]}>
            <Text style={styles.title}>
              Welcome Back
            </Text>

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

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              Demo Mode: Any email/password combination will work
            </Text>
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
    color: '#fff',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#B3D1FF',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    height: 50,
    backgroundColor: '#0066CC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
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
    color: '#0066CC',
    fontSize: 14,
  },
  demoNotice: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    alignItems: 'center',
  },
  demoNoticeText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
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