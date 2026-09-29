import fs from 'fs';
import os from 'os';
import path from 'path';
import { PersistenceDataSource, setDataSource } from '../common/dataSource';
import {
  coerceArray,
  coerceBool,
  coerceDate,
  coerceJson,
  coerceNumber,
  coerceTimestamp,
  fqTable,
  getBigQueryClient,
  getBigQueryDatasetId,
  getBigQueryLocation,
  pingBigQuery,
} from '../common/bigqueryClient';
import { CitizenRequest } from '../models/CitizenRequest';
import { DemographicProfile } from '../models/DemographicProfile';
import { GapAssessment } from '../models/GapAssessment';
import { Geography } from '../models/Geography';
import { InfrastructureProfile } from '../models/InfrastructureProfile';
import { IssueCluster } from '../models/IssueCluster';
import { ProjectInvestment } from '../models/ProjectInvestment';
import { Recommendation } from '../models/Recommendation';

export type CanonicalTable =
  | 'citizen_requests'
  | 'issue_clusters'
  | 'gap_assessments'
  | 'recommendations'
  | 'geographies'
  | 'demographic_profiles'
  | 'infrastructure_profiles'
  | 'project_investments';

let persistenceReady: Promise<PersistenceDataSource> | null = null;

export async function resolvePersistenceSource(): Promise<PersistenceDataSource> {
  if (!persistenceReady) {
    persistenceReady = (async () => {
      try {
        await pingBigQuery();
        setDataSource('BIGQUERY');
        return 'BIGQUERY' as const;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[persistence] BigQuery unreachable (${message}); using STATIC_JSON fallback`);
        setDataSource('STATIC_JSON');
        return 'STATIC_JSON' as const;
      }
    })();
  }
  return persistenceReady;
}

export async function queryTableRows(table: CanonicalTable): Promise<Record<string, unknown>[]> {
  const bq = getBigQueryClient();
  const [job] = await bq.createQueryJob({
    query: `SELECT * FROM ${fqTable(table)}`,
    location: getBigQueryLocation(),
  });
  const [rows] = await job.getQueryResults();
  return rows as Record<string, unknown>[];
}

const JSON_COLUMNS = new Set(['ai_confidence', 'score_breakdown']);

function prepareLoadRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (JSON_COLUMNS.has(key) && typeof value === 'string') {
      try {
        out[key] = JSON.parse(value);
      } catch {
        out[key] = value;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function insertTableRows(
  table: CanonicalTable,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;
  const bq = getBigQueryClient();
  const tmp = path.join(os.tmpdir(), `civicpulse-write-${table}-${Date.now()}.ndjson`);
  fs.writeFileSync(tmp, rows.map((row) => JSON.stringify(prepareLoadRow(row))).join('\n') + '\n');
  try {
    await bq.dataset(getBigQueryDatasetId()).table(table).load(tmp, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND',
      location: getBigQueryLocation(),
    });
  } finally {
    fs.unlinkSync(tmp);
  }
}

export async function replaceRowByKey(
  table: CanonicalTable,
  keyColumn: string,
  keyValue: string,
  row: Record<string, unknown>
): Promise<void> {
  const bq = getBigQueryClient();
  try {
    await bq.query({
      query: `DELETE FROM ${fqTable(table)} WHERE CAST(${keyColumn} AS STRING) = @keyValue`,
      params: { keyValue },
      location: getBigQueryLocation(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[persistence] DELETE ${table}.${keyColumn} skipped: ${message}`);
  }
  await insertTableRows(table, [row]);
}

export async function loadFromBigQueryOrJson<T>(
  table: CanonicalTable,
  jsonLoad: () => T[],
  mapper: (row: Record<string, unknown>) => T
): Promise<T[]> {
  const source = await resolvePersistenceSource();
  if (source !== 'BIGQUERY') {
    return jsonLoad();
  }
  const rows = await queryTableRows(table);
  return rows.map(mapper);
}

export async function persistIfBigQuery(
  table: CanonicalTable,
  keyColumn: string,
  keyValue: string,
  row: Record<string, unknown>
): Promise<void> {
  const source = await resolvePersistenceSource();
  if (source !== 'BIGQUERY') return;
  try {
    await replaceRowByKey(table, keyColumn, keyValue, row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[persistence] write skipped for ${table}.${keyColumn}=${keyValue}: ${message}`);
  }
}

export function mapCitizenRequest(row: Record<string, unknown>): CitizenRequest {
  return {
    request_id: String(row.request_id),
    created_at: coerceTimestamp(row.created_at),
    input_modality: row.input_modality as CitizenRequest['input_modality'],
    channel: row.channel as CitizenRequest['channel'],
    language: String(row.language),
    raw_text: (row.raw_text as string) ?? null,
    audio_uri: (row.audio_uri as string) ?? null,
    photo_uri: (row.photo_uri as string) ?? null,
    transcript: (row.transcript as string) ?? null,
    category_id: (row.category_id as string) ?? null,
    issue_type_id: (row.issue_type_id as string) ?? null,
    issue_summary: (row.issue_summary as string) ?? null,
    severity: coerceNumber(row.severity),
    urgency: coerceNumber(row.urgency),
    affected_service: (row.affected_service as string) ?? null,
    geo_id: (row.geo_id as string) ?? null,
    latitude: coerceNumber(row.latitude),
    longitude: coerceNumber(row.longitude),
    ai_confidence: coerceJson(row.ai_confidence),
    verification_status: row.verification_status as CitizenRequest['verification_status'],
    cluster_id: (row.cluster_id as string) ?? null,
    status: row.status as CitizenRequest['status'],
    synthetic_flag: coerceBool(row.synthetic_flag),
  };
}

export function citizenRequestToBq(row: CitizenRequest): Record<string, unknown> {
  return {
    request_id: row.request_id,
    created_at: row.created_at,
    input_modality: row.input_modality,
    channel: row.channel,
    language: row.language,
    raw_text: row.raw_text,
    audio_uri: row.audio_uri,
    photo_uri: row.photo_uri,
    transcript: row.transcript,
    category_id: row.category_id,
    issue_type_id: row.issue_type_id,
    issue_summary: row.issue_summary,
    severity: row.severity,
    urgency: row.urgency,
    affected_service: row.affected_service,
    geo_id: row.geo_id,
    latitude: row.latitude,
    longitude: row.longitude,
    ai_confidence: row.ai_confidence,
    verification_status: row.verification_status,
    cluster_id: row.cluster_id,
    status: row.status,
    synthetic_flag: row.synthetic_flag,
  };
}

export function mapIssueCluster(row: Record<string, unknown>): IssueCluster {
  return {
    cluster_id: String(row.cluster_id),
    canonical_issue: String(row.canonical_issue),
    category_id: String(row.category_id),
    issue_type_id: String(row.issue_type_id),
    geo_id: String(row.geo_id),
    request_count: coerceNumber(row.request_count) ?? 0,
    unique_local_units: coerceNumber(row.unique_local_units) ?? 0,
    affected_population: coerceNumber(row.affected_population) ?? 0,
    severity: coerceNumber(row.severity) ?? 0,
    urgency: coerceNumber(row.urgency) ?? 0,
    trend_score: coerceNumber(row.trend_score),
    trend: (row.trend as IssueCluster['trend']) ?? null,
    investment_alignment_score: coerceNumber(row.investment_alignment_score),
    representative_request_ids: coerceArray<string>(row.representative_request_ids),
    cluster_confidence: coerceNumber(row.cluster_confidence) ?? 0,
    created_at: coerceTimestamp(row.created_at),
    updated_at: coerceTimestamp(row.updated_at),
    is_live_ai: coerceBool(row.is_live_ai),
    execution_source: row.execution_source === 'LIVE_GEMINI' ? 'LIVE_GEMINI' : 'DETERMINISTIC_FALLBACK',
    clustering_version: String(row.clustering_version || 'v1.0'),
  };
}

export function issueClusterToBq(row: IssueCluster): Record<string, unknown> {
  return {
    cluster_id: row.cluster_id,
    canonical_issue: row.canonical_issue,
    category_id: row.category_id,
    issue_type_id: row.issue_type_id,
    geo_id: row.geo_id,
    request_count: row.request_count,
    unique_local_units: row.unique_local_units,
    affected_population: row.affected_population,
    severity: row.severity,
    urgency: row.urgency,
    trend_score: row.trend_score,
    trend: row.trend,
    investment_alignment_score: row.investment_alignment_score,
    representative_request_ids: row.representative_request_ids,
    cluster_confidence: row.cluster_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_live_ai: row.is_live_ai,
    execution_source: row.execution_source,
  };
}

export function mapGapAssessment(row: Record<string, unknown>): GapAssessment {
  return {
    gap_id: String(row.gap_id),
    geo_id: String(row.geo_id),
    category_id: String(row.category_id),
    cluster_id: String(row.cluster_id),
    citizen_demand: coerceNumber(row.citizen_demand) ?? 0,
    population_affected: coerceNumber(row.population_affected) ?? 0,
    infrastructure_gap: coerceNumber(row.infrastructure_gap) ?? 0,
    urgency_severity: coerceNumber(row.urgency_severity) ?? 0,
    investment_gap: coerceNumber(row.investment_gap) ?? 0,
    equity_need: coerceNumber(row.equity_need) ?? 0,
    priority_score: coerceNumber(row.priority_score) ?? 0,
    rank: coerceNumber(row.rank) ?? 0,
    calculated_at: coerceTimestamp(row.calculated_at),
    calculation_version: String(row.calculation_version),
  };
}

export function gapAssessmentToBq(row: GapAssessment): Record<string, unknown> {
  return { ...row };
}

export function mapRecommendation(row: Record<string, unknown>): Recommendation {
  const breakdown = coerceJson<Recommendation['score_breakdown']>(row.score_breakdown);
  return {
    recommendation_id: String(row.recommendation_id),
    gap_id: String(row.gap_id),
    rank: coerceNumber(row.rank) ?? 0,
    intervention: String(row.intervention),
    why_now: String(row.why_now),
    why_here: String(row.why_here),
    expected_benefit: String(row.expected_benefit),
    caveats: coerceArray<string>(row.caveats),
    evidence_refs: coerceArray<string>(row.evidence_refs),
    score_breakdown: breakdown || {
      source_gap_id: String(row.gap_id),
      citizen_demand: { normalized: 0, weighted_contribution: 0 },
      population_affected: { normalized: 0, weighted_contribution: 0 },
      infrastructure_gap: { normalized: 0, weighted_contribution: 0 },
      urgency_severity: { normalized: 0, weighted_contribution: 0 },
      investment_gap: { normalized: 0, weighted_contribution: 0 },
      equity_need: { normalized: 0, weighted_contribution: 0 },
    },
    model_name: (row.model_name as string) ?? null,
    prompt_version: String(row.prompt_version || 'recommendation_v1'),
    generated_at: coerceTimestamp(row.generated_at),
    status: (row.status as Recommendation['status']) || 'DRAFT',
    review_required: coerceBool(row.review_required),
    is_live_ai: coerceBool(row.is_live_ai),
    execution_source: row.execution_source === 'LIVE_GEMINI' ? 'LIVE_GEMINI' : 'DETERMINISTIC_FALLBACK',
  };
}

export function recommendationToBq(row: Recommendation): Record<string, unknown> {
  return {
    recommendation_id: row.recommendation_id,
    gap_id: row.gap_id,
    rank: row.rank,
    intervention: row.intervention,
    why_now: row.why_now,
    why_here: row.why_here,
    expected_benefit: row.expected_benefit,
    caveats: row.caveats,
    evidence_refs: row.evidence_refs,
    score_breakdown: row.score_breakdown,
    model_name: row.model_name,
    prompt_version: row.prompt_version,
    generated_at: row.generated_at,
    status: row.status,
    review_required: row.review_required,
    is_live_ai: row.is_live_ai,
    execution_source: row.execution_source,
  };
}

export function mapGeography(row: Record<string, unknown>): Geography {
  return {
    geo_id: String(row.geo_id),
    level: row.level as Geography['level'],
    parent_geo_id: (row.parent_geo_id as string) ?? null,
    code: (row.code as string) ?? null,
    name: String(row.name),
    latitude: coerceNumber(row.latitude),
    longitude: coerceNumber(row.longitude),
  };
}

export function mapDemographicProfile(row: Record<string, unknown>): DemographicProfile {
  return {
    geo_id: String(row.geo_id),
    population: coerceNumber(row.population) ?? 0,
    households: coerceNumber(row.households),
    population_density: coerceNumber(row.population_density),
    youth_share: coerceNumber(row.youth_share),
    elderly_share: coerceNumber(row.elderly_share),
    vulnerability_index: coerceNumber(row.vulnerability_index),
    data_source: (row.data_source as string) ?? null,
    as_of_date: coerceDate(row.as_of_date) || '',
    synthetic_flag: coerceBool(row.synthetic_flag),
  };
}

export function mapInfrastructureProfile(row: Record<string, unknown>): InfrastructureProfile {
  return {
    geo_id: String(row.geo_id),
    category_id: String(row.category_id),
    coverage_score: coerceNumber(row.coverage_score) ?? 0,
    quality_score: coerceNumber(row.quality_score) ?? 0,
    capacity_score: coerceNumber(row.capacity_score) ?? 0,
    facility_count: coerceNumber(row.facility_count),
    service_reliability: coerceNumber(row.service_reliability) ?? 0,
    data_source: (row.data_source as string) ?? null,
    as_of_date: coerceDate(row.as_of_date) || '',
    synthetic_flag: coerceBool(row.synthetic_flag),
  };
}

export function mapProjectInvestment(row: Record<string, unknown>): ProjectInvestment {
  return {
    project_id: String(row.project_id),
    geo_id: String(row.geo_id),
    category_id: String(row.category_id),
    project_name: String(row.project_name),
    status: row.status as ProjectInvestment['status'],
    budget: coerceNumber(row.budget),
    start_date: coerceDate(row.start_date),
    end_date: coerceDate(row.end_date),
    expected_beneficiaries: coerceNumber(row.expected_beneficiaries),
    coverage_target: (row.coverage_target as string) ?? null,
    source: (row.source as string) ?? null,
    synthetic_flag: coerceBool(row.synthetic_flag),
  };
}
