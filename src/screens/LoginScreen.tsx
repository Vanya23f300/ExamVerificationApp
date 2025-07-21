import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Verifier } from '../types';
import DatabaseService from '../database/DatabaseService';
import SampleDataService from '../services/SampleDataService';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [verifierId, setVerifierId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initDatabase();
      await seedInitialData();
      await SampleDataService.initializeIfNeeded();
    } catch (error) {
      console.error('Database initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize database');
    }
  };

  const seedInitialData = async () => {
    const initialVerifiers: Verifier[] = [
      {
        id: 'V001',
        name: 'John Doe',
        assignedDate: '2024-01-15',
        assignedShift: 'Morning',
        assignedCentre: 'Centre A',
        password: 'password123',
      },
      {
        id: 'V002',
        name: 'Jane Smith',
        assignedDate: '2024-01-15',
        assignedShift: 'Afternoon',
        assignedCentre: 'Centre B',
        password: 'password456',
      },
    ];

    for (const verifier of initialVerifiers) {
      await DatabaseService.insertVerifier(verifier);
    }
  };

  const handleLogin = async () => {
    if (!verifierId || !password) {
      Alert.alert('Error', 'Please enter both Verifier ID and Password');
      return;
    }

    setLoading(true);

    try {
      const verifier = await DatabaseService.verifyLogin(verifierId, password);

      if (verifier) {
        Alert.alert(
          'Login Successful', 
          `Welcome ${verifier.name}!`, 
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Admin', { verifier }),
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', 'Invalid Verifier ID or Password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Exam Verification System</Text>
          <Text style={styles.subtitle}>Secure Biometric Authentication</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Verifier ID</Text>
          <TextInput
            style={styles.input}
            value={verifierId}
            onChangeText={setVerifierId}
            placeholder="Enter your Verifier ID"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.loginButtonText}>
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>ID: V001, Password: password123</Text>
          <Text style={styles.demoText}>ID: V002, Password: password456</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  demoText: {
    fontSize: 12,
    color: '#1976d2',
  },
});

export default LoginScreen; 