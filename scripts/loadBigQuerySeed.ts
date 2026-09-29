import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  BIGQUERY_DATASET_NAME,
  DATASET_VERSION,
  GENERATOR_VERSION,
  SEED_IDENTIFIER,
  getBigQueryClient,
  getBigQueryDatasetId,
  getBigQueryLocation,
  getBigQueryProject,
  hasGcpCredentials,
} from '../backend/common/bigqueryClient';

const TABLE_DDL: Record<string, string> = {
  citizen_requests: `CREATE TABLE IF NOT EXISTS TABLE_REF (
  request_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  input_modality STRING NOT NULL,
  channel STRING NOT NULL,
  language STRING NOT NULL,
  raw_text STRING,
  audio_uri STRING,
  photo_uri STRING,
  transcript STRING,
  category_id STRING,
  issue_type_id STRING,
  issue_summary STRING,
  severity INT64,
  urgency INT64,
  affected_service STRING,
  geo_id STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  ai_confidence JSON,
  verification_status STRING NOT NULL,
  cluster_id STRING,
  status STRING NOT NULL,
  synthetic_flag BOOL NOT NULL
)`,
  issue_clusters: `CREATE TABLE IF NOT EXISTS TABLE_REF (
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
  trend STRING,
  investment_alignment_score FLOAT64,
  representative_request_ids ARRAY<STRING>,
  cluster_confidence FLOAT64 NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  is_live_ai BOOL,
  execution_source STRING
)`,
  gap_assessments: `CREATE TABLE IF NOT EXISTS TABLE_REF (
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
)`,
  recommendations: `CREATE TABLE IF NOT EXISTS TABLE_REF (
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
  status STRING NOT NULL,
  review_required BOOL,
  is_live_ai BOOL,
  execution_source STRING
)`,
  geographies: `CREATE TABLE IF NOT EXISTS TABLE_REF (
  geo_id STRING NOT NULL,
  level STRING NOT NULL,
  parent_geo_id STRING,
  code STRING,
  name STRING NOT NULL,
  latitude FLOAT64,
  longitude FLOAT64
)`,
  demographic_profiles: `CREATE TABLE IF NOT EXISTS TABLE_REF (
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
)`,
  infrastructure_profiles: `CREATE TABLE IF NOT EXISTS TABLE_REF (
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
)`,
  project_investments: `CREATE TABLE IF NOT EXISTS TABLE_REF (
  project_id STRING NOT NULL,
  geo_id STRING NOT NULL,
  category_id STRING NOT NULL,
  project_name STRING NOT NULL,
  status STRING NOT NULL,
  budget FLOAT64,
  start_date DATE,
  end_date DATE,
  expected_beneficiaries INT64,
  coverage_target STRING,
  source STRING,
  synthetic_flag BOOL NOT NULL
)`,
};

const SEED_FILES: Array<{ table: string; file: string; columns: string[] }> = [
  { table: 'geographies', file: 'geographies.json', columns: ['geo_id', 'level', 'parent_geo_id', 'code', 'name', 'latitude', 'longitude'] },
  { table: 'demographic_profiles', file: 'demographic_profiles.json', columns: ['geo_id', 'population', 'households', 'population_density', 'youth_share', 'elderly_share', 'vulnerability_index', 'data_source', 'as_of_date', 'synthetic_flag'] },
  { table: 'infrastructure_profiles', file: 'infrastructure_profiles.json', columns: ['geo_id', 'category_id', 'coverage_score', 'quality_score', 'capacity_score', 'facility_count', 'service_reliability', 'data_source', 'as_of_date', 'synthetic_flag'] },
  { table: 'project_investments', file: 'project_investments.json', columns: ['project_id', 'geo_id', 'category_id', 'project_name', 'status', 'budget', 'start_date', 'end_date', 'expected_beneficiaries', 'coverage_target', 'source', 'synthetic_flag'] },
  { table: 'citizen_requests', file: 'citizen_requests.json', columns: ['request_id', 'created_at', 'input_modality', 'channel', 'language', 'raw_text', 'audio_uri', 'photo_uri', 'transcript', 'category_id', 'issue_type_id', 'issue_summary', 'severity', 'urgency', 'affected_service', 'geo_id', 'latitude', 'longitude', 'ai_confidence', 'verification_status', 'cluster_id', 'status', 'synthetic_flag'] },
  { table: 'issue_clusters', file: 'issue_clusters.json', columns: ['cluster_id', 'canonical_issue', 'category_id', 'issue_type_id', 'geo_id', 'request_count', 'unique_local_units', 'affected_population', 'severity', 'urgency', 'trend_score', 'trend', 'investment_alignment_score', 'representative_request_ids', 'cluster_confidence', 'created_at', 'updated_at', 'is_live_ai', 'execution_source'] },
  { table: 'gap_assessments', file: 'gap_assessments.json', columns: ['gap_id', 'geo_id', 'category_id', 'cluster_id', 'citizen_demand', 'population_affected', 'infrastructure_gap', 'urgency_severity', 'investment_gap', 'equity_need', 'priority_score', 'rank', 'calculated_at', 'calculation_version'] },
  { table: 'recommendations', file: 'recommendations.json', columns: ['recommendation_id', 'gap_id', 'rank', 'intervention', 'why_now', 'why_here', 'expected_benefit', 'caveats', 'evidence_refs', 'score_breakdown', 'model_name', 'prompt_version', 'generated_at', 'status', 'review_required', 'is_live_ai', 'execution_source'] },
];

function pickColumns(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const arrayColumns = new Set(['representative_request_ids', 'caveats', 'evidence_refs']);
  const timestampColumns = new Set(['created_at', 'updated_at', 'generated_at', 'calculated_at']);
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    const value = row[col] === undefined ? null : row[col];
    if (arrayColumns.has(col)) {
      out[col] = Array.isArray(value) ? value : [];
    } else if (timestampColumns.has(col) && typeof value === 'string') {
      out[col] = value;
    } else {
      out[col] = value;
    }
  }
  return out;
}

async function main() {
  const projectId = getBigQueryProject();
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT is required');
  }
  if (!hasGcpCredentials()) {
    throw new Error(
      'No GCP credentials. Run `gcloud auth application-default login` (RICE-10 covers Cloud Run IAM).'
    );
  }

  const bq = getBigQueryClient();
  const datasetId = getBigQueryDatasetId();
  const location = getBigQueryLocation();
  const dataset = bq.dataset(datasetId);

  const [exists] = await dataset.exists();
  if (!exists) {
    await bq.createDataset(datasetId, {
      location,
      labels: {
        dataset_version: 'v1-0-0-demo',
        generator_version: 'rice-09-seed-load',
        seed: 'data-seed',
      },
    });
    console.log(`Created dataset ${projectId}.${datasetId} in ${location}`);
  } else {
    console.log(`Dataset ${projectId}.${datasetId} already exists`);
  }

  await dataset.setMetadata({
    description: `dataset_version=${DATASET_VERSION}; generator_version=${GENERATOR_VERSION}; seed=${SEED_IDENTIFIER} (Doc 16 §6). Dataset name ${BIGQUERY_DATASET_NAME}.`,
  });

  for (const [table, ddl] of Object.entries(TABLE_DDL)) {
    const fq = `\`${projectId}.${datasetId}.${table}\``;
    await bq.query({ query: ddl.replace('TABLE_REF', fq), location });
    console.log(`Ensured table ${fq}`);
  }

  const clusterFq = `\`${projectId}.${datasetId}.issue_clusters\``;
  await bq.query({
    query: `ALTER TABLE ${clusterFq} ADD COLUMN IF NOT EXISTS is_live_ai BOOL`,
    location,
  });
  await bq.query({
    query: `ALTER TABLE ${clusterFq} ADD COLUMN IF NOT EXISTS execution_source STRING`,
    location,
  });
  console.log(`Added issue_clusters is_live_ai / execution_source if missing`);

  const recFq = `\`${projectId}.${datasetId}.recommendations\``;
  await bq.query({
    query: `ALTER TABLE ${recFq} ADD COLUMN IF NOT EXISTS is_live_ai BOOL`,
    location,
  });
  await bq.query({
    query: `ALTER TABLE ${recFq} ADD COLUMN IF NOT EXISTS execution_source STRING`,
    location,
  });
  await bq.query({
    query: `ALTER TABLE ${recFq} ADD COLUMN IF NOT EXISTS review_required BOOL`,
    location,
  });
  console.log(`Added recommendations is_live_ai / execution_source / review_required if missing`);

  const seedDir = path.resolve(process.cwd(), 'data/seed');
  for (const spec of SEED_FILES) {
    const filePath = path.join(seedDir, spec.file);
    const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>[];
    const payload = rows.map((row) => pickColumns(row, spec.columns));
    const tmp = path.join(os.tmpdir(), `civicpulse-${spec.table}.ndjson`);
    fs.writeFileSync(
      tmp,
      payload.length === 0 ? '' : payload.map((row) => JSON.stringify(row)).join('\n') + '\n'
    );
    try {
      await dataset.table(spec.table).load(tmp, {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: 'WRITE_TRUNCATE',
        location,
      });
    } catch (err: unknown) {
      const response = (err as { errors?: unknown[] }).errors?.[0] || err;
      console.error(`Load failed for ${spec.table}:`, JSON.stringify(response, null, 2));
      throw err;
    } finally {
      fs.unlinkSync(tmp);
    }
    console.log(`Loaded ${payload.length} rows into ${spec.table} from ${spec.file}`);
  }

  console.log(
    JSON.stringify(
      {
        dataset: `${projectId}.${datasetId}`,
        dataset_version: DATASET_VERSION,
        generator_version: GENERATOR_VERSION,
        seed: SEED_IDENTIFIER,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('BigQuery seed load failed:', err);
  process.exit(1);
});
