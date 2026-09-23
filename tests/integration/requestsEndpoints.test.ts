import assert from 'node:assert';
import request from 'supertest';
import app from '../../backend/app';
import { citizenRequestRepository } from '../../backend/repositories/CitizenRequestRepository';
import { VALID_CATEGORIES, VALID_ISSUE_TYPES } from '../../backend/common/taxonomy';

async function runIntegrationTests() {
  console.log('=== Running CivicPulse AI RICE-04 Requests Endpoint Integration Tests ===\n');

  // Test 1: POST /api/v1/requests (Hero Scenario - Water Request)
  console.log('Test 1: Submitting Hero Scenario Water Request (POST /api/v1/requests)...');
  const postRes = await request(app)
    .post('/api/v1/requests')
    .set('x-correlation-id', 'test-corr-hero-water-001')
    .send({
      input_modality: 'TEXT',
      channel: 'web',
      language: 'en',
      raw_text: 'Major water pipeline rupture on 80ft Road near Whitefield causing severe drinking water shortage for 500 houses.',
      geo_id: 'GEO-LOC-BLR-01',
      latitude: 12.9698,
      longitude: 77.7500,
    });

  assert.strictEqual(postRes.status, 202, 'Must return HTTP 202 Accepted');
  assert.ok(postRes.body.request_id, 'Must return request_id');
  assert.strictEqual(postRes.body.status, 'PROCESSING', 'Initial status in 202 response must be PROCESSING');
  assert.strictEqual(postRes.body.correlation_id, 'test-corr-hero-water-001', 'Correlation ID must be preserved');

  const createdRequestId = postRes.body.request_id;
  console.log(`✔ Created request: ${createdRequestId}`);

  // Test 2: GET /api/v1/requests/:request_id (Retrieve Hero Request)
  console.log('\nTest 2: Retrieving request and verifying AI understanding (GET /api/v1/requests/:id)...');
  const getRes = await request(app).get(`/api/v1/requests/${createdRequestId}`);

  assert.strictEqual(getRes.status, 200, 'Must return HTTP 200 OK');
  const reqData = getRes.body;

  assert.strictEqual(reqData.request_id, createdRequestId);
  assert.strictEqual(reqData.input_modality, 'TEXT', 'input_modality must be separate and match TEXT');
  assert.strictEqual(reqData.channel, 'web', 'channel must be separate and match web');
  assert.strictEqual(reqData.status, 'PROCESSED', 'Request must reach PROCESSED status');
  assert.strictEqual(reqData.verification_status, 'PENDING', 'Verification status must default to PENDING');
  assert.strictEqual(reqData.category_id, 'WATER', 'category_id must be WATER');
  assert.ok(
    VALID_CATEGORIES.has(reqData.category_id),
    `Category ${reqData.category_id} must be in closed taxonomy`
  );
  assert.ok(
    VALID_ISSUE_TYPES.has(reqData.issue_type_id),
    `Issue type ${reqData.issue_type_id} must be in closed taxonomy`
  );

  // Check 4 approved keys of ai_confidence
  assert.ok(reqData.ai_confidence, 'ai_confidence must be populated');
  assert.strictEqual(typeof reqData.ai_confidence.category, 'number');
  assert.strictEqual(typeof reqData.ai_confidence.issue_type, 'number');
  assert.strictEqual(typeof reqData.ai_confidence.intent, 'number');
  assert.strictEqual(typeof reqData.ai_confidence.location, 'number');
  assert.ok(reqData.ai_confidence.category >= 0 && reqData.ai_confidence.category <= 1);
  assert.ok(reqData.ai_confidence.issue_type >= 0 && reqData.ai_confidence.issue_type <= 1);
  assert.ok(reqData.ai_confidence.intent >= 0 && reqData.ai_confidence.intent <= 1);
  assert.ok(reqData.ai_confidence.location >= 0 && reqData.ai_confidence.location <= 1);

  // Severity and urgency checks
  assert.strictEqual(typeof reqData.severity, 'number');
  assert.ok(reqData.severity >= 1 && reqData.severity <= 5);
  assert.strictEqual(typeof reqData.urgency, 'number');
  assert.ok(reqData.urgency >= 1 && reqData.urgency <= 5);

  console.log('✔ Verified Hero Scenario Water Request:', {
    request_id: reqData.request_id,
    category_id: reqData.category_id,
    issue_type_id: reqData.issue_type_id,
    status: reqData.status,
    verification_status: reqData.verification_status,
    ai_confidence: reqData.ai_confidence,
  });

  // Test 3: Validation Error - Missing required channel or modality
  console.log('\nTest 3: Validation Error on missing channel...');
  const invalidRes = await request(app)
    .post('/api/v1/requests')
    .send({
      input_modality: 'TEXT',
      // missing channel
      raw_text: 'Water leak',
    });

  assert.strictEqual(invalidRes.status, 400, 'Must return 400 on missing channel');
  assert.strictEqual(invalidRes.body.error.code, 'VALIDATION_ERROR');
  console.log('✔ Validation error returned formatted ErrorResponse on missing channel');

  // Test 4: Validation Error - Conflating or invalid modality
  console.log('\nTest 4: Validation Error on invalid modality...');
  const invalidModalityRes = await request(app)
    .post('/api/v1/requests')
    .send({
      input_modality: 'SMOKE_SIGNAL',
      channel: 'web',
      raw_text: 'Water leak',
    });

  assert.strictEqual(invalidModalityRes.status, 400, 'Must return 400 on invalid input_modality');
  console.log('✔ Validation error returned on invalid modality');

  // Test 5: Validation Error - Empty narrative and empty media
  console.log('\nTest 5: Validation Error on empty narrative and media...');
  const emptyRes = await request(app)
    .post('/api/v1/requests')
    .send({
      input_modality: 'TEXT',
      channel: 'web',
      raw_text: '',
    });

  assert.strictEqual(emptyRes.status, 400);
  console.log('✔ Validation error returned on empty content');

  // Test 6: GET /api/v1/requests/:id (Non-existent ID returns 404)
  console.log('\nTest 6: Non-existent request ID returns 404...');
  const notFoundRes = await request(app).get('/api/v1/requests/REQ-KA-9999999');
  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundRes.body.error.code, 'NOT_FOUND');
  console.log('✔ 404 returned correctly for non-existent request ID');

  // Test 7: Incomplete Location Request -> NEEDS_CLARIFICATION
  console.log('\nTest 7: Missing location triggers NEEDS_CLARIFICATION status...');
  const noLocRes = await request(app)
    .post('/api/v1/requests')
    .send({
      input_modality: 'TEXT',
      channel: 'mobile',
      raw_text: 'Huge pothole on the road damaging tires.',
      language: 'en',
      // No geo_id, latitude, or longitude
    });

  assert.strictEqual(noLocRes.status, 202);
  const noLocId = noLocRes.body.request_id;

  const noLocGetRes = await request(app).get(`/api/v1/requests/${noLocId}`);
  assert.strictEqual(noLocGetRes.status, 200);
  assert.strictEqual(noLocGetRes.body.status, 'NEEDS_CLARIFICATION');
  assert.strictEqual(noLocGetRes.body.verification_status, 'NEEDS_CLARIFICATION');
  assert.strictEqual(noLocGetRes.body.ai_confidence.location, 0.0);
  console.log('✔ Missing location correctly set status to NEEDS_CLARIFICATION');

  console.log('\nAll RICE-04 integration tests PASSED successfully!');
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
