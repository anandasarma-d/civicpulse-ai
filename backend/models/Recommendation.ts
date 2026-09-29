export type RecommendationStatus = 'DRAFT' | 'REVIEWED' | 'ARCHIVED';

export interface ScoreBreakdownFactor {
  normalized: number;
  weighted_contribution: number;
}

/**
 * Doc 14 §11 (CP-037, 24 Sep 2026): deterministic score_breakdown.
 * weighted_contribution = normalized × weight × 100 using 30/20/20/15/10/5.
 * Values are reused from the source GapAssessment — never recomputed as a new score.
 */
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

/**
 * Persistence record per Document 04 §14.
 */
export interface Recommendation {
  recommendation_id: string; // PK, REC-{4-digit}
  gap_id: string;
  rank: number;
  intervention: string;
  why_now: string;
  why_here: string;
  expected_benefit: string;
  caveats: string[];
  evidence_refs: string[];
  score_breakdown: RecommendationScoreBreakdown;
  model_name: string | null;
  prompt_version: string;
  generated_at: string;
  status: RecommendationStatus;
  review_required: boolean;
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

/**
 * GET /api/v1/recommendations/{id} — Document 14 §11 (CP-037).
 *
 * Additive fields under Doc 14 §22 (same disclosure pattern as CP-034
 * PriorityExplanation legacy fields). These are not in the Doc 14 §11
 * documented envelope and MUST NOT be removed:
 *   - score_breakdown: service-computed from the source gap (never Gemini)
 *   - is_live_ai / execution_source: execution stamp already computed
 *     inside generateRecommendationForGap (CP-044 / CP-045)
 */
export interface RecommendationApiResponse {
  recommendation_id: string;
  gap_id: string;
  recommendation: RecommendationNested;
  score_breakdown: RecommendationScoreBreakdown;
  review_required: boolean;
  prompt_version: 'recommendation_v1';
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

/**
 * Gemini output schema from Document 13 §10 (recommendation_v1).
 */
export interface RecommendationModelOutput {
  intervention: string;
  why_here: string;
  why_now: string;
  expected_benefit: string;
  caveats: string[];
  evidence_refs: string[];
  review_required: boolean;
}
