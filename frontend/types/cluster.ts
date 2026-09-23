export type IssueTrend = 'RISING' | 'STABLE' | 'FALLING';

export interface IssueClusterSummary {
  cluster_id: string;
  canonical_issue: string;
  category_id: string;
  issue_type_id: string;
  geo_id: string;
  request_count: number;
  unique_local_units: number;
  affected_population: number;
  severity: number;
  severity_score?: number;
  urgency: number;
  urgency_score?: number;
  trend: IssueTrend | null;
  trend_score: number | null;
  investment_alignment_score: number | null;
  representative_request_ids: string[];
  cluster_confidence: number;
  created_at: string;
  updated_at: string;
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  clustering_version: string;
}

export interface ClusterGeography {
  geo_id: string;
  name: string;
  level: string;
  code: string;
}

export interface ClusterEvidenceRef {
  media_id: string;
  request_id: string;
  media_type: string;
  storage_uri: string;
  observable_tags?: string[];
}

export interface ClusterRepresentativeRequest {
  request_id: string;
  raw_text: string | null;
  transcript: string | null;
  issue_summary: string | null;
  category_id: string | null;
  issue_type_id: string | null;
  severity: number | null;
  urgency: number | null;
  input_modality: string;
  channel: string;
  photo_uri: string | null;
  audio_uri: string | null;
  created_at: string;
  geo_id: string | null;
  status?: string;
  verification_status?: string;
}

export interface InfrastructureProfileContext {
  geo_id: string;
  category_id: string;
  coverage_score: number;
  quality_score: number;
  capacity_score: number;
  facility_count: number | null;
  service_reliability: number;
  data_source: string | null;
  as_of_date: string;
}

export interface ProjectInvestmentContext {
  project_id: string;
  geo_id: string;
  category_id: string;
  project_name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  expected_beneficiaries: number | null;
  coverage_target: string | null;
  source: string | null;
}

export interface ClusterDetailData extends IssueClusterSummary {
  geographies: string[];
  representative_requests: ClusterRepresentativeRequest[];
  evidence_refs: ClusterEvidenceRef[];
  infrastructure_context: InfrastructureProfileContext | 'UNKNOWN';
  investment_context: {
    status: string;
    project_id?: string;
    project_name?: string;
    budget?: number;
    spent?: number;
    contractor?: string;
    start_date?: string;
    completion_date?: string;
    data_source?: string;
    projects?: ProjectInvestmentContext[];
  };
}

export interface ClusterListResponse {
  items: IssueClusterSummary[];
  total: number;
  limit: number;
  offset: number;
}
