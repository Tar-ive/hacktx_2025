/**
 * ErrorBoundary - Catches React errors and provides graceful fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                The app encountered an unexpected error. Don't worry, your data is safe.
              </Text>

              {__DEV__ && this.state.error && (
                <ScrollView style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                  <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                  {this.state.errorInfo && (
                    <>
                      <Text style={styles.errorTitle}>Component Stack:</Text>
                      <Text style={styles.errorText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </>
                  )}
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                If the problem persists, try restarting the app
              </Text>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
