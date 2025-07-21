import { Candidate } from '../types';
import DatabaseService from '../database/DatabaseService';

class SampleDataService {
  async initializeSampleCandidates() {
    const sampleCandidates: Candidate[] = [
      {
        rollNumber: 'JEE2024001',
        name: 'Amit Kumar',
        examDate: '2024-01-15',
        shift: 'Morning',
        centre: 'Centre A',
        photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        fingerprint1: 'sample_fingerprint_data_1',
        fingerprint2: 'sample_fingerprint_data_2',
        retinaData: 'sample_retina_data',
      },
      {
        rollNumber: 'JEE2024002',
        name: 'Priya Sharma',
        examDate: '2024-01-15',
        shift: 'Morning',
        centre: 'Centre A',
        fingerprint1: 'sample_fingerprint_data_3',
        fingerprint2: 'sample_fingerprint_data_4',
        retinaData: 'sample_retina_data_2',
      },
      {
        rollNumber: 'JEE2024003',
        name: 'Raj Patel',
        examDate: '2024-01-15',
        shift: 'Afternoon',
        centre: 'Centre B',
        fingerprint1: 'sample_fingerprint_data_5',
        fingerprint2: 'sample_fingerprint_data_6',
        retinaData: 'sample_retina_data_3',
      },
      {
        rollNumber: 'JEE2024004',
        name: 'Neha Singh',
        examDate: '2024-01-15',
        shift: 'Morning',
        centre: 'Centre A',
        fingerprint1: 'sample_fingerprint_data_7',
        fingerprint2: 'sample_fingerprint_data_8',
        retinaData: 'sample_retina_data_4',
      },
      {
        rollNumber: 'JEE2024005',
        name: 'Vikram Reddy',
        examDate: '2024-01-15',
        shift: 'Afternoon',
        centre: 'Centre B',
        fingerprint1: 'sample_fingerprint_data_9',
        fingerprint2: 'sample_fingerprint_data_10',
        retinaData: 'sample_retina_data_5',
      }
    ];

    try {
      let successCount = 0;
      for (const candidate of sampleCandidates) {
        const success = await DatabaseService.insertCandidate(candidate);
        if (success) {
          successCount++;
        }
      }
      
      console.log(`Initialized ${successCount} sample candidates`);
      return successCount;
    } catch (error) {
      console.error('Error initializing sample data:', error);
      return 0;
    }
  }

  async checkIfSampleDataExists(): Promise<boolean> {
    try {
      const candidate = await DatabaseService.getCandidateByRollNumber('JEE2024001');
      return candidate !== null;
    } catch (error) {
      console.error('Error checking sample data:', error);
      return false;
    }
  }

  async initializeIfNeeded() {
    const dataExists = await this.checkIfSampleDataExists();
    if (!dataExists) {
      console.log('Sample data not found, initializing...');
      await this.initializeSampleCandidates();
    } else {
      console.log('Sample data already exists');
    }
  }
}

export default new SampleDataService(); 