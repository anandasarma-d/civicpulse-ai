import assert from 'assert';
import { buildScoreBreakdown } from '../../backend/services/recommendations/scoreBreakdown';
import { GapAssessmentRecord } from '../../backend/models/GapAssessmentTypes';

function stubGap(normalized: GapAssessmentRecord['factors']['normalized']): GapAssessmentRecord {
  return {
    gap_id: 'GAP-0001',
    geo_id: 'GEO-LOC-BLR-01',
    category_id: 'WATER',
    cluster_id: 'CLU-0001',
    title: 'Hero gap',
    factors: {
      raw: {
        citizen_demand: 20,
        population_affected: 84200,
        infrastructure_gap: 94,
        urgency_severity: 92,
        investment_gap: 100,
        equity_need: 77,
      },
      normalized,
    },
    priority: {
      priority_score: 92.1,
      priority_band: 'CRITICAL',
      rank: 1,
      calculation_version: 'v1.0.0-deterministic',
      formula: 'PriorityScore = 0.30×Demand + 0.20×Population + 0.20×InfrastructureGap + 0.15×UrgencySeverity + 0.10×InvestmentGap + 0.05×EquityNeed',
      weights: {
        citizen_demand: 0.3,
        population_affected: 0.2,
        infrastructure_gap: 0.2,
        urgency_severity: 0.15,
        investment_gap: 0.1,
        equity_need: 0.05,
      },
    },
    explanation: {
      headline: '',
      why_high_or_low: '',
      factor_explanations: [],
      evidence_refs: [],
      uncertainties: [],
      decision_support_note: 'Final prioritization remains with authorized officials.',
      status: 'AVAILABLE',
      is_live_ai: false,
      execution_source: 'DETERMINISTIC_FALLBACK',
      prompt_version: 'priority_explanation_v1',
      generated_at: '2026-09-24T00:00:00Z',
    },
    calculated_at: '2026-09-24T00:00:00Z',
    calculation_version: 'v1.0.0-deterministic',
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
    recommendation_id: null,
  };
}

console.log('=== Starting CivicPulse AI score_breakdown unit tests (Doc 14 §11) ===\n');

console.log('Test 1: Hero GAP-0001 weighted contributions (30/20/20/15/10/5)...');
const heroBreakdown = buildScoreBreakdown(
  stubGap({
    citizen_demand: 0.96,
    population_affected: 0.842,
    infrastructure_gap: 0.94,
    urgency_severity: 0.92,
    investment_gap: 1.0,
    equity_need: 0.77,
  })
);

assert.strictEqual(heroBreakdown.source_gap_id, 'GAP-0001');
assert.strictEqual(heroBreakdown.citizen_demand.normalized, 0.96);
assert.strictEqual(heroBreakdown.citizen_demand.weighted_contribution, 28.8);
assert.strictEqual(heroBreakdown.population_affected.normalized, 0.842);
assert.strictEqual(heroBreakdown.population_affected.weighted_contribution, 16.84);
assert.strictEqual(heroBreakdown.infrastructure_gap.normalized, 0.94);
assert.strictEqual(heroBreakdown.infrastructure_gap.weighted_contribution, 18.8);
assert.strictEqual(heroBreakdown.urgency_severity.normalized, 0.92);
assert.strictEqual(heroBreakdown.urgency_severity.weighted_contribution, 13.8);
assert.strictEqual(heroBreakdown.investment_gap.normalized, 1.0);
assert.strictEqual(heroBreakdown.investment_gap.weighted_contribution, 10);
assert.strictEqual(heroBreakdown.equity_need.normalized, 0.77);
assert.strictEqual(heroBreakdown.equity_need.weighted_contribution, 3.85);

const contributionSum =
  heroBreakdown.citizen_demand.weighted_contribution +
  heroBreakdown.population_affected.weighted_contribution +
  heroBreakdown.infrastructure_gap.weighted_contribution +
  heroBreakdown.urgency_severity.weighted_contribution +
  heroBreakdown.investment_gap.weighted_contribution +
  heroBreakdown.equity_need.weighted_contribution;
assert.ok(Math.abs(contributionSum - 92.09) < 0.001, `Weighted contributions must sum to 92.09, got ${contributionSum}`);
console.log('  ✔ Hero weighted contributions match normalized × weight × 100\n');

console.log('All score_breakdown unit tests PASSED successfully!');
