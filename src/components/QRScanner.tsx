import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevices, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';

interface Props {
  onCodeScanned: (data: string) => void;
  onCancel?: () => void;
}

const QRScanner: React.FC<Props> = ({ onCodeScanned, onCancel }) => {
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isScanning, setIsScanning] = useState(true);
  
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // Get back camera from devices array
  const backCamera = devices.find(device => device.position === 'back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128', 'pdf-417', 'aztec', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (!isScanning || codes.length === 0) return;

      const code = codes[0];
      console.log('QR Code scanned:', code.value);

      // Vibrate on successful scan
      Vibration.vibrate(100);
      
      // Stop scanning temporarily
      setIsScanning(false);
      
      // Process the scanned code
      handleCodeScanned(code.value || '');
      
      // Re-enable scanning after 2 seconds
      setTimeout(() => {
        setIsScanning(true);
      }, 2000);
    },
  });

  const handleCodeScanned = (data: string) => {
    try {
      console.log('Processing scanned data:', data);

      // Try to parse as JSON first (for structured QR codes)
      try {
        const parsedData = JSON.parse(data);
        if (parsedData.rollNumber) {
          onCodeScanned(JSON.stringify(parsedData));
          return;
        }
      } catch (jsonError) {
        console.log('Not JSON data, processing as plain text');
      }

      // Check if it's a roll number pattern
      if (data.match(/^[A-Z]{2,4}\d{4,8}$/)) {
        console.log('Roll number pattern detected:', data);
        onCodeScanned(data);
        return;
      }

      // For any other data, pass it through
      onCodeScanned(data);

    } catch (error) {
      console.error('Error processing scanned code:', error);
      Alert.alert('Scan Error', 'Unable to process the scanned code. Please try again.');
      setIsScanning(true);
    }
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  const retryScan = () => {
    setIsScanning(true);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required for QR scanning</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!backCamera) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Back camera not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={backCamera}
        isActive={true}
        codeScanner={isScanning ? codeScanner : undefined}
        torch={flashMode}
      >
        <View style={styles.overlay}>
          <View style={styles.topContainer}>
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.subtitle}>
              Position the QR code or barcode within the frame
            </Text>
          </View>

          <View style={styles.scanFrame}>
            <View style={styles.frameCorner} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
            
            {!isScanning && (
              <View style={styles.scanningComplete}>
                <Text style={styles.scanningCompleteText}>✓</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={toggleFlash}
            >
              <Text style={styles.flashButtonText}>
                {flashMode === 'off' ? '🔦' : '💡'}
              </Text>
            </TouchableOpacity>

            {!isScanning && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryScan}
              >
                <Text style={styles.retryButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}

            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Supported formats: QR Code, Code 128, PDF417, Data Matrix, Aztec
            </Text>
            <Text style={styles.statusText}>
              Status: {isScanning ? 'Scanning...' : 'Code Detected'}
            </Text>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const { width, height } = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#00ff00',
    top: (height - frameSize) / 2 - 25,
    left: (width - frameSize) / 2 - 25,
  },
  topRight: {
    borderRightWidth: 4,
    borderLeftWidth: 0,
    right: (width - frameSize) / 2 - 25,
    left: 'auto' as any,
  },
  bottomLeft: {
    borderBottomWidth: 4,
    borderTopWidth: 0,
    bottom: (height - frameSize) / 2 - 25,
    top: 'auto' as any,
  },
  bottomRight: {
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: (height - frameSize) / 2 - 25,
    right: (width - frameSize) / 2 - 25,
    top: 'auto' as any,
    left: 'auto' as any,
  },
  scanningComplete: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningCompleteText: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  flashButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonText: {
    fontSize: 28,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusText: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScanner;