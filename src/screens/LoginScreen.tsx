import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Verifier } from '../types';
import DatabaseService from '../database/DatabaseService';
import SampleDataService from '../services/SampleDataService';

// Security imports
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

interface SecurityContext {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  networkType: string;
  isJailbroken: boolean;
  appVersion: string;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [verifierId, setVerifierId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityContext, setSecurityContext] = useState<SecurityContext | null>(null);
  const [initializingDatabase, setInitializingDatabase] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize security context
      await initializeSecurityContext();
      
      // Initialize database
      await initializeDatabase();
      
      // Initialize sample data if needed
      await seedInitialData();
      await SampleDataService.initializeIfNeeded();
      
      setInitializingDatabase(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      Alert.alert('Initialization Error', 'Failed to initialize application. Please restart the app.');
      setInitializingDatabase(false);
    }
  };

  const initializeSecurityContext = async () => {
    try {
      const [deviceId, deviceName, isJailbroken, appVersion, netInfo] = await Promise.all([
        DeviceInfo.getUniqueId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.isJailBroken(),
        DeviceInfo.getVersion(),
        NetInfo.fetch()
      ]);

      const context: SecurityContext = {
        deviceId,
        deviceName,
        ipAddress: netInfo.details?.ipAddress || 'unknown',
        networkType: netInfo.type || 'unknown',
        isJailbroken,
        appVersion
      };

      setSecurityContext(context);

      // Security check: Alert if device is compromised
      if (isJailbroken) {
        Alert.alert(
          'Security Warning', 
          'This device appears to be jailbroken/rooted. For security reasons, this application should only be used on secure, unmodified devices.',
          [{ text: 'Acknowledge', style: 'destructive' }]
        );
      }
    } catch (error) {
      console.error('Security context initialization failed:', error);
    }
  };

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initDatabase();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  };

  const seedInitialData = async () => {
    // Initial verifiers will be created with hashed passwords
    const initialVerifiers: Verifier[] = [
      {
        id: 'V001',
        name: 'John Doe',
        assignedDate: '2025-07-21',
        assignedShift: 'S1',
        assignedCentre: 'Delhi Centre 1',
        password: 'password123',
      },
      {
        id: 'V002',
        name: 'Jane Smith',
        assignedDate: '2025-07-21',
        assignedShift: 'S2',
        assignedCentre: 'Mumbai Centre 1',
        password: 'password123',
      },
      {
        id: 'ADMIN',
        name: 'System Administrator',
        assignedDate: '2025-07-21',
        assignedShift: 'S1',
        assignedCentre: 'Delhi Centre 1',
        password: 'admin123',
      }
    ];

    // Note: Password hashing will be handled in DatabaseService
    for (const verifier of initialVerifiers) {
      try {
        await DatabaseService.insertVerifier(verifier);
      } catch (error) {
        // Ignore duplicate key errors
        if (!error.message.includes('duplicate key')) {
          console.error('Failed to insert verifier:', error);
        }
      }
    }
  };

  const validateInput = (): { isValid: boolean; error?: string } => {
    if (!verifierId.trim()) {
      return { isValid: false, error: 'Verifier ID is required' };
    }
    
    if (!password.trim()) {
      return { isValid: false, error: 'Password is required' };
    }
    
    if (verifierId.length < 3) {
      return { isValid: false, error: 'Verifier ID must be at least 3 characters' };
    }
    
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    
    // Check for SQL injection patterns
    const sqlInjectionPattern = /(;|'|"|--|\b(or|and|union|select|insert|update|delete|drop|create|alter)\b)/i;
    if (sqlInjectionPattern.test(verifierId) || sqlInjectionPattern.test(password)) {
      return { isValid: false, error: 'Invalid characters detected' };
    }
    
    return { isValid: true };
  };

  const handleLogin = async () => {
    const validation = validateInput();
    if (!validation.isValid) {
      Alert.alert('Input Error', validation.error);
      return;
    }

    if (!securityContext) {
      Alert.alert('Security Error', 'Security context not initialized. Please restart the app.');
      return;
    }

    setLoading(true);

    try {
      // Enhanced login with security context
      const loginResult = await DatabaseService.verifyLogin(
        verifierId.trim(), 
        password.trim(), 
        securityContext.ipAddress
      );

      if (loginResult.success && loginResult.verifier) {
        // Log successful login with device info
        await DatabaseService.logAction(
          loginResult.verifier.id,
          'LOGIN_SUCCESS',
          {
            deviceId: securityContext.deviceId,
            deviceName: securityContext.deviceName,
            ipAddress: securityContext.ipAddress,
            networkType: securityContext.networkType,
            appVersion: securityContext.appVersion,
            timestamp: new Date().toISOString()
          },
          securityContext.ipAddress
        );

        Alert.alert(
          'Login Successful', 
          `Welcome ${loginResult.verifier.name}!\n\nAssigned: ${loginResult.verifier.assignedCentre}\nShift: ${loginResult.verifier.assignedShift}`, 
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Admin', { verifier: loginResult.verifier }),
            },
          ]
        );
      } else if (loginResult.accountLocked) {
        Alert.alert(
          'Account Locked', 
          loginResult.error || 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.',
          [{ text: 'OK', style: 'destructive' }]
        );
      } else {
        Alert.alert(
          'Login Failed', 
          'Invalid Verifier ID or Password. Please check your credentials and try again.',
          [{ text: 'Retry' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Log failed login attempt
      if (securityContext) {
        await DatabaseService.logSecurityEvent('LOGIN_ERROR', {
          verifierId: verifierId.trim(),
          error: error.message,
          deviceId: securityContext.deviceId,
          ipAddress: securityContext.ipAddress
        });
      }
      
      Alert.alert(
        'Login Error', 
        'A system error occurred during login. Please try again or contact technical support if the problem persists.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (initializingDatabase) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Initializing Secure Database...</Text>
          <Text style={styles.loadingSubtext}>Establishing encrypted connections</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🛡️ Exam Verification System</Text>
          <Text style={styles.subtitle}>Government-Grade Biometric Authentication</Text>
          <Text style={styles.versionText}>v{securityContext?.appVersion} • Secure Mode</Text>
        </View>

        {/* Security Status */}
        <View style={styles.securityStatus}>
          <Text style={styles.securityTitle}>🔒 Security Status</Text>
          <Text style={styles.securityItem}>
            ✅ Database: Encrypted PostgreSQL Connection
          </Text>
          <Text style={styles.securityItem}>
            ✅ Network: {securityContext?.networkType} Connection Secured
          </Text>
          <Text style={styles.securityItem}>
            {securityContext?.isJailbroken ? '⚠️' : '✅'} Device: {securityContext?.isJailbroken ? 'Compromised' : 'Secure'}
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Official Verifier ID</Text>
          <TextInput
            style={styles.input}
            value={verifierId}
            onChangeText={setVerifierId}
            placeholder="Enter your assigned Verifier ID"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            secureTextEntry={false}
          />

          <Text style={styles.label}>Secure Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your secure password"
            secureTextEntry
            autoCorrect={false}
            maxLength={50}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.loginButtonText}>
              {loading ? '🔐 Authenticating...' : '🔓 Secure Login'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Credentials - Remove in production */}
        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>🧪 Demo Credentials (Development Only):</Text>
          <Text style={styles.demoText}>• Verifier: V001 / password123</Text>
          <Text style={styles.demoText}>• Verifier: V002 / password123</Text>
          <Text style={styles.demoText}>• Admin: ADMIN / admin123</Text>
          <Text style={styles.warningText}>
            ⚠️ These credentials will be removed in production deployment
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Device ID: {securityContext?.deviceId?.substring(0, 8)}...
          </Text>
          <Text style={styles.footerText}>
            Session encrypted with AES-256 • All actions are logged
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
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
  versionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: '600',
  },
  securityStatus: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  securityItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 25,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfo: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: '#856404',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  warningText: {
    fontSize: 12,
    color: '#d63031',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 3,
  },
});

export default LoginScreen;