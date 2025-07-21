import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class PermissionsService {
  // Camera permissions
  async checkAndRequestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'This app needs access to camera for face verification',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  // Storage permissions for file operations
  async checkAndRequestStoragePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === 
          PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === 
          PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Storage permission error:', error);
      return false;
    }
  }

  // Location permission (if needed for exam center verification)
  async checkAndRequestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'This app needs location access for exam center verification',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  // Check all required permissions at once
  async checkAllRequiredPermissions(): Promise<{
    camera: boolean;
    storage: boolean;
    location: boolean;
    allGranted: boolean;
  }> {
    const camera = await this.checkAndRequestCameraPermission();
    const storage = await this.checkAndRequestStoragePermission();
    const location = await this.checkAndRequestLocationPermission();

    return {
      camera,
      storage,
      location,
      allGranted: camera && storage && location
    };
  }

  // Request all permissions with user-friendly messages
  async requestAllPermissions(): Promise<boolean> {
    try {
      Alert.alert(
        'Permissions Required',
        'This app requires camera, storage, and location permissions to function properly.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => false
          },
          {
            text: 'Grant Permissions',
            onPress: async () => {
              const permissions = await this.checkAllRequiredPermissions();
              return permissions.allGranted;
            }
          }
        ]
      );
      
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  // Check specific permission status
  async checkPermissionStatus(permission: 'camera' | 'storage' | 'location'): Promise<boolean> {
    try {
      let permissionToCheck;
      
      if (Platform.OS === 'android') {
        switch (permission) {
          case 'camera':
            permissionToCheck = PermissionsAndroid.PERMISSIONS.CAMERA;
            break;
          case 'storage':
            permissionToCheck = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
            break;
          case 'location':
            permissionToCheck = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
            break;
        }
        
        const result = await PermissionsAndroid.check(permissionToCheck);
        return result;
      } else {
        switch (permission) {
          case 'camera':
            permissionToCheck = PERMISSIONS.IOS.CAMERA;
            break;
          case 'storage':
            permissionToCheck = PERMISSIONS.IOS.PHOTO_LIBRARY;
            break;
          case 'location':
            permissionToCheck = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
            break;
        }
        
        const result = await check(permissionToCheck);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error(`Permission check error for ${permission}:`, error);
      return false;
    }
  }

  // Show permission rationale to user
  showPermissionRationale(permission: 'camera' | 'storage' | 'location') {
    const messages = {
      camera: 'Camera permission is required for face recognition verification. Please enable it in device settings.',
      storage: 'Storage permission is required to save and import verification data. Please enable it in device settings.',
      location: 'Location permission is required to verify exam center location. Please enable it in device settings.'
    };

    Alert.alert(
      'Permission Required',
      messages[permission],
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // In a real app, you would open device settings
          console.log('Opening device settings for', permission);
        }}
      ]
    );
  }
}

export default new PermissionsService();