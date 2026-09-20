-- BigQuery DDL: audit_events
CREATE TABLE IF NOT EXISTS audit_events (
  event_id STRING NOT NULL,
  actor STRING NOT NULL,
  action STRING NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  references ARRAY<STRING>,
  timestamp TIMESTAMP NOT NULL,
  metadata JSON
);
