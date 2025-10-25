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

  const starDots = React.useMemo(
    () => (
      [
        { top: '6%', left: '22%', size: 3, opacity: 0.75 },
        { top: '12%', right: '18%', size: 2, opacity: 0.6 },
        { top: '30%', left: '28%', size: 2, opacity: 0.58 },
        { top: '44%', right: '20%', size: 3, opacity: 0.65 },
        { bottom: '36%', left: '18%', size: 2, opacity: 0.55 },
        { bottom: '26%', right: '26%', size: 2, opacity: 0.6 },
        { bottom: '14%', left: '32%', size: 3, opacity: 0.6 },
        { top: '20%', right: '45%', size: 2, opacity: 0.52 },
      ]
    ),
    []
  );

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
        colors={['#070B16', '#101623', '#1b2536']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.celestialBackdrop}>
          {starDots.map((dot, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={`register-star-${index}`}
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
            colors={['rgba(129, 140, 248, 0.22)', 'transparent']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.mist}
          />
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />
        </View>

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
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
  mist: {
    position: 'absolute',
    top: -140,
    left: -100,
    right: -100,
    height: '55%',
    opacity: 0.4,
  },
  glowOne: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    opacity: 0.4,
    shadowColor: 'rgba(56, 189, 248, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
    elevation: 12,
  },
  glowTwo: {
    position: 'absolute',
    bottom: '16%',
    right: '12%',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(129, 140, 248, 0.18)',
    opacity: 0.35,
    shadowColor: 'rgba(129, 140, 248, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 10,
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
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#60a5fa',
  },
  progressText: {
    color: 'rgba(226, 232, 240, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  stepContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(226, 232, 240, 0.72)',
    textAlign: 'center',
    marginBottom: 30,
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
  stepButton: {
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  stepButtonDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
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
    color: '#e2e8f0',
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
    backgroundColor: 'rgba(8, 11, 19, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    alignItems: 'center',
  },
  styleOptionSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: 'rgba(96, 165, 250, 0.6)',
  },
  styleText: {
    fontSize: 16,
    color: 'rgba(203, 213, 225, 0.75)',
    fontWeight: '600',
  },
  styleTextSelected: {
    color: '#bfdbfe',
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
    backgroundColor: 'rgba(8, 11, 19, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    alignItems: 'center',
  },
  colorOptionSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: 'rgba(96, 165, 250, 0.6)',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  colorName: {
    fontSize: 12,
    color: 'rgba(203, 213, 225, 0.75)',
    textAlign: 'center',
  },
  checkButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  checkButtonDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  checkButtonSuccess: {
    backgroundColor: 'rgba(45, 212, 191, 0.25)',
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchInfo: {
    marginTop: 15,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5eead4',
    marginBottom: 8,
  },
  matchText: {
    fontSize: 13,
    color: 'rgba(226, 232, 240, 0.75)',
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
    backgroundColor: 'rgba(8, 11, 19, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  secondaryButtonText: {
    color: 'rgba(203, 213, 225, 0.75)',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    height: 50,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoNotice: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  demoNoticeText: {
    color: 'rgba(240, 249, 255, 0.85)',
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
    color: 'rgba(226, 232, 240, 0.8)',
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
