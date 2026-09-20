export type RecommendationStatus = 'DRAFT' | 'REVIEWED' | 'ARCHIVED';

export interface Recommendation {
  recommendation_id: string; // PK, format REC-{number}
  gap_id: string;
  rank: number;
  intervention: string;
  why_now: string;
  why_here: string;
  expected_benefit: string;
  caveats: string[];
  evidence_refs: string[];
  score_breakdown: object;
  model_name: string | null;
  prompt_version: string;
  generated_at: string; // datetime (ISO 8601)
  status: RecommendationStatus;
}
