import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  customerId?: string; // Nessie customer ID for fetching financial data
  balance?: number;
  firstName?: string;
  lastName?: string;
  zip?: string;
  avatarStyle?: 'minimal' | 'futuristic';
  primaryColor?: string;
  secondaryColor?: string;
  capitalOneData?: any;
  preferences?: Record<string, any>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    zip: string;
    preferences?: Record<string, any>;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
  updateUserWithAvatar: (avatarData: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      
      console.log('🔐 Attempting login:', { email });
      
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        set({ error: data.message, isLoading: false });
        return;
      }

      const profile = data.profile || {};
      const preferences = profile.preferences || {};
      const capitalOneData = data.user_data && data.user_data.linked !== false ? data.user_data : null;

      // Create user object with customer ID
      const user: User = {
        id: data.user_id,
        name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || 'User',
        email: email,
        customerId: data.customer_id, // ✅ This is used by DataService to fetch financial data
        firstName: profile.first_name,
        lastName: profile.last_name,
        zip: profile.zip_code,
        primaryColor: preferences.primaryColor,
        secondaryColor: preferences.secondaryColor,
        avatarStyle: preferences.avatarStyle,
        capitalOneData: capitalOneData,
        balance: capitalOneData?.balance?.total_balance,
        preferences,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      console.log('✓ Login successful:', user);

    } catch (error) {
      set({
        error: 'Login failed. Please check your credentials and try again.',
        isLoading: false
      });
      console.error('❌ Login error:', error);
    }
  },

  register: async ({ email, password, firstName, lastName, zip, preferences }) => {
    set({ isLoading: true, error: null });

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          zip_code: zip,
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        set({ error: data.message || 'Registration failed', isLoading: false });
        return false;
      }

      const profile = data.profile || { first_name: firstName, last_name: lastName, zip_code: zip, preferences };
      const pref = profile.preferences || preferences || {};
      const capitalOneData = data.user_data && data.user_data.linked !== false ? data.user_data : null;

      const user: User = {
        id: data.user_id,
        name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || email,
        email,
        customerId: data.customer_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        zip: profile.zip_code,
        primaryColor: pref.primaryColor,
        secondaryColor: pref.secondaryColor,
        avatarStyle: pref.avatarStyle,
        capitalOneData,
        balance: capitalOneData?.balance?.total_balance,
        preferences: pref,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log('✓ Registration successful:', user);
      return true;

    } catch (error) {
      console.error('❌ Registration error:', error);
      set({
        error: 'Registration failed. Please try again.',
        isLoading: false,
      });
      return false;
    }
    return false;
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null
    });
    console.log('User logged out');
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  updateUserWithAvatar: (avatarData: any) => {
    const { user } = get();
    if (user) {
      const updatedUser: User = {
        ...user,
        firstName: avatarData.firstName,
        lastName: avatarData.lastName,
        zip: avatarData.zip,
        avatarStyle: avatarData.avatarStyle,
        primaryColor: avatarData.primaryColor,
        secondaryColor: avatarData.secondaryColor,
        capitalOneData: avatarData.capitalOneData,
        name: `${avatarData.firstName} ${avatarData.lastName}`
      };
      set({ user: updatedUser });
    }
  },

}));
