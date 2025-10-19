import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';

// Import auth store
import { useAuthStore } from './stores/authStore';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import AIHomeScreen from './screens/AIHomeScreen';
import AgentChatScreen from './screens/AgentChatScreen';

// Define navigation types
export type RootStackParamList = {
  Login: undefined;
  AIHome: undefined;
  Dashboard: undefined;
  Analytics: undefined;
  AgentChat: { agentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{
          flex: 1,
          backgroundColor: '#0066CC',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "AIHome" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0066CC', // Capital One blue
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="AIHome"
              component={AIHomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: 'Dashboard',
                headerBackVisible: true
              }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{
                title: 'Analytics',
                headerBackVisible: true
              }}
            />
            <Stack.Screen
              name="AgentChat"
              component={AgentChatScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return <Navigation />;
}
