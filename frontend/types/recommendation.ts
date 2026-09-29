export interface ScoreBreakdownFactor {
  normalized: number;
  weighted_contribution: number;
}

export interface RecommendationScoreBreakdown {
  source_gap_id: string;
  citizen_demand: ScoreBreakdownFactor;
  population_affected: ScoreBreakdownFactor;
  infrastructure_gap: ScoreBreakdownFactor;
  urgency_severity: ScoreBreakdownFactor;
  investment_gap: ScoreBreakdownFactor;
  equity_need: ScoreBreakdownFactor;
}

export interface RecommendationNested {
  intervention: string;
  why_here: string;
  why_now: string;
  expected_benefit: string;
  caveats: string[];
  evidence_refs: string[];
}

export interface RecommendationApiResponse {
  recommendation_id: string;
  gap_id: string;
  recommendation: RecommendationNested;
  score_breakdown: RecommendationScoreBreakdown;
  review_required: boolean;
  prompt_version: 'recommendation_v1';
}
