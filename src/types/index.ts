// Core data types for Exam Verification App

export interface Candidate {
  rollNumber: string;
  name: string;
  photo?: string; // Base64 encoded image or file path
  examDate: string;
  shift: string;
  centre: string;
  fingerprint1?: string; // Base64 encoded fingerprint data
  fingerprint2?: string;
  retinaData?: string; // Base64 encoded retina scan data
  phone?: string;
  email?: string;
  fatherName?: string;
}

export interface Verifier {
  id: string;
  name: string;
  assignedDate: string;
  assignedShift: string;
  assignedCentre: string;
  password: string;
}

export interface VerificationResult {
  id: string;
  rollNumber: string;
  verifierId: string;
  timestamp: Date;
  qrScanned: boolean;
  faceVerified: boolean;
  faceConfidence?: number;
  fingerprintVerified: boolean;
  retinaVerified: boolean;
  finalStatus: 'VERIFIED' | 'REJECTED' | 'PARTIAL';
  notes?: string;
}

export interface VerificationStep {
  step: 'QR_SCAN' | 'FACE_RECOGNITION' | 'FINGERPRINT' | 'RETINA';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  confidence?: number;
  error?: string;
}

export interface AppState {
  currentVerifier?: Verifier;
  candidates: Candidate[];
  verificationResults: VerificationResult[];
  currentVerification?: {
    candidate: Candidate;
    steps: VerificationStep[];
  };
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Admin: { verifier?: Verifier };
  Verification: { candidate?: Candidate };
  CSVImport: undefined;
};

// CSV Import types
export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

// Device integration types
export interface BiometricDevice {
  type: 'FINGERPRINT' | 'RETINA';
  connected: boolean;
  model?: string;
}

export interface QRCodeData {
  rollNumber: string;
  name: string;
  examDate: string;
  shift: string;
  centre: string;
}