export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface GapFactorsRaw {
  citizen_demand: number;
  population_affected: number;
  infrastructure_gap: number;
  urgency_severity: number;
  investment_gap: number;
  equity_need: number;
}

export interface GapFactorsNormalized {
  citizen_demand: number;
  population_affected: number;
  infrastructure_gap: number;
  urgency_severity: number;
  investment_gap: number;
  equity_need: number;
}

export interface PriorityScoreResult {
  priority_score: number;
  priority_band: PriorityBand;
  rank: number;
  calculation_version: string;
  formula: string;
  weights: {
    citizen_demand: number;
    population_affected: number;
    infrastructure_gap: number;
    urgency_severity: number;
    investment_gap: number;
    equity_need: number;
  };
}

export interface FactorExplanationItem {
  factor: string;
  explanation: string;
}

/**
 * AI Contract D: Priority Explanation (Doc 06 §11, Doc 13 §9).
 * Contains the six canonical explanation fields specified in Doc 13 §9,
 * along with four additive backward-compatibility fields retained per Doc 14 §22.
 */
export interface PriorityExplanation {
  // --- Canonical Doc 13 §9 Schema ---
  /** Concise 1-sentence executive headline explaining why this gap received its priority score and ranking */
  headline: string;
  /** Explanation of why the score falls in its assigned priority band based on the weighted factor contributions */
  why_high_or_low: string;
  /** Factor-by-factor grounded explanations citing raw and normalized values */
  factor_explanations: FactorExplanationItem[];
  /** Grounded array of resolvable IDs (cluster IDs, citizen request IDs, infrastructure audit IDs) */
  evidence_refs: string[];
  /** Explicit disclosure of assumptions, data sources, and missing investment uncertainties */
  uncertainties: string[];
  /** Mandatory decision support disclaimer: "Final prioritization remains with authorized officials." (Doc 06 §11) */
  decision_support_note: string;

  // --- Execution & System Metadata ---
  status: 'AVAILABLE' | 'UNAVAILABLE';
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  prompt_version: string;
  generated_at: string;

  // --- Additive Backward-Compatibility Fields (Doc 14 §22) ---
  /** Retained alias for headline for pre-RICE-07 UI consumer compatibility */
  summary?: string;
  /** Retained formatted factor strings for legacy list card views */
  driving_factors?: string[];
  /** Retained joined uncertainties summary for legacy detail views */
  contextual_notes?: string;
  /** Model confidence score for legacy metric displays */
  confidence?: number;
}

export interface GapAssessmentRecord {
  gap_id: string;
  geo_id: string;
  category_id: string;
  cluster_id: string;
  title: string;
  factors: {
    raw: GapFactorsRaw;
    normalized: GapFactorsNormalized;
  };
  priority: PriorityScoreResult;
  explanation: PriorityExplanation;
  calculated_at: string;
  calculation_version: string;
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  recommendation_id: string | null;
}

export interface GapListResponse {
  items: GapAssessmentRecord[];
  total: number;
  limit: number;
  offset: number;
}
