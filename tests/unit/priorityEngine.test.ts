import assert from 'assert';
import {
  computeDeterministicPriorityScore,
  FACTOR_WEIGHTS,
  CALCULATION_VERSION,
  getPriorityBand,
} from '../../backend/services/decision_intelligence/priorityEngine';
import { GapFactorsNormalized } from '../../backend/models/GapAssessmentTypes';

console.log('=== Starting CivicPulse AI Priority Engine Unit Tests (Doc 15 §5) ===\n');

// Test 1: Worked example from Doc 15 §5
console.log('Test 1: Worked example matching Doc 15 §5 specifications...');
const workedExampleFactors: GapFactorsNormalized = {
  citizen_demand: 0.92,
  population_affected: 0.88,
  infrastructure_gap: 0.91,
  urgency_severity: 0.90,
  investment_gap: 0.85,
  equity_need: 0.76,
};

// Hand computation:
// 0.30 * 0.92 = 0.276
// 0.20 * 0.88 = 0.176
// 0.20 * 0.91 = 0.182
// 0.15 * 0.90 = 0.135
// 0.10 * 0.85 = 0.085
// 0.05 * 0.76 = 0.038
// Sum = 0.892 -> 89.2% (Doc 15 §5 corrected authoritative value)
const workedResult = computeDeterministicPriorityScore(workedExampleFactors, 1);

console.log('  Calculated Score:', workedResult.priority_score);
console.log('  Calculated Band:', workedResult.priority_band);
console.log('  Calculation Version:', workedResult.calculation_version);
console.log('  Formula String:', workedResult.formula);

// Verify arithmetic matches 30/20/20/15/10/5 weighted sum
const expectedHandSum =
  0.30 * 0.92 +
  0.20 * 0.88 +
  0.20 * 0.91 +
  0.15 * 0.90 +
  0.10 * 0.85 +
  0.05 * 0.76;
const expectedScore = Math.round(expectedHandSum * 1000) / 10;
assert.strictEqual(
  workedResult.priority_score,
  expectedScore,
  `Worked example score must equal hand-computed weighted sum (${expectedScore})`
);
assert.strictEqual(workedResult.priority_band, 'HIGH', 'Score 89.2 belongs to HIGH band (<90.0 and >=60.0)');
assert.strictEqual(getPriorityBand(87.4), 'HIGH', 'Doc 14 §10 score 87.4 must be HIGH band');
assert.strictEqual(workedResult.calculation_version, CALCULATION_VERSION);
console.log('✔ Worked example arithmetic strictly matches 30/20/20/15/10/5 formula (Score: 89.2, Band: HIGH)\n');

// Test 2: Frozen Hero Scenario (GAP-0001, frozen value 92.1, Rank 1)
console.log('Test 2: Frozen Hero Scenario (GAP-0001) priority calculation...');
const heroFactors: GapFactorsNormalized = {
  citizen_demand: 0.96, // 0.30 * 0.96 = 0.288
  population_affected: 0.842, // 0.20 * 0.842 = 0.1684
  infrastructure_gap: 0.94, // 0.20 * 0.94 = 0.188
  urgency_severity: 0.92, // 0.15 * 0.92 = 0.138
  investment_gap: 1.00, // 0.10 * 1.00 = 0.100 (UNKNOWN investment)
  equity_need: 0.77, // raw 77 / 100 = 0.77 (0.05 * 0.77 = 0.0385 -> sum = 0.9209 -> rounds to 92.1)
};
const heroResult = computeDeterministicPriorityScore(heroFactors, 1);
console.log('  Hero Score:', heroResult.priority_score);
assert.strictEqual(heroResult.priority_score, 92.1, 'Hero record priority_score must be 92.1');
assert.strictEqual(heroResult.priority_band, 'CRITICAL');
assert.strictEqual(heroResult.rank, 1);
console.log('✔ Frozen hero priority_score 92.1 and rank 1 confirmed (with equity_need = 0.77)\n');

// Test 3: Priority Band Boundary Cases (CRITICAL >= 90.0, HIGH 60.0 <= s < 90.0, MEDIUM 40.0 <= s < 60.0, LOW s < 40.0)
console.log('Test 3: Priority band boundaries in plain numbers...');
assert.strictEqual(getPriorityBand(100.0), 'CRITICAL', '100.0 must be CRITICAL (score >= 90.0)');
assert.strictEqual(getPriorityBand(92.1), 'CRITICAL', '92.1 (hero) must be CRITICAL (score >= 90.0)');
assert.strictEqual(getPriorityBand(90.0), 'CRITICAL', '90.0 boundary must be CRITICAL (score >= 90.0)');
assert.strictEqual(getPriorityBand(89.9), 'HIGH', '89.9 must be HIGH (60.0 <= score < 90.0)');
assert.strictEqual(getPriorityBand(89.2), 'HIGH', '89.2 (Doc 15 §5) must be HIGH (60.0 <= score < 90.0)');
assert.strictEqual(getPriorityBand(87.4), 'HIGH', '87.4 (Doc 14 §10) must be HIGH (60.0 <= score < 90.0)');
assert.strictEqual(getPriorityBand(60.0), 'HIGH', '60.0 boundary must be HIGH (60.0 <= score < 90.0)');
assert.strictEqual(getPriorityBand(59.9), 'MEDIUM', '59.9 must be MEDIUM (40.0 <= score < 60.0)');
assert.strictEqual(getPriorityBand(56.6), 'MEDIUM', '56.6 must be MEDIUM (40.0 <= score < 60.0)');
assert.strictEqual(getPriorityBand(40.0), 'MEDIUM', '40.0 boundary must be MEDIUM (40.0 <= score < 60.0)');
assert.strictEqual(getPriorityBand(39.9), 'LOW', '39.9 must be LOW (score < 40.0)');
assert.strictEqual(getPriorityBand(0.0), 'LOW', '0.0 boundary must be LOW (score < 40.0)');
console.log('✔ Priority band boundaries confirmed: CRITICAL: score >= 90.0; HIGH: 60.0 <= score < 90.0; MEDIUM: 40.0 <= score < 60.0; LOW: score < 40.0\n');

// Test 4: Boundary Case — All 0
console.log('Test 4: Boundary Case — All Zero...');
const allZeroFactors: GapFactorsNormalized = {
  citizen_demand: 0,
  population_affected: 0,
  infrastructure_gap: 0,
  urgency_severity: 0,
  investment_gap: 0,
  equity_need: 0,
};
const zeroResult = computeDeterministicPriorityScore(allZeroFactors, 5);
assert.strictEqual(zeroResult.priority_score, 0.0, 'All-zero inputs must produce priority_score 0.0');
assert.strictEqual(zeroResult.priority_band, 'LOW');
console.log('✔ Boundary all-zero evaluates to 0.0 (LOW band)\n');

// Test 5: Boundary Case — All 1
console.log('Test 5: Boundary Case — All One...');
const allOneFactors: GapFactorsNormalized = {
  citizen_demand: 1,
  population_affected: 1,
  infrastructure_gap: 1,
  urgency_severity: 1,
  investment_gap: 1,
  equity_need: 1,
};
const oneResult = computeDeterministicPriorityScore(allOneFactors, 1);
assert.strictEqual(oneResult.priority_score, 100.0, 'All-one inputs must produce priority_score 100.0');
assert.strictEqual(oneResult.priority_band, 'CRITICAL');
console.log('✔ Boundary all-one evaluates to 100.0 (CRITICAL band)\n');

// Test 6: Single-Factor-1 Boundary Cases Matching Each Exact Weight
console.log('Test 6: Single-Factor-1 cases matching each exact weight...');

// Demand only (30% weight) -> 30.0
const demandOnly = computeDeterministicPriorityScore({
  citizen_demand: 1,
  population_affected: 0,
  infrastructure_gap: 0,
  urgency_severity: 0,
  investment_gap: 0,
  equity_need: 0,
});
assert.strictEqual(demandOnly.priority_score, 30.0, 'Demand-only must equal 30.0');
console.log('  ✔ Citizen Demand only (weight 0.30) = 30.0');

// Population only (20% weight) -> 20.0
const popOnly = computeDeterministicPriorityScore({
  citizen_demand: 0,
  population_affected: 1,
  infrastructure_gap: 0,
  urgency_severity: 0,
  investment_gap: 0,
  equity_need: 0,
});
assert.strictEqual(popOnly.priority_score, 20.0, 'Population-only must equal 20.0');
console.log('  ✔ Population Affected only (weight 0.20) = 20.0');

// Infrastructure Gap only (20% weight) -> 20.0
const infraOnly = computeDeterministicPriorityScore({
  citizen_demand: 0,
  population_affected: 0,
  infrastructure_gap: 1,
  urgency_severity: 0,
  investment_gap: 0,
  equity_need: 0,
});
assert.strictEqual(infraOnly.priority_score, 20.0, 'Infra-gap-only must equal 20.0');
console.log('  ✔ Infrastructure Gap only (weight 0.20) = 20.0');

// Urgency Severity only (15% weight) -> 15.0
const urgencyOnly = computeDeterministicPriorityScore({
  citizen_demand: 0,
  population_affected: 0,
  infrastructure_gap: 0,
  urgency_severity: 1,
  investment_gap: 0,
  equity_need: 0,
});
assert.strictEqual(urgencyOnly.priority_score, 15.0, 'Urgency-only must equal 15.0');
console.log('  ✔ Urgency & Severity only (weight 0.15) = 15.0');

// Investment Gap only (10% weight) -> 10.0
const investmentOnly = computeDeterministicPriorityScore({
  citizen_demand: 0,
  population_affected: 0,
  infrastructure_gap: 0,
  urgency_severity: 0,
  investment_gap: 1,
  equity_need: 0,
});
assert.strictEqual(investmentOnly.priority_score, 10.0, 'Investment-gap-only must equal 10.0');
console.log('  ✔ Investment Gap only (weight 0.10) = 10.0');

// Equity Need only (5% weight) -> 5.0
const equityOnly = computeDeterministicPriorityScore({
  citizen_demand: 0,
  population_affected: 0,
  infrastructure_gap: 0,
  urgency_severity: 0,
  investment_gap: 0,
  equity_need: 1,
});
assert.strictEqual(equityOnly.priority_score, 5.0, 'Equity-need-only must equal 5.0');
console.log('  ✔ Equity Need only (weight 0.05) = 5.0');

console.log('\nAll Priority Engine unit tests PASSED successfully!');
