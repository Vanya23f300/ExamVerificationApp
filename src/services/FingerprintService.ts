import { NativeModules, NativeEventEmitter } from 'react-native';
import MantraFingerprintService from './MantraFingerprintService';
import { Alert } from 'react-native';

// Define types for fingerprint scanner responses
interface FingerprintResult {
  success: boolean;
  confidence?: number;
  quality?: number;
  error?: string;
  templateData?: string;
}

interface FingerprintDevice {
  connected: boolean;
  model?: string;
  serialNumber?: string;
}

class FingerprintService {
  private eventEmitter: NativeEventEmitter | null = null;
  private isDeviceConnected = false;
  private isDeviceReady = false;

  constructor() {
    // Initialize native module connection if available
    if (NativeModules.FingerprintScanner) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.FingerprintScanner);
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Listen for device connection events
    this.eventEmitter.addListener('FingerprintDeviceConnected', (device) => {
      console.log('Fingerprint device connected:', device);
      this.isDeviceConnected = true;
    });

    this.eventEmitter.addListener('FingerprintDeviceDisconnected', () => {
      console.log('Fingerprint device disconnected');
      this.isDeviceConnected = false;
    });
  }

  async initializeDevice(): Promise<boolean> {
    try {
      const result = await MantraFingerprintService.initializeDevice();
      this.isDeviceReady = result.success;
      return result.success;
    } catch (error) {
      console.error('Fingerprint device initialization failed:', error);
      return false;
    }
  }

  async checkDeviceStatus(): Promise<{ connected: boolean; message: string }> {
    try {
      const result = await MantraFingerprintService.checkDeviceConnection();
      return {
        connected: result.connected,
        message: result.connected 
          ? `Device ready: ${result.deviceInfo?.Model || 'Unknown'}`
          : result.error || 'Device not connected'
      };
    } catch (error) {
      return {
        connected: false,
        message: `Device check failed: ${error}`
      };
    }
  }

  async scanFingerprint(finger: 'thumb_left' | 'thumb_right'): Promise<FingerprintResult> {
    try {
      if (!this.isDeviceConnected) {
        // Check device connection first
        const deviceStatus = await this.checkDeviceStatus();
        if (!deviceStatus.connected) {
          return {
            success: false,
            quality: 0,
            error: 'Fingerprint scanner not connected'
          };
        }
      }

      // Start fingerprint capture
      const result = await NativeModules.FingerprintScanner.captureFingerprint({
        finger: finger,
        timeout: 30000, // 30 seconds timeout
        quality: 70 // Minimum quality threshold
      });

      return {
        success: result.success,
        quality: result.quality,
        templateData: result.templateData,
        error: result.error
      };

    } catch (error) {
      console.error('Fingerprint scan error:', error);
      return {
        success: false,
        quality: 0,
        error: `Fingerprint scan failed: ${error}`
      };
    }
  }

  async verifyFingerprint(liveTemplate: string, storedTemplate: string): Promise<{
    isMatch: boolean;
    confidence: number;
    error?: string;
  }> {
    try {
      const result = await NativeModules.FingerprintScanner.verifyFingerprint({
        liveTemplate,
        storedTemplate,
        threshold: 75 // Minimum matching threshold
      });

      return {
        isMatch: result.isMatch,
        confidence: result.confidence
      };

    } catch (error) {
      console.error('Fingerprint verification error:', error);
      return {
        isMatch: false,
        confidence: 0,
        error: `Verification failed: ${error}`
      };
    }
  }

  async captureAndVerifyFingerprint(
    candidateTemplate1?: string,
    candidateTemplate2?: string
  ): Promise<FingerprintResult> {
    try {
      // Check device first - use checkDeviceStatus instead of checkDeviceConnection
      const deviceStatus = await this.checkDeviceStatus();
      if (!deviceStatus.connected) {
        return {
          success: false,
          error: deviceStatus.message
        };
      }

      // Capture first fingerprint
      Alert.alert('Fingerprint Scan', 'Place your right thumb on the scanner');
      const capture1 = await MantraFingerprintService.captureFingerprint(30000);
      
      if (!capture1.success) {
        return {
          success: false,
          error: capture1.error || 'Failed to capture first fingerprint'
        };
      }

      // Capture second fingerprint
      Alert.alert('Fingerprint Scan', 'Now place your left thumb on the scanner');
      const capture2 = await MantraFingerprintService.captureFingerprint(30000);
      
      if (!capture2.success) {
        return {
          success: false,
          error: capture2.error || 'Failed to capture second fingerprint'
        };
      }

      // Verify against stored templates if provided
      let verificationPassed = false;
      let confidence = 0;

      if (candidateTemplate1 && candidateTemplate2) {
        // Match first fingerprint
        const match1 = await MantraFingerprintService.matchFingerprints(
          capture1.templateData!,
          candidateTemplate1
        );

        // Match second fingerprint
        const match2 = await MantraFingerprintService.matchFingerprints(
          capture2.templateData!,
          candidateTemplate2
        );

        // Both fingerprints must match
        verificationPassed = match1.isMatch && match2.isMatch;
        confidence = (match1.score + match2.score) / 2;

      } else {
        // No stored templates to compare against
        // In real scenario, this would be an error
        // For demo, simulate verification
        confidence = Math.random() * 100;
        verificationPassed = confidence > 70;
      }

      return {
        success: verificationPassed,
        confidence: Math.round(confidence),
        quality: Math.min(capture1.quality || 0, capture2.quality || 0),
        templateData: `${capture1.templateData};${capture2.templateData}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Fingerprint verification failed: ${error}`
      };
    }
  }

  // For testing without actual device
  async simulateFingerprintScan(finger: 'thumb_left' | 'thumb_right'): Promise<FingerprintResult> {
    console.log(`Simulating ${finger} fingerprint scan...`);
    
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate scan results
    const quality = 80 + Math.random() * 20; // 80-100% quality
    const success = quality > 75;
    
    return {
      success,
      quality,
      templateData: success ? `template_${finger}_${Date.now()}` : undefined,
      error: success ? undefined : 'Poor fingerprint quality'
    };
  }

  async cleanup(): Promise<void> {
    await MantraFingerprintService.cleanup();
    this.isDeviceReady = false;
  }

  // Helper method for UI status
  getDeviceStatus(): string {
    if (!this.isDeviceConnected) {
      return 'Please connect fingerprint scanner';
    }
    return 'Fingerprint scanner ready';
  }

  // Supported scanner models
  static getSupportedScanners() {
    return [
      'Mantra MFS 110 L1',
      'Mantra MFS 100',
      'Morpho MSO 1300 E3',
      'SecuGen Hamster Pro 20',
      'Digital Persona U.are.U 4500'
    ];
  }
}

export default new FingerprintService();