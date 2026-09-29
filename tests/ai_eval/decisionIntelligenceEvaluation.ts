import assert from 'assert';
import {
  computeGapFactorsForCluster,
  assessGapForCluster,
} from '../../backend/services/decision_intelligence/gapAssessmentService';
import { computeDeterministicPriorityScore } from '../../backend/services/decision_intelligence/priorityEngine';
import { IssueCluster } from '../../backend/models/IssueCluster';

async function runDecisionIntelligenceScenarios() {
  console.log('=== Starting CivicPulse AI Decision Intelligence Scenarios (Doc 15 §11) ===\n');

  // Scenario A: High-demand + poor-infrastructure + no-project -> HIGH PRIORITY (Hero Scenario)
  console.log('Scenario A: High-demand + poor-infrastructure + no-project (Hero Gap GAP-0001)...');
  const heroCluster: IssueCluster = {
    cluster_id: 'CLU-0001',
    canonical_issue: 'Drinking water shortage and distribution feeder line disruption in Bellandur',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    geo_id: 'GEO-LOC-BLR-01',
    request_count: 20,
    unique_local_units: 1,
    affected_population: 84200,
    severity: 4,
    urgency: 4,
    trend: 'RISING',
    trend_score: 0.78,
    investment_alignment_score: 0.15,
    representative_request_ids: ['REQ-TS-000101', 'REQ-KA-0001', 'REQ-KA-0002'],
    cluster_confidence: 0.93,
    created_at: '2024-03-10T08:00:00Z',
    updated_at: '2024-03-20T14:30:00Z',
    is_live_ai: true,
    execution_source: 'LIVE_GEMINI',
    clustering_version: 'v1.0',
  };

  const factorsA = await computeGapFactorsForCluster(heroCluster);
  assert.strictEqual(factorsA.investment_status, 'UNKNOWN', 'Investment data missing must be UNKNOWN');
  assert.strictEqual(factorsA.normalized.investment_gap, 1.0, 'No project produces maximum investment gap (1.0)');
  assert.ok(factorsA.normalized.citizen_demand >= 0.9, 'High demand normalized >= 0.9');
  assert.ok(factorsA.normalized.infrastructure_gap >= 0.9, 'Severe infra gap normalized >= 0.9');

  const scoreResultA = computeDeterministicPriorityScore(factorsA.normalized, 1);
  assert.strictEqual(scoreResultA.priority_score, 92.1, 'Hero priority score must be exactly 92.1');
  assert.strictEqual(scoreResultA.priority_band, 'CRITICAL', 'Score 92.1 must belong to CRITICAL priority band');
  console.log(`  ✔ Scenario A passed: Score = ${scoreResultA.priority_score} (${scoreResultA.priority_band})\n`);

  // Scenario B: High-demand + strong-investment -> investment-gap factor moderated
  console.log('Scenario B: High-demand + strong-investment (HSR Roads CLU-0002)...');
  const hsrCluster: IssueCluster = {
    cluster_id: 'CLU-0002',
    canonical_issue: 'Severe road surface disintegration on 27th Main HSR Layout',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_POTHOLE',
    geo_id: 'GEO-LOC-BLR-02',
    request_count: 20,
    unique_local_units: 1,
    affected_population: 72500,
    severity: 3,
    urgency: 3,
    trend: 'STABLE',
    trend_score: 0.10,
    investment_alignment_score: 0.85,
    representative_request_ids: ['REQ-KA-0004'],
    cluster_confidence: 0.90,
    created_at: '2024-03-11T08:00:00Z',
    updated_at: '2024-03-20T14:30:00Z',
    is_live_ai: true,
    execution_source: 'LIVE_GEMINI',
    clustering_version: 'v1.0',
  };

  const factorsB = await computeGapFactorsForCluster(hsrCluster);
  assert.strictEqual(factorsB.investment_status, 'ACTIVE', 'Active capital project INV-BLR-001 must be detected');
  assert.strictEqual(factorsB.normalized.investment_gap, 0.20, 'Active project moderates investment gap down to 0.20');
  console.log(`  ✔ Investment gap moderated to ${factorsB.normalized.investment_gap} due to ACTIVE project "${factorsB.investment_project_name}"`);

  const scoreResultB = computeDeterministicPriorityScore(factorsB.normalized, 2);
  assert.ok(scoreResultB.priority_score < scoreResultA.priority_score, 'Investment moderation must lower overall priority score');
  assert.strictEqual(scoreResultB.priority_score, 56.6, 'HSR score must equal 56.6');
  assert.strictEqual(scoreResultB.priority_band, 'MEDIUM');
  console.log(`  ✔ Scenario B passed: Score = ${scoreResultB.priority_score} (${scoreResultB.priority_band})\n`);

  // Scenario C: Missing investment -> UNKNOWN handling, not false zero (Doc 06 §14, Doc 13 §14)
  console.log('Scenario C: Missing investment -> UNKNOWN handling, strictly avoiding false zero...');
  const uninvestedCluster: IssueCluster = {
    cluster_id: 'CLU-SYN-TEST-99',
    canonical_issue: 'Streetlight outage along Outer Ring Road',
    category_id: 'POWER',
    issue_type_id: 'STREETLIGHT_OUTAGE',
    geo_id: 'GEO-LOC-BLR-03',
    request_count: 10,
    unique_local_units: 1,
    affected_population: 45000,
    severity: 3,
    urgency: 3,
    trend: 'STABLE',
    trend_score: 0.05,
    investment_alignment_score: null,
    representative_request_ids: [],
    cluster_confidence: 0.88,
    created_at: '2024-03-12T08:00:00Z',
    updated_at: '2024-03-20T14:30:00Z',
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
    clustering_version: 'v1.0',
  };

  const factorsC = await computeGapFactorsForCluster(uninvestedCluster);
  assert.strictEqual(factorsC.investment_status, 'UNKNOWN', 'Missing project must yield UNKNOWN, never 0 or null');
  assert.notStrictEqual(factorsC.normalized.investment_gap, 0, 'Missing project must never be treated as 0 gap');
  assert.strictEqual(factorsC.normalized.investment_gap, 1.0, 'Missing project correctly defaults to full investment gap 1.0');
  console.log('  ✔ Scenario C passed: Missing investment handled as UNKNOWN with 1.00 gap, strictly avoiding false zero\n');

  console.log('All Doc 15 §11 Decision Intelligence scenarios PASSED successfully!');
}

runDecisionIntelligenceScenarios().catch((err) => {
  console.error('Decision intelligence evaluation failed:', err);
  process.exit(1);
});
