-- BigQuery DDL: project_investments
CREATE TABLE IF NOT EXISTS project_investments (
  project_id STRING NOT NULL,
  geo_id STRING NOT NULL,
  category_id STRING NOT NULL,
  project_name STRING NOT NULL,
  status STRING NOT NULL, -- 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  budget FLOAT64,
  start_date DATE,
  end_date DATE,
  expected_beneficiaries INT64,
  coverage_target STRING,
  source STRING,
  synthetic_flag BOOL NOT NULL
);
