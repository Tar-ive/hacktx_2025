import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  balance?: number;
  firstName?: string;
  lastName?: string;
  zip?: string;
  avatarStyle?: 'minimal' | 'futuristic';
  primaryColor?: string;
  secondaryColor?: string;
  capitalOneData?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
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
      // For hackathon demo - accept any valid email/password combination
      // In production, this would call your backend API
      console.log('Login attempt:', { email });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create demo user
      const user: User = {
        id: 'demo_user_123',
        name: 'Alex',
        email: email,
        balance: 2450.00,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      console.log('Login successful:', user);

    } catch (error) {
      set({
        error: 'Login failed. Please check your credentials and try again.',
        isLoading: false
      });
      console.error('Login error:', error);
    }
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

  register: (userData: User) => {
    set({
      user: userData,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },
}));