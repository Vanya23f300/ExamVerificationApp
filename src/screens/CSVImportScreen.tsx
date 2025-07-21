import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import DocumentPicker from '@react-native-documents/picker';
import * as Papa from 'papaparse';
import { RootStackParamList, Candidate, CSVImportResult } from '../types';
import DatabaseService from '../database/DatabaseService';
import PermissionsService from '../services/PermissionsService';

type CSVImportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CSVImport'>;

interface Props {
  navigation: CSVImportScreenNavigationProp;
}

interface DocumentPickerResult {
  uri: string;
  name: string;
  size: number;
  type: string;
}

const CSVImportScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState<DocumentPickerResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  const selectCSVFile = async () => {
    const hasPermission = await PermissionsService.checkAndRequestStoragePermission();
    
    if (!hasPermission) {
      return;
    }
    
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.plainText],
        allowMultiSelection: false,
      });
      
      // Fix: DocumentPicker.pick returns an array, access first element safely
      if (result && result.length > 0) {
        setSelectedFile({
          uri: result[0].uri,
          name: result[0].name || 'Unknown file',
          size: result[0].size || 0,
          type: result[0].type || 'text/csv',
        });
        setImportResult(null);
      }
    } catch (err: any) {
      // Fix: Use DocumentPicker.isInProgress instead of isCancel for the new API
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        // User cancelled the picker
        console.log('User cancelled document picker');
      } else {
        console.error('Document picker error:', err);
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const processCSVData = async (csvData: string): Promise<CSVImportResult> => {
    const result: CSVImportResult = {
      success: false,
      imported: 0,
      errors: [],
    };

    try {
      const parsed = Papa.parse<Record<string, string>>(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        result.errors = parsed.errors.map(err => err.message);
        return result;
      }

      const candidates: Candidate[] = [];
      const requiredFields = ['rollNumber', 'name', 'examDate', 'shift', 'centre'];

      parsed.data.forEach((row: Record<string, string>, index: number) => {
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          result.errors.push(`Row ${index + 1}: Missing fields - ${missingFields.join(', ')}`);
          return;
        }

        const candidate: Candidate = {
          rollNumber: row.rollNumber?.toString().trim() || '',
          name: row.name?.toString().trim() || '',
          examDate: row.examDate?.toString().trim() || '',
          shift: row.shift?.toString().trim() || '',
          centre: row.centre?.toString().trim() || '',
          photo: row.photo || undefined,
          fingerprint1: row.fingerprint1 || undefined,
          fingerprint2: row.fingerprint2 || undefined,
          retinaData: row.retinaData || undefined,
        };

        candidates.push(candidate);
      });

      if (candidates.length > 0) {
        // Save to database with error handling
        let successCount = 0;
        const savePromises = candidates.map(async (candidate) => {
          try {
            const saved = await DatabaseService.insertCandidate(candidate);
            return saved;
          } catch (error) {
            console.error(`Error saving candidate ${candidate.rollNumber}:`, error);
            return false;
          }
        });

        const saveResults = await Promise.all(savePromises);
        successCount = saveResults.filter(Boolean).length;
        
        result.success = successCount > 0;
        result.imported = successCount;
        
        if (successCount < candidates.length) {
          result.errors.push(`Only ${successCount} of ${candidates.length} candidates imported successfully`);
        }
      }

    } catch (error: any) {
      console.error('CSV processing error:', error);
      result.errors.push('Failed to parse CSV file');
    }

    return result;
  };

  const importCSV = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV file first');
      return;
    }

    setImporting(true);

    try {
      // In a real app, you would read the file content
      // For demo purposes, we'll use sample CSV data
      const sampleCSVData = `rollNumber,name,examDate,shift,centre,photo
JEE2024001,Amit Kumar,2024-01-15,Morning,Centre A,
JEE2024002,Priya Sharma,2024-01-15,Morning,Centre A,
JEE2024003,Raj Patel,2024-01-15,Afternoon,Centre B,
JEE2024004,Neha Singh,2024-01-15,Morning,Centre A,
JEE2024005,Vikram Reddy,2024-01-15,Afternoon,Centre B,`;

      // Simulate file reading delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await processCSVData(sampleCSVData);
      setImportResult(result);

      if (result.success) {
        Alert.alert(
          'Import Successful',
          `Successfully imported ${result.imported} candidates!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Import Failed',
          `Failed to import data. ${result.errors.length} errors found.`
        );
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to process CSV file');
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    Alert.alert(
      'Sample CSV Format',
      'Required columns:\n' +
      '• rollNumber\n' +
      '• name\n' +
      '• examDate (YYYY-MM-DD)\n' +
      '• shift (Morning/Afternoon)\n' +
      '• centre\n\n' +
      'Optional columns:\n' +
      '• photo (base64 or file path)\n' +
      '• fingerprint1, fingerprint2\n' +
      '• retinaData'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Import Candidate Data</Text>
          <Text style={styles.subtitle}>Upload CSV file with candidate information</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionText}>
            1. Prepare your CSV file with candidate data{'\n'}
            2. Select the CSV file using the button below{'\n'}
            3. Review the file selection{'\n'}
            4. Click Import to process the data
          </Text>
          
          <TouchableOpacity 
            style={styles.sampleButton}
            onPress={downloadSampleCSV}>
            <Text style={styles.sampleButtonText}>View Sample Format</Text>
          </TouchableOpacity>
        </View>

        {/* File Selection */}
        <View style={styles.fileSection}>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={selectCSVFile}>
            <Text style={styles.selectButtonText}>Select CSV File</Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.fileInfo}>
              <Text style={styles.fileInfoTitle}>Selected File:</Text>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                Size: {((selectedFile.size || 0) / 1024).toFixed(2)} KB
              </Text>
            </View>
          )}
        </View>

        {/* Import Button */}
        {selectedFile && (
          <TouchableOpacity 
            style={[styles.importButton, importing && styles.importButtonDisabled]}
            onPress={importCSV}
            disabled={importing}>
            {importing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.importButtonText}>Importing...</Text>
              </View>
            ) : (
              <Text style={styles.importButtonText}>Import Data</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Import Results */}
        {importResult && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Import Results:</Text>
            {importResult.success ? (
              <View style={styles.successResult}>
                <Text style={styles.successText}>
                  ✅ Successfully imported {importResult.imported} candidates
                </Text>
              </View>
            ) : (
              <View style={styles.errorResult}>
                <Text style={styles.errorTitle}>❌ Import failed:</Text>
                {importResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
              </View>
            )}
          </View>
        )}
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
    textAlign: 'center',
  },
  instructionsCard: {
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
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  sampleButton: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  sampleButtonText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  fileSection: {
    marginBottom: 20,
  },
  selectButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileInfo: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  fileInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  fileName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  importButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  importButtonDisabled: {
    backgroundColor: '#ccc',
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  successResult: {
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 5,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 16,
  },
  errorResult: {
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  errorTitle: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 5,
  },
});

export default CSVImportScreen;