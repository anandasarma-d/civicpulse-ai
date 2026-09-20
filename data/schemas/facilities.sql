-- BigQuery DDL: facilities
CREATE TABLE IF NOT EXISTS facilities (
  facility_id STRING NOT NULL,
  geo_id STRING NOT NULL,
  category_id STRING NOT NULL,
  name STRING NOT NULL,
  latitude FLOAT64,
  longitude FLOAT64,
  capacity INT64,
  operational_status STRING NOT NULL, -- 'OPERATIONAL' | 'LIMITED' | 'CLOSED'
  coverage_area STRING,
  synthetic_flag BOOL NOT NULL
);
