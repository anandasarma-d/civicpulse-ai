-- BigQuery DDL: issue_clusters
CREATE TABLE IF NOT EXISTS issue_clusters (
  cluster_id STRING NOT NULL,
  canonical_issue STRING NOT NULL,
  category_id STRING NOT NULL,
  issue_type_id STRING NOT NULL,
  geo_id STRING NOT NULL,
  request_count INT64 NOT NULL,
  unique_local_units INT64 NOT NULL,
  affected_population INT64 NOT NULL,
  severity INT64 NOT NULL,
  urgency INT64 NOT NULL,
  trend_score FLOAT64,
  trend STRING, -- 'RISING' | 'STABLE' | 'FALLING'
  investment_alignment_score FLOAT64,
  representative_request_ids ARRAY<STRING>,
  cluster_confidence FLOAT64 NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  is_live_ai BOOL,
  execution_source STRING
);
