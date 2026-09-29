import { BigQuery, Dataset } from '@google-cloud/bigquery';
import fs from 'fs';
import os from 'os';
import path from 'path';
import config from './config';

/** Doc 16 §6 — do not substitute a different dataset name. */
export const BIGQUERY_DATASET_NAME = 'civicpulse_demo';

export const DATASET_VERSION = 'v1.0.0-demo';
export const GENERATOR_VERSION = 'rice-09-seed-load';
export const SEED_IDENTIFIER = 'data/seed';

let client: BigQuery | null = null;

export function getBigQueryProject(): string {
  return config.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
}

export function getBigQueryDatasetId(): string {
  // Doc 16 §6 wins over a mismatched .env value.
  const fromEnv = config.BIGQUERY_DATASET || process.env.BIGQUERY_DATASET;
  if (fromEnv && fromEnv !== BIGQUERY_DATASET_NAME) {
    console.warn(
      `[persistence] BIGQUERY_DATASET=${fromEnv} overridden to ${BIGQUERY_DATASET_NAME} (Doc 16 §6)`
    );
  }
  return BIGQUERY_DATASET_NAME;
}

export function getBigQueryLocation(): string {
  return config.GOOGLE_CLOUD_REGION || process.env.GOOGLE_CLOUD_REGION || 'us-central1';
}

export function fqTable(table: string): string {
  return `\`${getBigQueryProject()}.${getBigQueryDatasetId()}.${table}\``;
}

export function getBigQueryClient(): BigQuery {
  if (!client) {
    const projectId = getBigQueryProject();
    client = new BigQuery({
      projectId: projectId || undefined,
    });
  }
  return client;
}

export async function getDataset(): Promise<Dataset> {
  const bq = getBigQueryClient();
  return bq.dataset(getBigQueryDatasetId());
}

export function hasGcpCredentials(): boolean {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit && fs.existsSync(explicit)) return true;
  // Cloud Run / GCE attach credentials via the metadata server, not a local ADC file.
  if (process.env.K_SERVICE || process.env.K_REVISION || process.env.GCE_METADATA_HOST) {
    return true;
  }
  const adcUnix = path.join(os.homedir(), '.config/gcloud/application_default_credentials.json');
  const adcMac = path.join(
    os.homedir(),
    'Library/Application Support/gcloud/application_default_credentials.json'
  );
  return fs.existsSync(adcUnix) || fs.existsSync(adcMac);
}

export async function pingBigQuery(): Promise<void> {
  const projectId = getBigQueryProject();
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT is not set');
  }
  if (!hasGcpCredentials()) {
    throw new Error('No GCP application-default credentials found');
  }
  const dataset = await getDataset();
  const [exists] = await dataset.exists();
  if (!exists) {
    throw new Error(`Dataset ${getBigQueryDatasetId()} does not exist`);
  }
}

export function coerceTimestamp(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return coerceTimestamp((value as { value: unknown }).value);
  }
  return String(value);
}

export function coerceDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return coerceDate((value as { value: unknown }).value);
  }
  return String(value).slice(0, 10);
}

export function coerceJson<T>(value: unknown): T | null {
  if (value == null) return null;
  let current: unknown = value;
  for (let i = 0; i < 3; i++) {
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return null;
      }
    }
    if (typeof current === 'object' && current !== null) {
      const maybeToJSON = (current as { toJSON?: () => unknown }).toJSON;
      if (typeof maybeToJSON === 'function') {
        const next = maybeToJSON.call(current);
        if (next !== current) {
          current = next;
          continue;
        }
      }
      if ('value' in current && Object.keys(current).length === 1) {
        current = (current as { value: unknown }).value;
        continue;
      }
    }
    break;
  }
  if (current !== null && typeof current === 'object') {
    return current as T;
  }
  return null;
}

export function coerceArray<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function coerceNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function coerceBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === true) return true;
  return false;
}
