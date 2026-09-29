import { GapFactorsNormalized, PriorityBand, PriorityScoreResult } from '../../models/GapAssessmentTypes';

export const CALCULATION_VERSION = 'v1.0.0-deterministic';
export const FORMULA_STRING =
  'PriorityScore = 0.30×Demand + 0.20×Population + 0.20×InfrastructureGap + 0.15×UrgencySeverity + 0.10×InvestmentGap + 0.05×EquityNeed';

export const FACTOR_WEIGHTS = {
  citizen_demand: 0.30,
  population_affected: 0.20,
  infrastructure_gap: 0.20,
  urgency_severity: 0.15,
  investment_gap: 0.10,
  equity_need: 0.05,
} as const;

/**
 * Derives the standard PriorityBand from a 0-100 score.
 * Aligned with Doc 14 §10 worked example where score 87.4 is band 'HIGH',
 * and Doc 06 §10 / Doc 14 §10 hero score 92.1 is band 'CRITICAL'.
 */
export function getPriorityBand(score: number): PriorityBand {
  // CRITICAL: score >= 90.0
  // HIGH: 60.0 <= score < 90.0
  // MEDIUM: 40.0 <= score < 60.0
  // LOW: score < 40.0
  if (score >= 90.0) return 'CRITICAL';
  if (score >= 60.0) return 'HIGH';
  if (score >= 40.0) return 'MEDIUM';
  return 'LOW';
}

/**
 * Pure deterministic Priority Score calculation (Doc 06 §10 / Doc 11 §10).
 * Gemini is NEVER called to produce, adjust, or approve the score or rank (Doc 02 §5.2, Doc 06 §2/§22, Doc 13 §2).
 * 
 * Formula:
 * raw_weighted_sum = (0.30 * Demand + 0.20 * Population + 0.20 * InfraGap + 0.15 * Urgency + 0.10 * InvestmentGap + 0.05 * EquityNeed) * 100
 * Rounded to 1 decimal place.
 * 
 * Worked example from Doc 15 §5:
 * Demand: 0.92 * 0.30 = 0.276
 * Population: 0.88 * 0.20 = 0.176
 * InfrastructureGap: 0.91 * 0.20 = 0.182
 * UrgencySeverity: 0.90 * 0.15 = 0.135
 * InvestmentGap: 0.85 * 0.10 = 0.085
 * EquityNeed: 0.76 * 0.05 = 0.038
 * Sum = 0.892 * 100 = 89.2... 
 * Note: Check exact calculation and round to 1 decimal place.
 */
export function computeDeterministicPriorityScore(
  factors: GapFactorsNormalized,
  rank: number = 1
): PriorityScoreResult {
  // Clamp all normalized inputs to [0, 1] strictly
  const demand = Math.min(Math.max(factors.citizen_demand, 0), 1);
  const pop = Math.min(Math.max(factors.population_affected, 0), 1);
  const infra = Math.min(Math.max(factors.infrastructure_gap, 0), 1);
  const urgency = Math.min(Math.max(factors.urgency_severity, 0), 1);
  const investment = Math.min(Math.max(factors.investment_gap, 0), 1);
  const equity = Math.min(Math.max(factors.equity_need, 0), 1);

  const weightedSum =
    FACTOR_WEIGHTS.citizen_demand * demand +
    FACTOR_WEIGHTS.population_affected * pop +
    FACTOR_WEIGHTS.infrastructure_gap * infra +
    FACTOR_WEIGHTS.urgency_severity * urgency +
    FACTOR_WEIGHTS.investment_gap * investment +
    FACTOR_WEIGHTS.equity_need * equity;

  // Multiply by 100 and round to 1 decimal place
  const priority_score = Math.round(weightedSum * 1000) / 10;
  const priority_band = getPriorityBand(priority_score);

  return {
    priority_score,
    priority_band,
    rank,
    calculation_version: CALCULATION_VERSION,
    formula: FORMULA_STRING,
    weights: { ...FACTOR_WEIGHTS },
  };
}
