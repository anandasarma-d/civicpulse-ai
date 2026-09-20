-- BigQuery DDL: citizen_requests
CREATE TABLE IF NOT EXISTS citizen_requests (
  request_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  input_modality STRING NOT NULL, -- 'TEXT' | 'VOICE' | 'PHOTO' | 'MIXED'
  channel STRING NOT NULL, -- 'web' | 'mobile' | 'assisted'
  language STRING NOT NULL,
  raw_text STRING,
  audio_uri STRING,
  photo_uri STRING,
  transcript STRING,
  category_id STRING,
  issue_type_id STRING,
  issue_summary STRING,
  severity INT64, -- 1-5
  urgency INT64, -- 1-5
  affected_service STRING,
  geo_id STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  ai_confidence JSON,
  verification_status STRING NOT NULL, -- 'PENDING' | 'CONFIRMED' | 'NEEDS_CLARIFICATION'
  cluster_id STRING,
  status STRING NOT NULL, -- 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'NEEDS_CLARIFICATION' | 'REVIEW_REQUIRED' | 'FAILED'
  synthetic_flag BOOL NOT NULL
);
