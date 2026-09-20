-- BigQuery DDL: request_embeddings
CREATE TABLE IF NOT EXISTS request_embeddings (
  request_id STRING NOT NULL,
  embedding_vector ARRAY<FLOAT64> NOT NULL,
  model_version STRING NOT NULL,
  created_at TIMESTAMP NOT NULL
);
