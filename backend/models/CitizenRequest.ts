export type InputModality = 'TEXT' | 'VOICE' | 'PHOTO' | 'MIXED';
export type RequestChannel = 'web' | 'mobile' | 'assisted';
export type VerificationStatus = 'PENDING' | 'CONFIRMED' | 'NEEDS_CLARIFICATION';
export type CitizenRequestStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'NEEDS_CLARIFICATION'
  | 'REVIEW_REQUIRED'
  | 'FAILED';

export interface AIConfidence {
  category: number; // 0-1
  issue_type: number; // 0-1
  intent: number; // 0-1
  location: number; // 0-1
}

export interface CitizenRequest {
  request_id: string; // PK, format REQ-{state}-{number}
  created_at: string; // datetime (ISO 8601)
  input_modality: InputModality;
  channel: RequestChannel;
  language: string;
  raw_text: string | null;
  audio_uri: string | null;
  photo_uri: string | null;
  transcript: string | null;
  category_id: string | null;
  issue_type_id: string | null;
  issue_summary: string | null;
  severity: number | null; // integer 1-5 (display: 1-2 LOW, 3 MEDIUM, 4 HIGH, 5 CRITICAL)
  urgency: number | null; // integer 1-5 (display: 1-2 LOW, 3 MEDIUM, 4-5 HIGH)
  affected_service: string | null;
  geo_id: string | null;
  latitude: number | null;
  longitude: number | null;
  ai_confidence: AIConfidence | null;
  verification_status: VerificationStatus;
  cluster_id: string | null;
  status: CitizenRequestStatus;
  synthetic_flag: boolean;
  is_live_ai?: boolean;
  execution_source?: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}
