import dotenv from 'dotenv';

// Ensure environment variables from .env are loaded
dotenv.config();

export interface AppConfig {
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_REGION?: string;
  BIGQUERY_DATASET?: string;
  GCS_BUCKET?: string;
  VERTEX_AI_MODEL?: string;
  PROMPT_VERSION_REQUEST_UNDERSTANDING?: string;
  PROMPT_VERSION_RECOMMENDATION?: string;
  PROMPT_VERSION_COPILOT?: string;
  FIREBASE_PROJECT_ID?: string;
  MAPS_API_KEY?: string;
  PORT: number;
  NODE_ENV: string;
}

const trackedVars = [
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_REGION',
  'BIGQUERY_DATASET',
  'GCS_BUCKET',
  'VERTEX_AI_MODEL',
  'PROMPT_VERSION_REQUEST_UNDERSTANDING',
  'PROMPT_VERSION_RECOMMENDATION',
  'PROMPT_VERSION_COPILOT',
  'FIREBASE_PROJECT_ID',
  'MAPS_API_KEY',
] as const;

// Check for missing variables and log warnings (without crashing)
for (const varName of trackedVars) {
  if (!process.env[varName] || process.env[varName]?.trim() === '') {
    console.warn(`[Config Warning] Environment variable '${varName}' is not set or empty.`);
  }
}

export const config: AppConfig = {
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  GOOGLE_CLOUD_REGION: process.env.GOOGLE_CLOUD_REGION,
  BIGQUERY_DATASET: process.env.BIGQUERY_DATASET,
  GCS_BUCKET: process.env.GCS_BUCKET,
  VERTEX_AI_MODEL: process.env.VERTEX_AI_MODEL,
  PROMPT_VERSION_REQUEST_UNDERSTANDING: process.env.PROMPT_VERSION_REQUEST_UNDERSTANDING,
  PROMPT_VERSION_RECOMMENDATION: process.env.PROMPT_VERSION_RECOMMENDATION,
  PROMPT_VERSION_COPILOT: process.env.PROMPT_VERSION_COPILOT,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  MAPS_API_KEY: process.env.MAPS_API_KEY,
  PORT: Number(process.env.BACKEND_PORT || process.env.PORT || 8080),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default config;
