-- BigQuery DDL: media_evidence
CREATE TABLE IF NOT EXISTS media_evidence (
  media_id STRING NOT NULL,
  request_id STRING NOT NULL,
  media_type STRING NOT NULL, -- 'PHOTO' | 'AUDIO'
  storage_uri STRING NOT NULL,
  analysis_summary STRING,
  observations JSON,
  analysis_confidence JSON,
  model_version STRING,
  created_at TIMESTAMP NOT NULL,
  synthetic_flag BOOL NOT NULL
);
