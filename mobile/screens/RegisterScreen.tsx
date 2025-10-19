import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from '../components/LinearGradientWrapper';
import UserAvatar from '../components/UserAvatar';
import { useAuthStore } from '../stores/authStore';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  zip: string;
}

const COSMIC_COLORS = [
  { primary: '#667eea', secondary: '#764ba2', name: 'Cosmic Purple' },
  { primary: '#f093fb', secondary: '#f5576c', name: 'Pink Galaxy' },
  { primary: '#4facfe', secondary: '#00f2fe', name: 'Blue Nebula' },
  { primary: '#43e97b', secondary: '#38f9d7', name: 'Green Aurora' },
  { primary: '#fa709a', secondary: '#fee140', name: 'Sunset Dream' },
  { primary: '#30cfd0', secondary: '#330867', name: 'Deep Space' },
  { primary: '#a8edea', secondary: '#fed6e3', name: 'Cosmic Cloud' },
  { primary: '#ff9a9e', secondary: '#fecfef', name: 'Pink Mist' },
];

const RegisterScreen = () => {
  const responsive = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    zip: '',
  });

  const [avatarStyle, setAvatarStyle] = useState<'minimal' | 'futuristic'>('futuristic');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [step, setStep] = useState(1); // 1: Account info, 2: Avatar setup
  const [isCheckingCapitalOne, setIsCheckingCapitalOne] = useState(false);
  const [capitalOneMatch, setCapitalOneMatch] = useState(false);
  const [capitalOneMatchData, setCapitalOneMatchData] = useState<any>(null);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [matchReason, setMatchReason] = useState<string | null>(null);

  const selectedColors = COSMIC_COLORS[selectedColorIndex];

  // Handle auth store errors
  useEffect(() => {
    if (error) {
      Alert.alert('Registration Error', error);
      clearError();
    }
  }, [error, clearError]);

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateAccountInfo = (): boolean => {
    // Email validation
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

    // Name validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Missing Information', 'Please enter your first and last name');
      return false;
    }

    return true;
  };

  const validateAvatarSetup = (): boolean => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.zip.trim()) {
      Alert.alert('Missing Information', 'Please fill in all personal details.');
      return false;
    }

    if (formData.zip.length !== 5 || !/^\d+$/.test(formData.zip)) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code.');
      return false;
    }

    return true;
  };

  const handleAccountInfoSubmit = () => {
    if (!validateAccountInfo()) return;
    setStep(2);
  };

  const checkCapitalOneAccount = async () => {
    if (!formData.firstName || !formData.lastName || !formData.zip) {
      Alert.alert('Missing Information', 'Please fill in your personal details to check for Capital One account matching.');
      return;
    }

    setIsCheckingCapitalOne(true);

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/v1/auth/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          zip_code: formData.zip,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const matchData = await response.json();

      if (matchData.matched && matchData.customer) {
        setCapitalOneMatchData(matchData.customer);
        setCapitalOneMatch(true);
        setMatchConfidence(typeof matchData.confidence === 'number' ? matchData.confidence : null);
        setMatchReason(matchData.match_reason || null);
        Alert.alert(
          'Account Found! ✨',
          `We found a matching Capital One account with ${matchData.customer.accounts?.length || 0} accounts.`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        setCapitalOneMatch(false);
        setCapitalOneMatchData(null);
        setMatchConfidence(typeof matchData.confidence === 'number' ? matchData.confidence : null);
        setMatchReason(matchData.match_reason || null);
        Alert.alert(
          'No Account Found',
          'We couldn\'t find a matching Capital One account with the provided information. You can still proceed with manual setup.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error checking Capital One account:', error);
      Alert.alert('Error', 'Unable to check for Capital One account at this time.');
    } finally {
      setIsCheckingCapitalOne(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!validateAvatarSetup()) {
      return;
    }

    const success = await registerUser({
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      zip: formData.zip.trim(),
      preferences: {
        avatarStyle,
        primaryColor: selectedColors.primary,
        secondaryColor: selectedColors.secondary,
      },
    });

    if (success) {
      Alert.alert(
        'Registration Complete! 🎉',
        'Your account has been created successfully.',
        [
          {
            text: 'Continue to Dashboard',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'AIHome' }],
              });
            },
          },
        ]
      );
    }
  };

  const renderAccountInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepSubtitle}>Get started with your personalized banking experience</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#999"
          value={formData.firstName}
          onChangeText={(text) => handleInputChange('firstName', text)}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#999"
          value={formData.lastName}
          onChangeText={(text) => handleInputChange('lastName', text)}
          editable={!isLoading}
        />
      </View>

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
        style={[styles.stepButton, isLoading && styles.stepButtonDisabled]}
        onPress={handleAccountInfoSubmit}
        disabled={isLoading}
      >
        <Text style={styles.stepButtonText}>
          {isLoading ? 'Please wait...' : 'Continue to Avatar Setup'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvatarSetupStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create Your Avatar ✨</Text>
      <Text style={styles.stepSubtitle}>Personalize your Rebank experience</Text>

      {/* Avatar Preview */}
      <View style={styles.avatarPreview}>
        <UserAvatar
          firstName={formData.firstName || 'Your'}
          lastName={formData.lastName || 'Name'}
          avatarStyle={avatarStyle}
          primaryColor={selectedColors.primary}
          secondaryColor={selectedColors.secondary}
          size="large"
        />
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Zip Code"
          placeholderTextColor="#999"
          value={formData.zip}
          onChangeText={(text) => handleInputChange('zip', text)}
          keyboardType="numeric"
          maxLength={5}
        />
      </View>

      {/* Avatar Style */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avatar Style</Text>
        <View style={styles.styleOptions}>
          <TouchableOpacity
            style={[
              styles.styleOption,
              avatarStyle === 'minimal' && styles.styleOptionSelected,
            ]}
            onPress={() => setAvatarStyle('minimal')}
          >
            <Text style={[
              styles.styleText,
              avatarStyle === 'minimal' && styles.styleTextSelected,
            ]}>Minimal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.styleOption,
              avatarStyle === 'futuristic' && styles.styleOptionSelected,
            ]}
            onPress={() => setAvatarStyle('futuristic')}
          >
            <Text style={[
              styles.styleText,
              avatarStyle === 'futuristic' && styles.styleTextSelected,
            ]}>Futuristic</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color Theme</Text>
        <View style={styles.colorGrid}>
          {COSMIC_COLORS.map((colorScheme, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorOption,
                selectedColorIndex === index && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColorIndex(index)}
            >
              <LinearGradient
                colors={[colorScheme.primary, colorScheme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.colorPreview}
              />
              <Text style={styles.colorName}>{colorScheme.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Capital One Matching */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capital One Account</Text>
        <TouchableOpacity
          style={[
            styles.checkButton,
            isCheckingCapitalOne && styles.checkButtonDisabled,
            capitalOneMatch && styles.checkButtonSuccess,
          ]}
          onPress={checkCapitalOneAccount}
          disabled={isCheckingCapitalOne}
        >
          {isCheckingCapitalOne ? (
            <ActivityIndicator color="#ffffff" />
          ) : capitalOneMatch ? (
            <Text style={styles.checkButtonText}>✅ Account Found!</Text>
          ) : (
            <Text style={styles.checkButtonText}>Check for Capital One Account</Text>
          )}
        </TouchableOpacity>

        {capitalOneMatchData && (
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>Matched Account Details:</Text>
            <Text style={styles.matchText}>Name: {capitalOneMatchData.first_name} {capitalOneMatchData.last_name}</Text>
            <Text style={styles.matchText}>ZIP: {capitalOneMatchData.address?.zip || 'N/A'}</Text>
            <Text style={styles.matchText}>Customer ID: {capitalOneMatchData._id}</Text>
            {typeof matchConfidence === 'number' && (
              <Text style={styles.matchText}>Confidence: {(matchConfidence * 100).toFixed(1)}%</Text>
            )}
            {matchReason && (
              <Text style={styles.matchText}>Reason: {matchReason}</Text>
            )}
            <Text style={styles.matchText}>Accounts: {capitalOneMatchData.accounts?.length ?? 0}</Text>
          </View>
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.secondaryButton]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            ((!formData.firstName || !formData.lastName || !formData.zip) || isLoading) && styles.primaryButtonDisabled,
          ]}
          onPress={handleCompleteRegistration}
          disabled={!formData.firstName || !formData.lastName || !formData.zip || isLoading}
        >
          <Text style={styles.primaryButtonText}>Complete Registration</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0066CC', '#004499']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, responsive.isDesktop && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, step === 1 && styles.progressStepActive]} />
            <View style={[styles.progressStep, step === 2 && styles.progressStepActive]} />
          </View>

          <Text style={styles.progressText}>Step {step} of 2</Text>

          {step === 1 ? renderAccountInfoStep() : renderAvatarSetupStep()}

          {/* Demo Notice */}
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              Demo Mode: Any valid email/password combination will work
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressStep: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#ffffff',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  stepContent: {
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
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
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
  stepButton: {
    height: 50,
    backgroundColor: '#0066CC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  stepButtonDisabled: {
    backgroundColor: '#ccc',
  },
  stepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarPreview: {
    alignItems: 'center',
    marginVertical: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  styleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  styleOption: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  styleOptionSelected: {
    backgroundColor: 'rgba(0, 102, 204, 0.3)',
    borderColor: '#0066CC',
  },
  styleText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  styleTextSelected: {
    color: '#0066CC',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  colorOptionSelected: {
    backgroundColor: 'rgba(0, 102, 204, 0.3)',
    borderColor: '#0066CC',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  colorName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  checkButton: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkButtonSuccess: {
    backgroundColor: '#28a745',
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.3)',
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 8,
  },
  matchText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    height: 50,
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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

  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Responsive styles
  scrollContentDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});

export default RegisterScreen;
