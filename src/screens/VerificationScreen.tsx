import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Candidate, VerificationStep, QRCodeData } from '../types';
import DatabaseService from '../database/DatabaseService';
import PermissionsService from '../services/PermissionsService';
import QRScanner from '../components/QRScanner';
import FaceRecognition from '../components/FaceRecognition';
import BiometricScanner from '../components/BiometricScanner';

type VerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Verification'>;
type VerificationScreenRouteProp = RouteProp<RootStackParamList, 'Verification'>;

interface Props {
  navigation: VerificationScreenNavigationProp;
  route: VerificationScreenRouteProp;
}

const VerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState<'SEARCH' | 'QR_SCAN' | 'FACE_RECOGNITION' | 'FINGERPRINT' | 'RETINA' | 'SUMMARY'>('SEARCH');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [rollNumberSearch, setRollNumberSearch] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showRetina, setShowRetina] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    { step: 'QR_SCAN', status: 'PENDING' },
    { step: 'FACE_RECOGNITION', status: 'PENDING' },
    { step: 'FINGERPRINT', status: 'PENDING' },
    { step: 'RETINA', status: 'PENDING' },
  ]);

  useEffect(() => {
    if (route.params?.candidate) {
      setCandidate(route.params.candidate);
      setCurrentStep('FACE_RECOGNITION');
    }
  }, [route.params]);

  const searchByRollNumber = async () => {
    if (!rollNumberSearch.trim()) {
      Alert.alert('Error', 'Please enter a roll number');
      return;
    }

    try {
      const foundCandidate = await DatabaseService.getCandidateByRollNumber(rollNumberSearch.trim());

      if (foundCandidate) {
        setCandidate(foundCandidate);
        updateVerificationStep('QR_SCAN', 'COMPLETED');
        setCurrentStep('FACE_RECOGNITION');
      } else {
        Alert.alert('Not Found', 'Candidate not found with this roll number');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for candidate');
    }
  };

  const handleQRScan = () => {
    setShowQRScanner(true);
  };

  const onQRCodeScanned = async (data: string) => {
    setShowQRScanner(false);
    
    try {
      // Try to parse QR code data
      let rollNumber: string;
      try {
        const qrData: QRCodeData = JSON.parse(data);
        rollNumber = qrData.rollNumber;
      } catch {
        // If not JSON, treat as plain roll number
        rollNumber = data;
      }

      const foundCandidate = await DatabaseService.getCandidateByRollNumber(rollNumber);

      if (foundCandidate) {
        setCandidate(foundCandidate);
        updateVerificationStep('QR_SCAN', 'COMPLETED');
        setCurrentStep('FACE_RECOGNITION');
      } else {
        Alert.alert('Error', 'Candidate not found');
      }
    } catch (error) {
      // For demo, use first available candidate
      try {
        const firstCandidate = await DatabaseService.getCandidateByRollNumber('JEE2024001');
        if (firstCandidate) {
          setCandidate(firstCandidate);
          updateVerificationStep('QR_SCAN', 'COMPLETED');
          setCurrentStep('FACE_RECOGNITION');
        } else {
          Alert.alert('Error', 'No candidates found in database');
        }
      } catch (dbError) {
        Alert.alert('Error', 'Database error occurred');
      }
    }
  };

  const updateVerificationStep = (step: VerificationStep['step'], status: VerificationStep['status'], confidence?: number) => {
    setVerificationSteps(prev => 
      prev.map(s => 
        s.step === step 
          ? { ...s, status, confidence }
          : s
      )
    );
  };

  const startFaceRecognition = async () => {
    const hasPermission = await PermissionsService.checkAndRequestCameraPermission();
    
    if (hasPermission) {
      setShowFaceRecognition(true);
      updateVerificationStep('FACE_RECOGNITION', 'IN_PROGRESS');
    } else {
      Alert.alert('Permission Denied', 'Camera permission is required for face verification');
    }
  };

  const onFaceVerificationComplete = (result: { success: boolean; confidence: number; error?: string }) => {
    setShowFaceRecognition(false);
    
    if (result.success) {
      updateVerificationStep('FACE_RECOGNITION', 'COMPLETED', result.confidence);
      setCurrentStep('FINGERPRINT');
      Alert.alert(
        'Face Verification',
        `Face verified successfully! Confidence: ${result.confidence.toFixed(1)}%`,
        [{ text: 'Continue', onPress: () => setCurrentStep('FINGERPRINT') }]
      );
    } else {
      updateVerificationStep('FACE_RECOGNITION', 'FAILED', result.confidence);
      Alert.alert(
        'Face Verification Failed',
        result.error || `Face verification failed. Confidence: ${result.confidence?.toFixed(1)}%`,
        [{ text: 'Retry', onPress: startFaceRecognition }]
      );
    }
  };

  const startFingerprintScan = () => {
    setShowFingerprint(true);
    updateVerificationStep('FINGERPRINT', 'IN_PROGRESS');
  };

  const onFingerprintComplete = (result: { success: boolean; confidence?: number; error?: string }) => {
    setShowFingerprint(false);
    
    if (result.success) {
      updateVerificationStep('FINGERPRINT', 'COMPLETED', result.confidence);
      Alert.alert('Success', 'Fingerprint verified!', [
        { text: 'Continue', onPress: () => setCurrentStep('RETINA') }
      ]);
    } else {
      updateVerificationStep('FINGERPRINT', 'FAILED');
      Alert.alert('Failed', result.error || 'Fingerprint verification failed. Please try again.');
    }
  };

  const startRetinaScan = () => {
    setShowRetina(true);
    updateVerificationStep('RETINA', 'IN_PROGRESS');
  };

  const onRetinaComplete = (result: { success: boolean; confidence?: number; error?: string }) => {
    setShowRetina(false);
    
    if (result.success) {
      updateVerificationStep('RETINA', 'COMPLETED', result.confidence);
      Alert.alert('Success', 'Retina verified!', [
        { text: 'Finish', onPress: () => setCurrentStep('SUMMARY') }
      ]);
    } else {
      updateVerificationStep('RETINA', 'FAILED');
      Alert.alert('Failed', result.error || 'Retina verification failed. Please try again.');
    }
  };

  const completeVerification = async () => {
    if (!candidate) return;
    
    const completedSteps = verificationSteps.filter(step => step.status === 'COMPLETED');
    const failedSteps = verificationSteps.filter(step => step.status === 'FAILED');
    
    let finalStatus: 'VERIFIED' | 'REJECTED' | 'PARTIAL';
    
    if (completedSteps.length === verificationSteps.length) {
      finalStatus = 'VERIFIED';
    } else if (failedSteps.length > 0) {
      finalStatus = 'REJECTED';
    } else {
      finalStatus = 'PARTIAL';
    }

    // Save verification result to database
    try {
      const verificationResult = {
        id: `VR_${Date.now()}`,
        rollNumber: candidate.rollNumber,
        verifierId: 'V001', // In real app, get from logged-in verifier
        timestamp: new Date(),
        qrScanned: verificationSteps.find(s => s.step === 'QR_SCAN')?.status === 'COMPLETED',
        faceVerified: verificationSteps.find(s => s.step === 'FACE_RECOGNITION')?.status === 'COMPLETED',
        faceConfidence: verificationSteps.find(s => s.step === 'FACE_RECOGNITION')?.confidence,
        fingerprintVerified: verificationSteps.find(s => s.step === 'FINGERPRINT')?.status === 'COMPLETED',
        retinaVerified: verificationSteps.find(s => s.step === 'RETINA')?.status === 'COMPLETED',
        finalStatus: finalStatus,
        notes: 'Verification completed via mobile app'
      };

      await DatabaseService.insertVerificationResult(verificationResult);
      
      Alert.alert(
        'Verification Complete',
        `Student verification ${finalStatus.toLowerCase()}! Result saved to database.`,
        [
          { text: 'New Verification', onPress: () => {
            setCandidate(null);
            setCurrentStep('SEARCH');
            setVerificationSteps(prev => prev.map(s => ({ ...s, status: 'PENDING' })));
          }},
          { text: 'Back to Dashboard', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Save verification result error:', error);
      Alert.alert('Warning', 'Verification completed but failed to save to database');
    }
  };

  const getStepIcon = (step: VerificationStep) => {
    switch (step.status) {
      case 'COMPLETED': return '✅';
      case 'FAILED': return '❌';
      case 'IN_PROGRESS': return '🔄';
      default: return '⏳';
    }
  };

  const getStepColor = (step: VerificationStep) => {
    switch (step.status) {
      case 'COMPLETED': return '#4CAF50';
      case 'FAILED': return '#f44336';
      case 'IN_PROGRESS': return '#2196F3';
      default: return '#999';
    }
  };

  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Find Candidate</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter Roll Number"
          value={rollNumberSearch}
          onChangeText={setRollNumberSearch}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchByRollNumber}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>OR</Text>

      <TouchableOpacity style={styles.qrButton} onPress={handleQRScan}>
        <Text style={styles.qrButtonText}>📱 Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCandidateInfo = () => (
    candidate && (
      <View style={styles.candidateCard}>
        <Text style={styles.candidateName}>{candidate.name}</Text>
        <Text style={styles.candidateDetails}>Roll: {candidate.rollNumber}</Text>
        <Text style={styles.candidateDetails}>Date: {candidate.examDate}</Text>
        <Text style={styles.candidateDetails}>Shift: {candidate.shift}</Text>
        <Text style={styles.candidateDetails}>Centre: {candidate.centre}</Text>
        
        {candidate.photo && (
          <Image source={{ uri: candidate.photo }} style={styles.candidatePhoto} />
        )}
      </View>
    )
  );

  const renderVerificationSteps = () => (
    <View style={styles.stepsContainer}>
      <Text style={styles.stepsTitle}>Verification Progress</Text>
      {verificationSteps.map((step, index) => (
        <View key={step.step} style={styles.stepRow}>
          <Text style={styles.stepIcon}>{getStepIcon(step)}</Text>
          <Text style={[styles.stepText, { color: getStepColor(step) }]}>
            {step.step.replace('_', ' ')}
          </Text>
          {step.confidence && (
            <Text style={styles.confidenceText}>
              {step.confidence.toFixed(1)}%
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderCurrentStepActions = () => {
    switch (currentStep) {
      case 'FACE_RECOGNITION':
        return (
          <TouchableOpacity style={styles.actionButton} onPress={startFaceRecognition}>
            <Text style={styles.actionButtonText}>📷 Start Face Recognition</Text>
          </TouchableOpacity>
        );
      case 'FINGERPRINT':
        return (
          <TouchableOpacity style={styles.actionButton} onPress={startFingerprintScan}>
            <Text style={styles.actionButtonText}>👆 Verify Fingerprints</Text>
          </TouchableOpacity>
        );
      case 'RETINA':
        return (
          <TouchableOpacity style={styles.actionButton} onPress={startRetinaScan}>
            <Text style={styles.actionButtonText}>👁️ Scan Retina</Text>
          </TouchableOpacity>
        );
      case 'SUMMARY':
        return (
          <TouchableOpacity style={styles.actionButton} onPress={completeVerification}>
            <Text style={styles.actionButtonText}>✅ Complete Verification</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Student Verification</Text>
        
        {currentStep === 'SEARCH' ? renderSearchStep() : (
          <>
            {renderCandidateInfo()}
            {renderVerificationSteps()}
            {renderCurrentStepActions()}
          </>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={showQRScanner} animationType="slide">
        <QRScanner
          onCodeScanned={onQRCodeScanned}
          onCancel={() => setShowQRScanner(false)}
        />
      </Modal>

      {/* Face Recognition Modal */}
      <Modal visible={showFaceRecognition} animationType="slide">
        <FaceRecognition
          onVerificationComplete={onFaceVerificationComplete}
          candidatePhoto={candidate?.photo}
          onCancel={() => setShowFaceRecognition(false)}
        />
      </Modal>

      {/* Fingerprint Scanner Modal */}
      <Modal visible={showFingerprint} animationType="slide">
        <BiometricScanner
          type="fingerprint"
          onVerificationComplete={onFingerprintComplete}
          candidateTemplates={{
            fingerprint1: candidate?.fingerprint1,
            fingerprint2: candidate?.fingerprint2
          }}
          onCancel={() => setShowFingerprint(false)}
        />
      </Modal>

      {/* Retina Scanner Modal */}
      <Modal visible={showRetina} animationType="slide">
        <BiometricScanner
          type="retina"
          onVerificationComplete={onRetinaComplete}
          candidateTemplates={{
            retinaData: candidate?.retinaData
          }}
          onCancel={() => setShowRetina(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  qrButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 10,
    textAlign: 'center',
  },
  candidateCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  candidateName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  candidateDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  candidatePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginTop: 15,
  },
  stepsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  stepText: {
    fontSize: 16,
    flex: 1,
    textTransform: 'capitalize',
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrMarker: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  qrInstructions: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  cameraInstructions: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  captureButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 50,
    marginBottom: 20,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VerificationScreen;