import { GapAssessmentRecord } from '../../models/GapAssessmentTypes';
import { RecommendationScoreBreakdown, ScoreBreakdownFactor } from '../../models/Recommendation';
import { FACTOR_WEIGHTS } from '../decision_intelligence/priorityEngine';

function factorContribution(normalized: number, weight: number): ScoreBreakdownFactor {
  return {
    normalized,
    weighted_contribution: Math.round(normalized * weight * 10000) / 100,
  };
}

/**
 * Builds Doc 14 §11 score_breakdown from an already-validated GapAssessment.
 * Does not recompute or alter the gap priority score.
 */
export function buildScoreBreakdown(gap: GapAssessmentRecord): RecommendationScoreBreakdown {
  const n = gap.factors.normalized;
  return {
    source_gap_id: gap.gap_id,
    citizen_demand: factorContribution(n.citizen_demand, FACTOR_WEIGHTS.citizen_demand),
    population_affected: factorContribution(n.population_affected, FACTOR_WEIGHTS.population_affected),
    infrastructure_gap: factorContribution(n.infrastructure_gap, FACTOR_WEIGHTS.infrastructure_gap),
    urgency_severity: factorContribution(n.urgency_severity, FACTOR_WEIGHTS.urgency_severity),
    investment_gap: factorContribution(n.investment_gap, FACTOR_WEIGHTS.investment_gap),
    equity_need: factorContribution(n.equity_need, FACTOR_WEIGHTS.equity_need),
  };
}
