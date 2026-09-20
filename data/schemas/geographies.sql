-- BigQuery DDL: geographies
CREATE TABLE IF NOT EXISTS geographies (
  geo_id STRING NOT NULL,
  level STRING NOT NULL, -- 'STATE' | 'DISTRICT' | 'SUBDISTRICT_BLOCK' | 'LOCAL_UNIT'
  parent_geo_id STRING,
  code STRING,
  name STRING NOT NULL,
  latitude FLOAT64,
  longitude FLOAT64
);
