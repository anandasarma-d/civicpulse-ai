export type IssueTrend = 'RISING' | 'STABLE' | 'FALLING';

export interface IssueCluster {
  cluster_id: string; // PK, format CLU-{number}
  canonical_issue: string;
  category_id: string;
  issue_type_id: string;
  geo_id: string;
  request_count: number;
  unique_local_units: number;
  affected_population: number;
  severity: number; // integer 1-5, aggregated
  urgency: number; // integer 1-5, aggregated
  trend_score: number | null;
  trend: IssueTrend | null;
  investment_alignment_score: number | null;
  representative_request_ids: string[];
  cluster_confidence: number;
  created_at: string; // datetime (ISO 8601)
  updated_at: string; // datetime (ISO 8601)
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  clustering_version: string;
}
