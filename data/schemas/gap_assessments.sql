-- BigQuery DDL: gap_assessments
CREATE TABLE IF NOT EXISTS gap_assessments (
  gap_id STRING NOT NULL,
  geo_id STRING NOT NULL,
  category_id STRING NOT NULL,
  cluster_id STRING NOT NULL,
  citizen_demand FLOAT64 NOT NULL,
  population_affected INT64 NOT NULL,
  infrastructure_gap FLOAT64 NOT NULL,
  urgency_severity FLOAT64 NOT NULL,
  investment_gap FLOAT64 NOT NULL,
  equity_need FLOAT64 NOT NULL,
  priority_score FLOAT64 NOT NULL,
  rank INT64 NOT NULL,
  calculated_at TIMESTAMP NOT NULL,
  calculation_version STRING NOT NULL
);
