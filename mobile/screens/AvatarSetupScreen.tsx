import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from '../components/LinearGradientWrapper';
import { useResponsive } from '../hooks/useResponsive';
import UserAvatar from '../components/UserAvatar';
import { useAuthStore } from '../stores/authStore';
import NessieService from '../services/nessieService';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';

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

const AvatarSetupScreen: React.FC = () => {
  const { updateUserWithAvatar, user } = useAuthStore();
  const { width } = useResponsive();
  const navigation = useNavigation<any>();
  const [nessieService, setNessieService] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [zip, setZip] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<'minimal' | 'futuristic'>('futuristic');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isCheckingCapitalOne, setIsCheckingCapitalOne] = useState(false);
  const [capitalOneMatch, setCapitalOneMatch] = useState(false);
  const [capitalOneMatchData, setCapitalOneMatchData] = useState<any>(null);

  const selectedColors = COSMIC_COLORS[selectedColorIndex];

  // Load demo data and prefill user info if available
  useEffect(() => {
    // Prefill form with user data if available
    if (user) {
      const nameParts = user.name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }

    // Initialize nessie service
    try {
      const service = NessieService.getInstance();
      setNessieService(service);
      service.loadDemoData().catch(error => {
        console.error('Failed to load demo data:', error);
      });
    } catch (error) {
      console.error('Failed to initialize nessie service:', error);
    }
  }, [user]);

  const checkCapitalOneAccount = async () => {
    if (!firstName || !lastName || !zip) {
      Alert.alert('Missing Information', 'Please fill in your first name, last name, and zip code to check for Capital One account matching.');
      return;
    }

    if (!nessieService) {
      Alert.alert('Service Error', 'Service not ready. Please try again.');
      return;
    }

    setIsCheckingCapitalOne(true);

    try {
      // Use the NESSIE service to find matching accounts
      const matchingResult = await nessieService.findMatchingAccount(firstName, lastName, zip);

      if (matchingResult.matched && matchingResult.customerData) {
        setCapitalOneMatchData(matchingResult.customerData);
        setCapitalOneMatch(true);

        Alert.alert(
          'Account Found! ✨',
          `We found a matching Capital One account with ${matchingResult.customerData.accounts.length} accounts.`,
          [
            { text: 'Great!', style: 'default' }
          ]
        );
      } else {
        setCapitalOneMatch(false);
        setCapitalOneMatchData(null);

        Alert.alert(
          'No Account Found',
          'We couldn\'t find a matching Capital One account with the provided information. You can still proceed with manual setup.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking Capital One account:', error);
      Alert.alert('Error', 'Unable to check for Capital One account at this time.');
    } finally {
      setIsCheckingCapitalOne(false);
    }
  };

  const handleComplete = async () => {
    if (!firstName.trim() || !lastName.trim() || !zip.trim()) {
      Alert.alert('Missing Information', 'Please fill in all personal details.');
      return;
    }

    if (zip.length !== 5 || !/^\d+$/.test(zip)) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code.');
      return;
    }

    const avatarData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      zip: zip.trim(),
      avatarStyle,
      primaryColor: selectedColors.primary,
      secondaryColor: selectedColors.secondary,
    };

    if (capitalOneMatch && capitalOneMatchData) {
      Alert.alert(
        'Capital One Account Found! 🎉',
        `We found a Capital One account for ${firstName} ${lastName} with multiple accounts and transaction history. Would you like to import this data into Rebank?`,
        [
          { text: 'Skip Import', style: 'cancel' },
          {
            text: 'Import Data',
            onPress: async () => {
              if (!nessieService) {
                updateUserWithAvatar(avatarData);
                // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
                return;
              }

              try {
                Alert.alert('Importing...', 'Please wait while we import your account data.');
                const importResult = await nessieService.importAccountData(capitalOneMatchData);
                if (importResult.success) {
                  updateUserWithAvatar({
                    ...avatarData,
                    capitalOneData: importResult.data,
                  });
                  // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
                  Alert.alert(
                    'Success! 🎉',
                    'Your Capital One account data has been imported successfully.',
                    [
                      {
                        text: 'Continue',
                        onPress: () => navigation.navigate('AIHome')
                      }
                    ]
                  );
                } else {
                  updateUserWithAvatar(avatarData);
                  // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
                  Alert.alert(
                    'Import Partial',
                    'Your avatar has been created, but we couldn\'t import the account data.',
                    [
                      {
                        text: 'Continue',
                        onPress: () => navigation.navigate('AIHome')
                      }
                    ]
                  );
                }
              } catch (error) {
                console.error('Import error:', error);
                updateUserWithAvatar(avatarData);
                // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
                Alert.alert(
                  'Setup Complete',
                  'Your avatar has been created successfully!',
                  [
                    {
                      text: 'Continue',
                      onPress: () => navigation.navigate('AIHome')
                      }
                  ]
                );
              }
            }
          },
          {
            text: 'Continue Without Import',
            onPress: () => {
              updateUserWithAvatar(avatarData);
              // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
              Alert.alert(
                'Setup Complete',
                'Your avatar has been created successfully!',
                [
                  {
                    text: 'Continue',
                    onPress: () => navigation.navigate('AIHome')
                  }
                ]
              );
            }
          }
        ]
      );
    } else {
      updateUserWithAvatar(avatarData);
      // AvatarSetupScreen no longer used - functionality moved to RegisterScreen
      Alert.alert(
        'Setup Complete',
        'Your avatar has been created successfully!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('AIHome')
          }
        ]
      );
    }
  };

  const renderColorOption = (colorScheme: { primary: string; secondary: string; name: string }, index: number) => (
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
  );

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Create Your Avatar ✨</Text>
        <Text style={styles.subtitle}>Personalize your Rebank experience</Text>

        {/* Avatar Preview */}
        <View style={styles.avatarPreview}>
          <UserAvatar
            firstName={firstName || 'Your'}
            lastName={lastName || 'Name'}
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
            placeholder="First Name"
            placeholderTextColor="#94a3b8"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#94a3b8"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="Zip Code"
            placeholderTextColor="#94a3b8"
            value={zip}
            onChangeText={setZip}
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
            {COSMIC_COLORS.map(renderColorOption)}
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
              <Text style={styles.matchText}>Name: {capitalOneMatchData.customer.first_name} {capitalOneMatchData.customer.last_name}</Text>
              <Text style={styles.matchText}>Accounts: {capitalOneMatchData.accounts.length}</Text>
              <Text style={styles.matchText}>Total Balance: ${capitalOneMatchData.accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            (!firstName || !lastName || !zip) && styles.completeButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!firstName || !lastName || !zip}
        >
          <Text style={styles.completeButtonText}>Complete Setup</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
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
    color: '#ffffff',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  styleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  styleOption: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  styleOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3B82F6',
  },
  styleText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  styleTextSelected: {
    color: '#ffffff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  colorOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3B82F6',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  colorName: {
    fontSize: 12,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  checkButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: '#64748b',
  },
  checkButtonSuccess: {
    backgroundColor: '#10b981',
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  matchText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  completeButton: {
    backgroundColor: '#8b5cf6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  completeButtonDisabled: {
    backgroundColor: '#475569',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default AvatarSetupScreen;