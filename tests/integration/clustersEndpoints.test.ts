import assert from 'assert';
import request from 'supertest';
import app from '../../backend/app';

async function runTests() {
  console.log('=== Starting CivicPulse AI Clusters API Integration Tests (Doc 14 §7 & §8) ===\n');

  // Test 1: GET /api/v1/clusters
  console.log('Test 1: GET /api/v1/clusters (Doc 14 §7 list endpoint)...');
  const listRes = await request(app).get('/api/v1/clusters').expect(200);
  assert(listRes.body.items, 'Response should contain items array');
  assert(typeof listRes.body.total === 'number', 'Response should contain total count');
  assert(listRes.body.items.length > 0, 'Items should not be empty');

  // Verify fields on cluster items
  const firstCluster = listRes.body.items[0];
  assert(firstCluster.cluster_id, 'Cluster item must have cluster_id');
  assert(firstCluster.canonical_issue, 'Cluster item must have canonical_issue');
  assert(firstCluster.affected_population, 'Cluster item must have affected_population');
  assert(typeof firstCluster.is_live_ai === 'boolean', 'Cluster item must have is_live_ai');
  assert(firstCluster.execution_source, 'Cluster item must have execution_source');
  assert(firstCluster.clustering_version, 'Cluster item must have clustering_version');
  console.log(`✔ GET /api/v1/clusters returned ${listRes.body.total} clusters with execution-tracking metadata`);

  // Test 2: Filtering GET /api/v1/clusters?category_id=WATER
  console.log('Test 2: GET /api/v1/clusters?category_id=WATER...');
  const waterRes = await request(app).get('/api/v1/clusters?category_id=WATER').expect(200);
  assert(waterRes.body.items.every((c: any) => c.category_id === 'WATER'));
  console.log(`✔ Filtered cluster query returned ${waterRes.body.items.length} WATER clusters`);

  // Test 3: GET /api/v1/clusters/CLU-0001 (Doc 14 §8 detail endpoint)
  console.log('Test 3: GET /api/v1/clusters/CLU-0001 (Doc 14 §8 hero cluster)...');
  const heroRes = await request(app).get('/api/v1/clusters/CLU-0001').expect(200);
  const heroData = heroRes.body;

  assert.strictEqual(heroData.cluster_id, 'CLU-0001');
  assert.strictEqual(heroData.category_id, 'WATER');
  assert.strictEqual(heroData.geo_id, 'GEO-LOC-BLR-01');
  assert(heroData.request_count >= 1, 'Hero cluster should aggregate member requests');
  assert.strictEqual(heroData.affected_population, 84200, 'Affected population must match DemographicProfile');
  assert(heroData.representative_requests.length > 0, 'Must have representative requests');
  assert(Array.isArray(heroData.geographies), 'Must have geographies list');
  assert(
    heroData.geographies.every((g: any) => typeof g === 'string'),
    'Doc 14 §8: Geographies must be an array of geo_id strings'
  );
  assert(heroData.geographies.includes('GEO-LOC-BLR-01'), 'Must include hero geo_id');

  // Also assert all representative requests have consistent cluster_id
  assert(
    heroData.representative_requests.every((r: any) => r.cluster_id === 'CLU-0001'),
    'All representative requests must have cluster_id === CLU-0001'
  );

  // Infrastructure Context: Real profile exists in seed data
  assert.notStrictEqual(heroData.infrastructure_context, 'UNKNOWN');
  assert.strictEqual(heroData.infrastructure_context.coverage_score, 48.5);
  console.log('✔ Physical Infrastructure context populated directly from seed audit data');

  // Investment Context: NO record exists in seed data for Bellandur / WATER -> must return {"status": "UNKNOWN"}
  assert.deepStrictEqual(
    heroData.investment_context,
    { status: 'UNKNOWN' },
    'Doc 14 §8: Absence of ProjectInvestment row must return {"status": "UNKNOWN"}, never a fabricated record'
  );
  console.log('✔ Project Investment context correctly returns {"status": "UNKNOWN"} when no row exists');

  // Execution tracking fields
  assert.strictEqual(heroData.clustering_version, 'v1.0');
  assert(heroData.execution_source === 'LIVE_GEMINI' || heroData.execution_source === 'DETERMINISTIC_FALLBACK');
  console.log(`✔ Execution tracking verified: is_live_ai=${heroData.is_live_ai}, source=${heroData.execution_source}`);

  // Test 4: GET /api/v1/clusters/CLU-0002 (Roads cluster with real investment)
  console.log('Test 4: GET /api/v1/clusters/CLU-0002 (Checking real ProjectInvestment row)...');
  const roadRes = await request(app).get('/api/v1/clusters/CLU-0002').expect(200);
  const roadData = roadRes.body;
  assert.strictEqual(roadData.category_id, 'ROADS');
  assert(typeof roadData.investment_context === 'object', 'Investment context must be an object');
  assert(roadData.investment_context.status !== 'UNKNOWN', 'Investment context status must not be UNKNOWN');
  assert(
    roadData.investment_context.project_id === 'INV-BLR-001' ||
    roadData.investment_context.projects?.some((p: any) => p.project_id === 'INV-BLR-001'),
    'Must reference INV-BLR-001'
  );
  console.log('✔ Project Investment context returns matching investment projects when present');

  // Test 4b: Verify non-canonical 3-digit ID (CLU-001) returns 404 (CP-039)
  console.log('Test 4b: GET /api/v1/clusters/CLU-001 returns 404 (strictly canonical Doc 04 §3 CLU-XXXX)...');
  const nonCanonRes = await request(app).get('/api/v1/clusters/CLU-001');
  assert.strictEqual(nonCanonRes.status, 404, '3-digit ID CLU-001 must return 404 NOT_FOUND');
  assert.strictEqual(nonCanonRes.body.error.code, 'NOT_FOUND');
  console.log('✔ 3-digit non-canonical ID correctly rejected with 404');

  // Test 5: 404 for non-existent cluster
  console.log('Test 5: GET /api/v1/clusters/NON_EXISTENT_ID...');
  const notFoundRes = await request(app).get('/api/v1/clusters/CLU-9999').expect(404);
  assert.strictEqual(notFoundRes.body.error.code, 'NOT_FOUND');
  console.log('✔ Returns 404 with standard ErrorResponse envelope for non-existent cluster');

  console.log('\nAll Cluster API integration tests PASSED successfully!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Cluster API integration tests FAILED:', err);
  process.exit(1);
});
