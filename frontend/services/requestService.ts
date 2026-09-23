/**
 * Citizen Request Service (RICE-04 / RICE-05)
 * Connects frontend views to backend /api/v1/requests endpoints.
 * Note: Never calls Gemini directly — all AI understanding is server-side (Doc 11 §9).
 */

export interface CreateRequestPayload {
  input_modality: 'TEXT' | 'VOICE' | 'PHOTO' | 'MIXED';
  channel: 'web' | 'mobile' | 'assisted';
  raw_text?: string;
  language?: string;
  media?: Array<{
    media_type: 'PHOTO' | 'AUDIO';
    uri?: string;
    data?: string;
    mime_type?: string;
  }>;
  geo_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateRequestResponse {
  request_id: string;
  status: string;
  correlation_id: string;
}

export interface MediaEvidenceView {
  media_id: string;
  request_id: string;
  media_type: 'PHOTO' | 'AUDIO';
  storage_uri: string;
  analysis_summary: string | null;
  observations: {
    pipe_visible?: boolean;
    water_leak?: boolean;
    pothole_visible?: boolean;
    road_hazard?: boolean;
    observable_tags?: string[];
    conflict_flag?: boolean;
    conflict_reason?: string | null;
    [key: string]: any;
  } | null;
  analysis_confidence: {
    overall?: number;
    per_observation?: Record<string, number>;
  } | null;
  model_version: string | null;
  created_at: string;
  synthetic_flag: boolean;
}

export interface CitizenRequestDetails {
  request_id: string;
  created_at: string;
  input_modality: 'TEXT' | 'VOICE' | 'PHOTO' | 'MIXED';
  channel: 'web' | 'mobile' | 'assisted';
  language: string;
  raw_text: string | null;
  audio_uri: string | null;
  photo_uri: string | null;
  transcript: string | null;
  category_id: string | null;
  issue_type_id: string | null;
  issue_summary: string | null;
  severity: number | null;
  urgency: number | null;
  affected_service: string | null;
  geo_id: string | null;
  latitude: number | null;
  longitude: number | null;
  ai_confidence: {
    category: number;
    issue_type: number;
    intent: number;
    location: number;
  } | null;
  verification_status: 'PENDING' | 'CONFIRMED' | 'NEEDS_CLARIFICATION';
  cluster_id: string | null;
  status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'NEEDS_CLARIFICATION' | 'REVIEW_REQUIRED' | 'FAILED';
  synthetic_flag: boolean;
  media_evidence?: MediaEvidenceView[];
}

export async function createRequest(data: CreateRequestPayload): Promise<CreateRequestResponse> {
  const response = await fetch('/api/v1/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Failed to create request: HTTP ${response.status}`);
  }

  return response.json();
}

export async function getRequest(requestId: string): Promise<CitizenRequestDetails> {
  const response = await fetch(`/api/v1/requests/${encodeURIComponent(requestId)}`);

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Failed to fetch request: HTTP ${response.status}`);
  }

  return response.json();
}

export const requestService = {
  createRequest,
  getRequest,
};

export default requestService;
