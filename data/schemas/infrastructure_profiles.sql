-- BigQuery DDL: infrastructure_profiles
CREATE TABLE IF NOT EXISTS infrastructure_profiles (
  geo_id STRING NOT NULL,
  category_id STRING NOT NULL,
  coverage_score FLOAT64 NOT NULL,
  quality_score FLOAT64 NOT NULL,
  capacity_score FLOAT64 NOT NULL,
  facility_count INT64,
  service_reliability FLOAT64 NOT NULL,
  data_source STRING,
  as_of_date DATE NOT NULL,
  synthetic_flag BOOL NOT NULL
);
