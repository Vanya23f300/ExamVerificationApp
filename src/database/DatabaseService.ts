import { Client } from 'pg';
import { Candidate, Verifier, VerificationResult } from '../types';

class DatabaseService {
  private client: Client | null = null;
  private isConnected = false;

  constructor() {
    this.client = new Client({
      user: process.env.DB_USER || 'exam_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'exam_verification_db',
      password: process.env.DB_PASSWORD || 'exam_password',
      port: parseInt(process.env.DB_PORT || '5432'),
    });
  }

  async initDatabase() {
    try {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to PostgreSQL database successfully');
      
      await this.createTables();
      await this.createIndexes();
      await this.insertSampleData();
      
      console.log('PostgreSQL database initialization completed');
    } catch (error) {
      console.error('PostgreSQL database initialization error:', error);
      this.isConnected = false;
      throw new Error(`Database connection failed: ${error}. Please ensure PostgreSQL is running and connection details are correct.`);
    }
  }

  private async createTables() {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS centres (
        id SERIAL PRIMARY KEY,
        centre_code VARCHAR(50) UNIQUE NOT NULL,
        centre_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        capacity INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        shift_code VARCHAR(50) UNIQUE NOT NULL,
        shift_name VARCHAR(100) NOT NULL,
        start_time TIME,
        end_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS candidates (
        roll_number VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        exam_date DATE,
        shift VARCHAR(100),
        centre VARCHAR(255),
        photo TEXT,
        fingerprint1 TEXT,
        fingerprint2 TEXT,
        retina_data TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        father_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS verifiers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        assigned_date DATE,
        assigned_shift VARCHAR(100),
        assigned_centre VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS verification_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        roll_number VARCHAR(50) REFERENCES candidates(roll_number),
        verifier_id VARCHAR(100) REFERENCES verifiers(id),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        qr_scanned BOOLEAN DEFAULT FALSE,
        face_verified BOOLEAN DEFAULT FALSE,
        face_confidence DECIMAL(5,2),
        fingerprint_verified BOOLEAN DEFAULT FALSE,
        retina_verified BOOLEAN DEFAULT FALSE,
        final_status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        verification_duration INTEGER,
        device_info JSONB
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        verifier_id VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET
      )`
    ];

    try {
      for (const query of queries) {
        await this.client.query(query);
      }
      console.log('PostgreSQL tables created successfully');
    } catch (error) {
      console.error('Error creating PostgreSQL tables:', error);
      throw error;
    }
  }

  private async createIndexes() {
    if (!this.client || !this.isConnected) return;

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_candidates_exam_date ON candidates(exam_date)',
      'CREATE INDEX IF NOT EXISTS idx_candidates_centre ON candidates(centre)',
      'CREATE INDEX IF NOT EXISTS idx_verification_results_timestamp ON verification_results(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_verification_results_status ON verification_results(final_status)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)'
    ];

    try {
      for (const index of indexes) {
        await this.client.query(index);
      }
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  private async insertSampleData(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      // Check if sample data already exists
      const existingCandidates = await this.client.query('SELECT COUNT(*) FROM candidates');
      if (parseInt(existingCandidates.rows[0].count) > 0) {
        console.log('Sample data already exists, skipping insertion');
        return;
      }

      // Insert sample centres
      await this.client.query(`
        INSERT INTO centres (centre_code, centre_name, location) VALUES
        ('JEE001', 'Delhi Centre 1', 'New Delhi'),
        ('JEE002', 'Mumbai Centre 1', 'Mumbai'),
        ('JEE003', 'Bangalore Centre 1', 'Bangalore')
        ON CONFLICT (centre_code) DO NOTHING
      `);

      // Insert sample shifts
      await this.client.query(`
        INSERT INTO shifts (shift_code, shift_name, start_time, end_time) VALUES
        ('S1', 'Morning Shift', '09:00:00', '12:00:00'),
        ('S2', 'Afternoon Shift', '14:00:00', '17:00:00')
        ON CONFLICT (shift_code) DO NOTHING
      `);

      // Insert sample verifiers
      await this.client.query(`
        INSERT INTO verifiers (id, name, assigned_date, assigned_shift, assigned_centre, password) VALUES
        ('V001', 'John Doe', '2025-07-21', 'S1', 'Delhi Centre 1', 'password123'),
        ('V002', 'Jane Smith', '2025-07-21', 'S2', 'Mumbai Centre 1', 'password123'),
        ('ADMIN', 'System Admin', '2025-07-21', 'S1', 'Delhi Centre 1', 'admin123')
        ON CONFLICT (id) DO NOTHING
      `);

      // Insert sample candidates with biometric templates
      const sampleCandidates = [
        {
          rollNumber: 'JEE2024001',
          name: 'Rahul Sharma',
          examDate: '2025-07-21',
          shift: 'S1',
          centre: 'Delhi Centre 1',
          phone: '9876543210',
          email: 'rahul.sharma@example.com',
          fatherName: 'Suresh Sharma',
          photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
          fingerprint1: 'fp1_template_base64_data_rahul',
          fingerprint2: 'fp2_template_base64_data_rahul',
          retinaData: 'retina_template_base64_data_rahul'
        },
        {
          rollNumber: 'JEE2024002',
          name: 'Priya Patel',
          examDate: '2025-07-21',
          shift: 'S1',
          centre: 'Delhi Centre 1',
          phone: '9876543211',
          email: 'priya.patel@example.com',
          fatherName: 'Raj Patel',
          photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
          fingerprint1: 'fp1_template_base64_data_priya',
          fingerprint2: 'fp2_template_base64_data_priya',
          retinaData: 'retina_template_base64_data_priya'
        },
        {
          rollNumber: 'JEE2024003',
          name: 'Amit Singh',
          examDate: '2025-07-21',
          shift: 'S2',
          centre: 'Mumbai Centre 1',
          phone: '9876543212',
          email: 'amit.singh@example.com',
          fatherName: 'Ravi Singh',
          fingerprint1: 'fp1_template_base64_data_amit',
          fingerprint2: 'fp2_template_base64_data_amit',
          retinaData: 'retina_template_base64_data_amit'
        }
      ];

      for (const candidate of sampleCandidates) {
        await this.client.query(
          `INSERT INTO candidates (roll_number, name, exam_date, shift, centre, photo, fingerprint1, fingerprint2, retina_data, phone, email, father_name) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (roll_number) DO NOTHING`,
          [
            candidate.rollNumber,
            candidate.name,
            candidate.examDate,
            candidate.shift,
            candidate.centre,
            candidate.photo || null,
            candidate.fingerprint1,
            candidate.fingerprint2,
            candidate.retinaData,
            candidate.phone,
            candidate.email,
            candidate.fatherName
          ]
        );
      }

      console.log('Sample data inserted successfully');
    } catch (error) {
      console.error('Error inserting sample data:', error);
    }
  }

  async getCandidateByRollNumber(rollNumber: string): Promise<Candidate | null> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query(
        'SELECT * FROM candidates WHERE roll_number = $1',
        [rollNumber]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          rollNumber: row.roll_number,
          name: row.name,
          examDate: row.exam_date,
          shift: row.shift,
          centre: row.centre,
          photo: row.photo,
          fingerprint1: row.fingerprint1,
          fingerprint2: row.fingerprint2,
          retinaData: row.retina_data,
          phone: row.phone,
          email: row.email,
          fatherName: row.father_name
        };
      }
      return null;
    } catch (error) {
      console.error('Get candidate error:', error);
      throw new Error(`Failed to fetch candidate: ${error}`);
    }
  }

  async verifyLogin(id: string, password: string): Promise<Verifier | null> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query(
        'SELECT * FROM verifiers WHERE id = $1 AND password = $2 AND is_active = TRUE',
        [id, password]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          assignedDate: row.assigned_date,
          assignedShift: row.assigned_shift,
          assignedCentre: row.assigned_centre,
          password: row.password
        };
      }
      return null;
    } catch (error) {
      console.error('Login verification error:', error);
      throw new Error(`Login failed: ${error}`);
    }
  }

  async insertVerificationResult(result: VerificationResult): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query(
        `INSERT INTO verification_results 
        (roll_number, verifier_id, timestamp, qr_scanned, face_verified, 
        face_confidence, fingerprint_verified, retina_verified, final_status, notes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          result.rollNumber,
          result.verifierId,
          result.timestamp,
          result.qrScanned,
          result.faceVerified,
          result.faceConfidence || null,
          result.fingerprintVerified,
          result.retinaVerified,
          result.finalStatus,
          result.notes || ''
        ]
      );
      return true;
    } catch (error) {
      console.error('Insert verification result error:', error);
      throw new Error(`Failed to save verification result: ${error}`);
    }
  }

  async insertCandidate(candidate: Candidate): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query(
        `INSERT INTO candidates 
        (roll_number, name, exam_date, shift, centre, photo, fingerprint1, fingerprint2, retina_data, phone, email, father_name) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (roll_number) DO UPDATE SET
        name = $2, exam_date = $3, shift = $4, centre = $5, phone = $10, email = $11, father_name = $12, updated_at = CURRENT_TIMESTAMP`,
        [
          candidate.rollNumber,
          candidate.name,
          candidate.examDate,
          candidate.shift,
          candidate.centre,
          candidate.photo || null,
          candidate.fingerprint1 || null,
          candidate.fingerprint2 || null,
          candidate.retinaData || null,
          candidate.phone || null,
          candidate.email || null,
          candidate.fatherName || null
        ]
      );
      return true;
    } catch (error) {
      console.error('Insert candidate error:', error);
      throw new Error(`Failed to insert candidate: ${error}`);
    }
  }

  async getCandidatesByVerifier(verifierId: string): Promise<Candidate[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const verifier = await this.client.query(
        'SELECT * FROM verifiers WHERE id = $1',
        [verifierId]
      );

      if (verifier.rows.length === 0) return [];

      const verifierData = verifier.rows[0];
      
      const result = await this.client.query(
        `SELECT * FROM candidates 
         WHERE exam_date = $1 AND shift = $2 AND centre = $3
         ORDER BY name`,
        [verifierData.assigned_date, verifierData.assigned_shift, verifierData.assigned_centre]
      );

      return result.rows.map(row => ({
        rollNumber: row.roll_number,
        name: row.name,
        examDate: row.exam_date,
        shift: row.shift,
        centre: row.centre,
        photo: row.photo,
        fingerprint1: row.fingerprint1,
        fingerprint2: row.fingerprint2,
        retinaData: row.retina_data,
        phone: row.phone,
        email: row.email,
        fatherName: row.father_name
      }));
    } catch (error) {
      console.error('Get candidates by verifier error:', error);
      throw new Error(`Failed to fetch candidates: ${error}`);
    }
  }

  async getAllCandidates(): Promise<Candidate[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query('SELECT * FROM candidates ORDER BY name');
      return result.rows.map(row => ({
        rollNumber: row.roll_number,
        name: row.name,
        examDate: row.exam_date,
        shift: row.shift,
        centre: row.centre,
        photo: row.photo,
        fingerprint1: row.fingerprint1,
        fingerprint2: row.fingerprint2,
        retinaData: row.retina_data,
        phone: row.phone,
        email: row.email,
        fatherName: row.father_name
      }));
    } catch (error) {
      console.error('Get all candidates error:', error);
      throw new Error(`Failed to fetch all candidates: ${error}`);
    }
  }

  async getVerificationStatistics(date?: string): Promise<{
    totalCandidates: number;
    verified: number;
    rejected: number;
    pending: number;
    partiallyVerified: number;
  }> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const dateFilter = date ? 'WHERE DATE(timestamp) = $1' : '';
      const params = date ? [date] : [];

      const result = await this.client.query(`
        SELECT 
          COUNT(*) as total_candidates,
          COUNT(CASE WHEN final_status = 'VERIFIED' THEN 1 END) as verified,
          COUNT(CASE WHEN final_status = 'REJECTED' THEN 1 END) as rejected,
          COUNT(CASE WHEN final_status = 'PENDING' THEN 1 END) as pending,
          COUNT(CASE WHEN final_status = 'PARTIAL' THEN 1 END) as partially_verified
        FROM verification_results
        ${dateFilter}
      `, params);

      const row = result.rows[0];
      return {
        totalCandidates: parseInt(row.total_candidates) || 0,
        verified: parseInt(row.verified) || 0,
        rejected: parseInt(row.rejected) || 0,
        pending: parseInt(row.pending) || 0,
        partiallyVerified: parseInt(row.partially_verified) || 0
      };
    } catch (error) {
      console.error('Get statistics error:', error);
      throw new Error(`Failed to get statistics: ${error}`);
    }
  }

  async bulkInsertCandidates(candidates: Candidate[]): Promise<{ success: number; failed: number }> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    let success = 0;
    let failed = 0;

    try {
      await this.client.query('BEGIN');

      for (const candidate of candidates) {
        try {
          await this.client.query(
            `INSERT INTO candidates 
            (roll_number, name, exam_date, shift, centre, photo, fingerprint1, fingerprint2, retina_data, phone, email, father_name) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (roll_number) DO UPDATE SET
            name = $2, exam_date = $3, shift = $4, centre = $5, phone = $10, email = $11, father_name = $12, updated_at = CURRENT_TIMESTAMP`,
            [
              candidate.rollNumber,
              candidate.name,
              candidate.examDate,
              candidate.shift,
              candidate.centre,
              candidate.photo || null,
              candidate.fingerprint1 || null,
              candidate.fingerprint2 || null,
              candidate.retinaData || null,
              candidate.phone || null,
              candidate.email || null,
              candidate.fatherName || null
            ]
          );
          success++;
        } catch (error) {
          console.error(`Failed to insert candidate ${candidate.rollNumber}:`, error);
          failed++;
        }
      }

      await this.client.query('COMMIT');
      return { success, failed };
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('Batch insert error:', error);
      throw new Error(`Bulk insert failed: ${error}`);
    }
  }

  async logAction(verifierId: string, action: string, details: any, ipAddress?: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.query(
        'INSERT INTO audit_logs (verifier_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
        [verifierId, action, JSON.stringify(details), ipAddress]
      );
      return true;
    } catch (error) {
      console.error('Log action error:', error);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      await this.client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async closeDatabase() {
    try {
      if (this.client && this.isConnected) {
        await this.client.end();
        this.client = null;
        this.isConnected = false;
        console.log('PostgreSQL database connection closed');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

export default new DatabaseService();