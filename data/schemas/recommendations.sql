-- BigQuery DDL: recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id STRING NOT NULL,
  gap_id STRING NOT NULL,
  rank INT64 NOT NULL,
  intervention STRING NOT NULL,
  why_now STRING NOT NULL,
  why_here STRING NOT NULL,
  expected_benefit STRING NOT NULL,
  caveats ARRAY<STRING>,
  evidence_refs ARRAY<STRING>,
  score_breakdown JSON NOT NULL,
  model_name STRING,
  prompt_version STRING NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  status STRING NOT NULL, -- 'DRAFT' | 'REVIEWED' | 'ARCHIVED'
  review_required BOOL,
  is_live_ai BOOL,
  execution_source STRING
);
