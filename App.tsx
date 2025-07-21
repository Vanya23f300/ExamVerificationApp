/**
 * Exam Verification App
 * Multi-step biometric verification system for exam centres
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, StyleSheet, Platform, View, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import CSVImportScreen from './src/screens/CSVImportScreen';

// Import services
import DatabaseService from './src/database/DatabaseService';
import PermissionsService from './src/services/PermissionsService';

export type RootStackParamList = {
  Login: undefined;
  Admin: { verifier: any };
  Verification: { candidate?: any };
  CSVImport: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Exam Verification App...');
      
      // Initialize PostgreSQL database
      await DatabaseService.initDatabase();
      console.log('PostgreSQL database initialized successfully');

      // Verify database connection
      const isHealthy = await DatabaseService.isHealthy();
      if (!isHealthy) {
        throw new Error('PostgreSQL database health check failed');
      }

      // Request permissions
      const permissions = await PermissionsService.checkAllRequiredPermissions();
      if (!permissions.allGranted) {
        console.warn('Some permissions not granted:', permissions);
        Alert.alert(
          'Permissions Required',
          'Camera and storage permissions are required for biometric verification. You can grant them later from device settings.',
          [{ text: 'OK' }]
        );
      }

      console.log('App initialization completed successfully');
      setIsInitializing(false);

    } catch (error) {
      console.error('App initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setInitError(errorMessage);
      setIsInitializing(false);
    }
  };

  const retryInitialization = () => {
    setInitError(null);
    setIsInitializing(true);
    initializeApp();
  };

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initializing Exam Verification System...</Text>
        <Text style={styles.loadingSubtext}>Connecting to PostgreSQL database</Text>
        <Text style={styles.loadingHint}>
          Please ensure PostgreSQL is running on localhost:5432
        </Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Database Connection Error</Text>
        <Text style={styles.errorText}>{initError}</Text>
        <Text style={styles.errorHint}>
          Please check:
          {'\n'}• PostgreSQL is running on localhost:5432
          {'\n'}• Database 'exam_verification_db' exists
          {'\n'}• User 'exam_user' has proper permissions
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryInitialization}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Exam Verification Login' }}
        />
        <Stack.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen 
          name="Verification" 
          component={VerificationScreen}
          options={{ title: 'Student Verification' }}
        />
        <Stack.Screen 
          name="CSVImport" 
          component={CSVImportScreen}
          options={{ title: 'Import Candidate Data' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
