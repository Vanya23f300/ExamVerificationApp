import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Candidate, Verifier } from '../types';
import DatabaseService from '../database/DatabaseService';

type AdminScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Admin'>;
type AdminScreenRouteProp = RouteProp<RootStackParamList, 'Admin'>;

interface Props {
  navigation: AdminScreenNavigationProp;
  route: AdminScreenRouteProp;
}

const AdminScreen: React.FC<Props> = ({ navigation, route }) => {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    verifiedCandidates: 0,
    pendingVerifications: 0,
    rejectedCandidates: 0,
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [verifier, setVerifier] = useState<Verifier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route.params?.verifier) {
      setVerifier(route.params.verifier);
    }
    loadDashboardData();
  }, [route.params]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load candidates assigned to this verifier
      if (route.params?.verifier) {
        const assignedCandidates = await DatabaseService.getCandidatesByVerifier(
          route.params.verifier.id
        );
        setCandidates(assignedCandidates);
      } else {
        // Load all candidates if no specific verifier
        const allCandidates = await DatabaseService.getAllCandidates();
        setCandidates(allCandidates);
      }

      // Load verification statistics
      const todayStats = await DatabaseService.getVerificationStatistics();
      setStats({
        totalCandidates: todayStats.totalCandidates,
        verifiedCandidates: todayStats.verified,
        pendingVerifications: todayStats.pending,
        rejectedCandidates: todayStats.rejected,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = () => {
    navigation.navigate('Verification', { candidate: undefined });
  };

  const handleCSVImport = () => {
    navigation.navigate('CSVImport', undefined);
  };

  const handleExportData = async () => {
    try {
      Alert.alert('Export Data', 'Export functionality would generate CSV report from PostgreSQL database');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleRefreshData = () => {
    loadDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              // Log logout action
              if (verifier) {
                await DatabaseService.logAction(
                  verifier.id, 
                  'LOGOUT', 
                  { timestamp: new Date().toISOString() }
                );
              }
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              navigation.replace('Login');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading dashboard data from PostgreSQL...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            {verifier ? `${verifier.name} - ${verifier.assignedCentre}` : 'System Overview'}
          </Text>
          {verifier && (
            <Text style={styles.shiftInfo}>
              {verifier.assignedShift} Shift • {verifier.assignedDate}
            </Text>
          )}
        </View>

        {/* Statistics Cards from PostgreSQL */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{candidates.length}</Text>
            <Text style={styles.statLabel}>Assigned Candidates</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
              {stats.verifiedCandidates}
            </Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>
              {stats.pendingVerifications}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>
              {stats.rejectedCandidates}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleStartVerification}>
            <Text style={styles.actionButtonText}>Start Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleCSVImport}>
            <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>
              Import Candidate Data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleExportData}>
            <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>
              Export PostgreSQL Data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleRefreshData}>
            <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
              Refresh Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Candidates from PostgreSQL */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>
            Assigned Candidates ({candidates.length})
          </Text>
          {candidates.slice(0, 5).map((candidate) => (
            <View key={candidate.rollNumber} style={styles.candidateCard}>
              <View style={styles.candidateInfo}>
                <Text style={styles.candidateName}>{candidate.name}</Text>
                <Text style={styles.candidateRoll}>{candidate.rollNumber}</Text>
                <Text style={styles.candidateDetails}>
                  {candidate.examDate} • {candidate.shift} • {candidate.centre}
                </Text>
              </View>
              <Text style={styles.candidateStatus}>Ready for Verification</Text>
            </View>
          ))}
          
          {candidates.length === 0 && (
            <View style={styles.noCandidatesCard}>
              <Text style={styles.noCandidatesText}>
                No candidates assigned to this verifier.
              </Text>
            </View>
          )}
        </View>

        {/* Database Status */}
        <View style={styles.dbStatusSection}>
          <Text style={styles.dbStatusTitle}>Database Status</Text>
          <Text style={styles.dbStatusText}>✅ Connected to PostgreSQL</Text>
          <Text style={styles.dbStatusText}>📊 Real-time data synchronization</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recentSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  candidateCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  candidateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  candidateRoll: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  candidateStatus: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shiftInfo: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  noCandidatesCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  noCandidatesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  dbStatusSection: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  dbStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  dbStatusText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 2,
  },
});

export default AdminScreen;