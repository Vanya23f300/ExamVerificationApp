import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import FingerprintService from '../services/FingerprintService';
import MantraFingerprintService from '../services/MantraFingerprintService';

interface Props {
  type: 'fingerprint' | 'retina';
  onVerificationComplete: (result: {
    success: boolean;
    confidence?: number;
    quality?: number;
    error?: string;
  }) => void;
  candidateTemplates?: {
    fingerprint1?: string;
    fingerprint2?: string;
    retinaData?: string;
  };
  onCancel?: () => void;
}

const BiometricScanner: React.FC<Props> = ({ 
  type, 
  onVerificationComplete, 
  candidateTemplates,
  onCancel 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<{
    connected: boolean;
    message: string;
  }>({ connected: false, message: 'Checking device...' });
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  useEffect(() => {
    checkDeviceStatus();
  }, []);

  const checkDeviceStatus = async () => {
    try {
      if (type === 'fingerprint') {
        const status = await FingerprintService.checkDeviceStatus();
        setDeviceStatus(status);
      } else {
        // Simulate retina scanner check
        setTimeout(() => {
          const connected = Math.random() > 0.3; // 70% chance connected
          setDeviceStatus({
            connected,
            message: connected ? 'Mantra IRIS Scanner ready' : 'Retina scanner not detected'
          });
        }, 2000);
      }
    } catch (error) {
      setDeviceStatus({
        connected: false,
        message: `Device check failed: ${error}`
      });
    }
  };

  const startScan = async () => {
    if (!deviceStatus.connected) {
      Alert.alert('Device Error', deviceStatus.message);
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    try {
      if (type === 'fingerprint') {
        await performFingerprintScan();
      } else {
        await performRetinaScan();
      }
    } catch (error) {
      setIsScanning(false);
      onVerificationComplete({
        success: false,
        error: `${type} scan failed: ${error}`
      });
    }
  };

  const performFingerprintScan = async () => {
    try {
      setCurrentStep('Place right thumb on scanner');
      
      // Simulate scan progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const result = await FingerprintService.captureAndVerifyFingerprint(
        candidateTemplates?.fingerprint1,
        candidateTemplates?.fingerprint2
      );

      clearInterval(progressInterval);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        onVerificationComplete({
          success: result.success,
          confidence: result.confidence,
          quality: result.quality,
          error: result.error
        });
      }, 1000);

    } catch (error) {
      setIsScanning(false);
      onVerificationComplete({
        success: false,
        error: `Fingerprint verification failed: ${error}`
      });
    }
  };

  const performRetinaScan = async () => {
    try {
      setCurrentStep('Look into the retina scanner');

      // Simulate retina scan progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 12;
        });
      }, 300);

      // Simulate retina scanning process
      await new Promise(resolve => {
        setTimeout(() => {
          clearInterval(progressInterval);
          setScanProgress(100);
          resolve(true);
        }, 5000);
      });

      // Simulate verification result
      const confidence = 70 + Math.random() * 30; // 70-100%
      const success = confidence > 80;

      setTimeout(() => {
        setIsScanning(false);
        onVerificationComplete({
          success,
          confidence: Math.round(confidence),
          error: success ? undefined : 'Retina pattern not recognized'
        });
      }, 1000);

    } catch (error) {
      setIsScanning(false);
      onVerificationComplete({
        success: false,
        error: `Retina scan failed: ${error}`
      });
    }
  };

  const getInstructions = () => {
    if (type === 'fingerprint') {
      return {
        title: 'Fingerprint Verification',
        subtitle: 'Place both thumbs on the scanner when prompted',
        icon: '👆',
        deviceName: 'Mantra MFS 110 L1'
      };
    } else {
      return {
        title: 'Retina Verification',
        subtitle: 'Look directly into the retina scanner',
        icon: '👁️',
        deviceName: 'Mantra IRIS Scanner'
      };
    }
  };

  const instructions = getInstructions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{instructions.title}</Text>
        <Text style={styles.subtitle}>{instructions.subtitle}</Text>
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.deviceFrame}>
          <Text style={styles.deviceIcon}>{instructions.icon}</Text>
          <Text style={styles.deviceName}>{instructions.deviceName}</Text>
          
          <View style={[
            styles.statusIndicator, 
            { backgroundColor: deviceStatus.connected ? '#4CAF50' : '#f44336' }
          ]}>
            <Text style={styles.statusText}>
              {deviceStatus.connected ? '● Connected' : '● Not Connected'}
            </Text>
          </View>
        </View>

        {isScanning && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.scanningText}>{currentStep}</Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${scanProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(scanProgress)}%
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              { backgroundColor: deviceStatus.connected ? '#2196F3' : '#cccccc' }
            ]}
            onPress={startScan}
            disabled={!deviceStatus.connected || isScanning}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : `Start ${instructions.title}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkDeviceStatus}
            disabled={isScanning}
          >
            <Text style={styles.refreshButtonText}>🔄 Check Device</Text>
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isScanning}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusMessage}>{deviceStatus.message}</Text>
        
        {type === 'fingerprint' && (
          <Text style={styles.helpText}>
            • Ensure fingers are clean and dry{'\n'}
            • Place thumb firmly on scanner{'\n'}
            • Hold steady until scan completes
          </Text>
        )}
        
        {type === 'retina' && (
          <Text style={styles.helpText}>
            • Remove glasses if wearing any{'\n'}
            • Look directly into the scanner{'\n'}
            • Keep eyes open and steady
          </Text>
        )}
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  scannerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceFrame: {
    width: width * 0.8,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 30,
  },
  deviceIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statusIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scanningContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scanningText: {
    fontSize: 18,
    color: '#333',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    width: width * 0.7,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  scanButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
  },
  refreshButtonText: {
    color: '#666',
    fontSize: 16,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BiometricScanner;