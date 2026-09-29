import assert from 'assert';
import request from 'supertest';
import app from '../../backend/app';
import { DECISION_SUPPORT_CAVEAT, ensureDecisionSupportCaveat } from '../../backend/services/recommendations/recommendationService';

const INVENTED_PATTERN = /₹|\$\d|USD|INR|lakh|crore|BWSSB|BBMP|tanker|42,000/i;

async function runRecommendationsApiTests() {
  console.log('=== Starting CivicPulse AI Recommendations API Integration Tests (Doc 14 §11) ===\n');

  assert.ok(
    INVENTED_PATTERN.test('allocate ₹12 lakh via BWSSB for a new tanker fleet'),
    'INVENTED_PATTERN must still fail invented currency/agency/tanker language'
  );
  assert.ok(
    !INVENTED_PATTERN.test('outages exceeding 48 hours for 84,200 residents'),
    'INVENTED_PATTERN must not flag a grounded outage duration present in evidence'
  );
  console.log('  ✔ INVENTED_PATTERN still flags currency/agency; grounded "48 hours" is allowed');

  const patchedCaveats = ensureDecisionSupportCaveat(['Gemini omitted the disclaimer.']);
  assert.ok(patchedCaveats.includes(DECISION_SUPPORT_CAVEAT));
  assert.strictEqual(
    ensureDecisionSupportCaveat([DECISION_SUPPORT_CAVEAT]).filter((c) => c === DECISION_SUPPORT_CAVEAT).length,
    1,
    'canonical disclaimer must not be duplicated'
  );
  console.log('  ✔ server-side decision-support caveat is appended when Gemini omits it');

  console.log('Test 1: GET /api/v1/recommendations/REC-0001 (hero)...');
  const heroRes = await request(app).get('/api/v1/recommendations/REC-0001');
  assert.strictEqual(heroRes.status, 200, 'GET /api/v1/recommendations/REC-0001 must return HTTP 200');

  const hero = heroRes.body;
  assert.strictEqual(hero.recommendation_id, 'REC-0001');
  assert.strictEqual(hero.gap_id, 'GAP-0001');
  assert.strictEqual(hero.prompt_version, 'recommendation_v1');
  assert.strictEqual(typeof hero.review_required, 'boolean');
  assert.ok(hero.recommendation, 'Must include nested recommendation object');
  assert.ok(hero.recommendation.intervention.length > 0, 'intervention required');
  assert.ok(hero.recommendation.why_here.length > 0, 'why_here required');
  assert.ok(hero.recommendation.why_now.length > 0, 'why_now required');
  assert.ok(hero.recommendation.expected_benefit.length > 0, 'expected_benefit required');
  assert.ok(Array.isArray(hero.recommendation.caveats) && hero.recommendation.caveats.length > 0);
  assert.ok(
    hero.recommendation.caveats.includes(DECISION_SUPPORT_CAVEAT),
    'API caveats must include the server-side decision-support disclaimer'
  );
  assert.ok(Array.isArray(hero.recommendation.evidence_refs) && hero.recommendation.evidence_refs.length > 0);
  assert.ok(hero.recommendation.evidence_refs.includes('GAP-0001'));
  assert.ok(hero.recommendation.evidence_refs.includes('CLU-0001'));

  const joined = [
    hero.recommendation.intervention,
    hero.recommendation.why_here,
    hero.recommendation.why_now,
    hero.recommendation.expected_benefit,
    ...hero.recommendation.caveats,
  ].join(' ');
  assert.ok(!INVENTED_PATTERN.test(joined), 'Hero recommendation must not invent funding, costs, agencies, or timelines');
  assert.ok(
    /advisory|decision-support|authorized official|not an autonomous/i.test(joined),
    'Must be framed as decision support, not an autonomous government decision'
  );

  assert.ok(hero.score_breakdown, 'Must include deterministic score_breakdown');
  assert.strictEqual(hero.score_breakdown.source_gap_id, 'GAP-0001');
  assert.strictEqual(hero.score_breakdown.citizen_demand.normalized, 0.96);
  assert.strictEqual(hero.score_breakdown.citizen_demand.weighted_contribution, 28.8);
  assert.strictEqual(hero.score_breakdown.population_affected.normalized, 0.842);
  assert.strictEqual(hero.score_breakdown.population_affected.weighted_contribution, 16.84);
  assert.strictEqual(hero.score_breakdown.infrastructure_gap.normalized, 0.94);
  assert.strictEqual(hero.score_breakdown.infrastructure_gap.weighted_contribution, 18.8);
  assert.strictEqual(hero.score_breakdown.urgency_severity.normalized, 0.92);
  assert.strictEqual(hero.score_breakdown.urgency_severity.weighted_contribution, 13.8);
  assert.strictEqual(hero.score_breakdown.investment_gap.normalized, 1.0);
  assert.strictEqual(hero.score_breakdown.investment_gap.weighted_contribution, 10);
  assert.strictEqual(hero.score_breakdown.equity_need.normalized, 0.77);
  assert.strictEqual(hero.score_breakdown.equity_need.weighted_contribution, 3.85);
  console.log('  ✔ Hero REC-0001 returned with grounded narrative and deterministic score_breakdown');

  console.log('Test 2: GET /api/v1/gaps/GAP-0001 includes recommendation_id REC-0001...');
  const gapRes = await request(app).get('/api/v1/gaps/GAP-0001');
  assert.strictEqual(gapRes.status, 200);
  assert.strictEqual(gapRes.body.recommendation_id, 'REC-0001');
  assert.strictEqual(gapRes.body.priority.priority_score, 92.1);
  console.log('  ✔ Gap detail exposes recommendation_id without altering priority_score 92.1');

  console.log('Test 3: GET /api/v1/recommendations/REC-001 returns 404 (non-canonical)...');
  const aliasRes = await request(app).get('/api/v1/recommendations/REC-001');
  assert.strictEqual(aliasRes.status, 404, '3-digit REC-001 must return 404');
  assert.strictEqual(aliasRes.body.error.code, 'NOT_FOUND');
  console.log('  ✔ Non-canonical REC-001 rejected');

  console.log('Test 4: GET /api/v1/recommendations/REC-9999 returns 404...');
  const missingRes = await request(app).get('/api/v1/recommendations/REC-9999');
  assert.strictEqual(missingRes.status, 404);
  assert.strictEqual(missingRes.body.error.code, 'NOT_FOUND');
  console.log('  ✔ Unknown canonical ID returns 404');

  console.log('Test 5: No execute endpoint is mounted...');
  const executeRes = await request(app).post('/api/v1/recommendations/REC-0001/execute');
  assert.ok(executeRes.status === 404 || executeRes.status === 405, 'Execute action must not exist');
  console.log('  ✔ No execute endpoint');

  console.log('\nAll Recommendations API integration tests PASSED successfully!');
}

runRecommendationsApiTests().catch((err) => {
  console.error('Integration tests failed:', err);
  process.exit(1);
});
