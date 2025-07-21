import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import HuggingFaceService from '../services/HuggingFaceService';
import FaceRecognitionService from '../services/FaceRecognitionService';

interface Props {
  onVerificationComplete: (result: {
    success: boolean;
    confidence: number;
    error?: string;
  }) => void;
  candidatePhoto?: string;
  onCancel?: () => void;
}

const FaceRecognition: React.FC<Props> = ({ 
  onVerificationComplete, 
  candidatePhoto, 
  onCancel 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // Get front camera from devices array
  const frontCamera = devices.find(device => device.position === 'front');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const capturePhoto = async () => {
    if (!camera.current) return;

    try {
      setIsProcessing(true);
      
      const photo = await camera.current.takePhoto({
        flash: flashMode,
      });

      const imageUri = `file://${photo.path}`;
      setCapturedImage(imageUri);

      // Convert to base64 for face recognition
      const base64Image = await convertImageToBase64(imageUri);
      await performFaceVerification(base64Image);

    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsProcessing(false);
    }
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      // For demo purposes, return a placeholder base64
      // In production, you'd use a library like react-native-fs to convert
      return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    } catch (error) {
      console.error('Image conversion error:', error);
      return '';
    }
  };

  const performFaceVerification = async (liveImageBase64: string) => {
    try {
      let result;

      if (candidatePhoto) {
        // Extract base64 from candidate photo if it's a data URI
        const candidateBase64 = candidatePhoto.startsWith('data:') 
          ? candidatePhoto.split(',')[1] 
          : candidatePhoto;

        // Try Hugging Face service first
        try {
          result = await HuggingFaceService.verifyFaces(
            candidateBase64, 
            liveImageBase64
          );
        } catch (hfError) {
          console.log('Hugging Face failed, trying Face Recognition service:', hfError);
          // Fallback to Face Recognition service
          result = await FaceRecognitionService.verifyFace(
            liveImageBase64,
            candidateBase64
          );
        }
      } else {
        // No reference photo, use simulation
        result = await FaceRecognitionService.simulatedFaceRecognition();
      }

      setConfidence(result.confidence || 0);

      // Wait a moment to show the confidence
      setTimeout(() => {
        setIsProcessing(false);
        onVerificationComplete({
          success: result.isMatch || (result.confidence && result.confidence > 75) || false,
          confidence: result.confidence || 0,
          error: (result as any).error || undefined // Fix TypeScript error by casting to any for optional error property
        });
      }, 1500);

    } catch (error) {
      console.error('Face verification error:', error);
      setIsProcessing(false);
      onVerificationComplete({
        success: false,
        confidence: 0,
        error: `Face verification failed: ${error}`
      });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setConfidence(0);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required for face verification</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!frontCamera) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Front camera not available</Text>
        </View>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Text style={styles.title}>Face Verification in Progress</Text>
          
          <View style={styles.imageRow}>
            {candidatePhoto && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Reference Photo</Text>
                <Image source={{ uri: candidatePhoto }} style={styles.previewImage} />
              </View>
            )}
            
            <View style={styles.imageContainer}>
              <Text style={styles.imageLabel}>Live Capture</Text>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            </View>
          </View>

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.processingText}>
                Analyzing face match...
              </Text>
              {confidence > 0 && (
                <Text style={styles.confidenceText}>
                  Confidence: {confidence.toFixed(1)}%
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Text style={styles.buttonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={frontCamera}
        isActive={true}
        photo={true}
      >
        <View style={styles.overlay}>
          <View style={styles.topContainer}>
            <Text style={styles.title}>Position Your Face</Text>
            <Text style={styles.subtitle}>
              Look directly at the camera and ensure your face is well-lit
            </Text>
          </View>

          <View style={styles.faceFrame}>
            <View style={styles.frameCorner} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={toggleFlash}
            >
              <Text style={styles.flashButtonText}>
                {flashMode === 'off' ? '💡' : '💡'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={capturePhoto}
              disabled={isProcessing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Camera>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

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
  faceFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#2196F3',
    top: -120,
    left: -80,
  },
  topRight: {
    borderRightWidth: 4,
    borderLeftWidth: 0,
    right: -80,
    left: 'auto' as any,
  },
  bottomLeft: {
    borderBottomWidth: 4,
    borderTopWidth: 0,
    bottom: -120,
    top: 'auto' as any,
  },
  bottomRight: {
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: -120,
    right: -80,
    top: 'auto' as any,
    left: 'auto' as any,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 50,
  },
  flashButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonText: {
    fontSize: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2196F3',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 30,
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageLabel: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  previewImage: {
    width: 150,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  processingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  confidenceText: {
    color: '#2196F3',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  retakeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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

export default FaceRecognition;