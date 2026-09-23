export type MediaType = 'PHOTO' | 'AUDIO';

export interface MediaEvidence {
  media_id: string; // PK
  request_id: string;
  media_type: MediaType;
  storage_uri: string;
  analysis_summary: string | null;
  observations: object | null;
  analysis_confidence: object | null;
  model_version: string | null;
  created_at: string; // datetime (ISO 8601)
  synthetic_flag: boolean;
  observable_tags?: string[];
  is_live_ai?: boolean;
  execution_source?: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}
