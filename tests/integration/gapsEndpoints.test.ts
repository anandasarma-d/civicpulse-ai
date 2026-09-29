import assert from 'assert';
import request from 'supertest';
import app from '../../backend/app';

async function runGapsApiTests() {
  console.log('=== Starting CivicPulse AI Gaps & Priority API Integration Tests (Doc 14 §9 & §10) ===\n');

  // Test 1: GET /api/v1/gaps (Doc 14 §9 List Endpoint)
  console.log('Test 1: GET /api/v1/gaps (List endpoint sorted priority-descending)...');
  const listRes = await request(app).get('/api/v1/gaps');
  assert.strictEqual(listRes.status, 200, 'GET /api/v1/gaps must return HTTP 200');
  assert.ok(Array.isArray(listRes.body.items), 'Response items must be an array');
  assert.ok(listRes.body.items.length >= 2, 'Must return at least 2 gap assessments');

  // Check descending sort by priority_score
  for (let i = 0; i < listRes.body.items.length - 1; i++) {
    const current = listRes.body.items[i].priority.priority_score;
    const next = listRes.body.items[i + 1].priority.priority_score;
    assert.ok(
      current >= next,
      `Gaps must be sorted priority-descending: item ${i} (${current}) >= item ${i + 1} (${next})`
    );
  }
  console.log(`  ✔ Returned ${listRes.body.items.length} gaps correctly sorted priority-descending`);

  // Test 2: Filter by category_id
  console.log('Test 2: GET /api/v1/gaps?category_id=WATER...');
  const waterRes = await request(app).get('/api/v1/gaps?category_id=WATER');
  assert.strictEqual(waterRes.status, 200);
  assert.ok(waterRes.body.items.length >= 1);
  waterRes.body.items.forEach((g: any) => {
    assert.strictEqual(g.category_id, 'WATER');
  });
  console.log('  ✔ Category filtering works correctly');

  // Test 3: GET /api/v1/gaps/GAP-0001 (Doc 14 §10 Hero Gap)
  console.log('Test 3: GET /api/v1/gaps/GAP-0001 (Hero gap detail)...');
  const heroRes = await request(app).get('/api/v1/gaps/GAP-0001');
  assert.strictEqual(heroRes.status, 200, 'GET /api/v1/gaps/GAP-0001 must return HTTP 200');

  const hero = heroRes.body;
  assert.strictEqual(hero.gap_id, 'GAP-0001');
  assert.strictEqual(hero.category_id, 'WATER');
  assert.strictEqual(hero.geo_id, 'GEO-LOC-BLR-01');

  // Verify factors object
  assert.ok(hero.factors, 'Must include factors object');
  assert.ok(hero.factors.raw, 'Must include factors.raw');
  assert.ok(hero.factors.normalized, 'Must include factors.normalized');
  assert.strictEqual(hero.factors.normalized.citizen_demand, 0.96);
  assert.strictEqual(hero.factors.normalized.population_affected, 0.842);
  assert.strictEqual(hero.factors.normalized.infrastructure_gap, 0.94);
  assert.strictEqual(hero.factors.normalized.urgency_severity, 0.92);
  assert.strictEqual(hero.factors.normalized.investment_gap, 1.00);
  assert.strictEqual(hero.factors.normalized.equity_need, 0.77, 'CP-035: equity_need must normalize to 0.77');

  // Verify priority object
  assert.ok(hero.priority, 'Must include priority object');
  assert.strictEqual(hero.priority.priority_score, 92.1, 'Hero priority_score must be 92.1');
  assert.strictEqual(hero.priority.rank, 1, 'Hero rank must be 1');
  assert.strictEqual(hero.priority.priority_band, 'CRITICAL');
  assert.strictEqual(hero.priority.calculation_version, 'v1.0.0-deterministic');
  assert.ok(hero.priority.formula.includes('0.30×Demand'));

  // Hand-computed verification:
  const handSum =
    0.30 * hero.factors.normalized.citizen_demand +
    0.20 * hero.factors.normalized.population_affected +
    0.20 * hero.factors.normalized.infrastructure_gap +
    0.15 * hero.factors.normalized.urgency_severity +
    0.10 * hero.factors.normalized.investment_gap +
    0.05 * hero.factors.normalized.equity_need;
  const handScore = Math.round(handSum * 1000) / 10;
  assert.strictEqual(handScore, 92.1, 'Hand-computed score from factors must equal 92.1');
  console.log('  ✔ Hand-computed formula recomputed from stored factors equals exactly 92.1');

  // Verify explanation object conforms strictly to Doc 13 §9 schema (CP-034)
  assert.ok(hero.explanation, 'Must include explanation object');
  assert.strictEqual(hero.explanation.status, 'AVAILABLE');
  assert.ok(typeof hero.explanation.headline === 'string' && hero.explanation.headline.length > 0, 'Must have headline');
  assert.ok(typeof hero.explanation.why_high_or_low === 'string' && hero.explanation.why_high_or_low.length > 0, 'Must have why_high_or_low');
  assert.ok(Array.isArray(hero.explanation.factor_explanations), 'factor_explanations must be array');
  assert.ok(hero.explanation.factor_explanations.length >= 1, 'factor_explanations must not be empty');
  assert.ok(Array.isArray(hero.explanation.evidence_refs), 'evidence_refs must be array');
  assert.ok(Array.isArray(hero.explanation.uncertainties), 'uncertainties must be array');
  assert.strictEqual(
    hero.explanation.decision_support_note,
    'Final prioritization remains with authorized officials.',
    'Doc 06 §11 mandatory decision_support_note must match specification'
  );
  assert.strictEqual(hero.explanation.prompt_version, 'priority_explanation_v1');
  assert.ok('is_live_ai' in hero.explanation, 'Must track is_live_ai');
  assert.ok(
    ['LIVE_GEMINI', 'DETERMINISTIC_FALLBACK'].includes(hero.explanation.execution_source),
    'Execution source must be valid'
  );

  assert.strictEqual(hero.recommendation_id, 'REC-0001', 'GET /gaps/GAP-0001 must expose recommendation_id REC-0001');
  console.log('  ✔ Hero gap response conforms completely to Doc 13 §9 and Doc 14 §10');

  // Test 4: GET /api/v1/gaps/GAP-0002 (Rank #2 Gap Detail)
  console.log('Test 4: GET /api/v1/gaps/GAP-0002 (Rank #2 Gap Detail)...');
  const gap2Res = await request(app).get('/api/v1/gaps/GAP-0002');
  assert.strictEqual(gap2Res.status, 200);
  assert.strictEqual(gap2Res.body.gap_id, 'GAP-0002');
  assert.strictEqual(gap2Res.body.priority.rank, 2);
  assert.strictEqual(gap2Res.body.priority.priority_score, 56.6);
  assert.strictEqual(gap2Res.body.priority.priority_band, 'MEDIUM');
  console.log('  ✔ Rank #2 Gap (GAP-0002) returned with correct priority (56.6, MEDIUM)');

  // Test 4b: Verify non-canonical 3-digit ID (GAP-001) returns 404 (CP-032)
  console.log('Test 4b: GET /api/v1/gaps/GAP-001 returns 404 (strictly canonical Doc 04 §3 GAP-XXXX)...');
  const nonCanonRes = await request(app).get('/api/v1/gaps/GAP-001');
  assert.strictEqual(nonCanonRes.status, 404, '3-digit ID GAP-001 must return 404 NOT_FOUND');
  console.log('  ✔ 3-digit non-canonical ID correctly rejected with 404');

  // Test 5: GET /api/v1/gaps/NON_EXISTENT
  console.log('Test 5: GET /api/v1/gaps/GAP-9999 (Non-existent)...');
  const notFoundRes = await request(app).get('/api/v1/gaps/GAP-9999');
  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundRes.body.error.code, 'NOT_FOUND');
  console.log('  ✔ Returns 404 with standard ErrorResponse envelope');

  console.log('\nAll Gaps API integration tests PASSED successfully!');
}

runGapsApiTests().catch((err) => {
  console.error('Integration tests failed:', err);
  process.exit(1);
});
