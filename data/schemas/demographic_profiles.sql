-- BigQuery DDL: demographic_profiles
CREATE TABLE IF NOT EXISTS demographic_profiles (
  geo_id STRING NOT NULL,
  population INT64 NOT NULL,
  households INT64,
  population_density FLOAT64,
  youth_share FLOAT64,
  elderly_share FLOAT64,
  vulnerability_index FLOAT64,
  data_source STRING,
  as_of_date DATE NOT NULL,
  synthetic_flag BOOL NOT NULL
);
