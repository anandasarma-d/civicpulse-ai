import assert from 'node:assert';
import request from 'supertest';
import app from '../../backend/app';

async function runGovAccessTests() {
  console.log('=== CP-060 Government G-flow access gate ===\n');

  const previousKey = process.env.GOV_DEMO_ACCESS_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  const demoKey = 'cp060-test-shared-secret';

  try {
    process.env.GOV_DEMO_ACCESS_KEY = demoKey;
    process.env.NODE_ENV = 'production';

    console.log('Test 1: GET G-route without key → 401...');
    const denied = await request(app).get('/api/v1/gaps/GAP-0001');
    assert.strictEqual(denied.status, 401);
    assert.strictEqual(denied.body.error.code, 'UNAUTHORIZED');
    console.log('✔ Missing key rejected');

    console.log('Test 2: GET G-route with wrong key → 401...');
    const wrong = await request(app).get('/api/v1/gaps/GAP-0001').set('X-Gov-Access-Key', 'wrong-key');
    assert.strictEqual(wrong.status, 401);
    console.log('✔ Wrong key rejected');

    console.log('Test 3: GET G-route with header key → 200...');
    const allowed = await request(app).get('/api/v1/gaps/GAP-0001').set('X-Gov-Access-Key', demoKey);
    assert.strictEqual(allowed.status, 200);
    assert.strictEqual(allowed.body.gap_id, 'GAP-0001');
    console.log('✔ Header key accepted');

    console.log('Test 4: GET G-route with query fallback → 200...');
    const queryOk = await request(app).get(`/api/v1/gaps/GAP-0001?gov_access_key=${demoKey}`);
    assert.strictEqual(queryOk.status, 200);
    console.log('✔ Query fallback accepted');

    console.log('Test 5: C-flow GET without key still open...');
    const citizenGet = await request(app).get('/api/v1/requests/REQ-TS-000101');
    assert.strictEqual(citizenGet.status, 200);
    assert.strictEqual(citizenGet.body.request_id, 'REQ-TS-000101');
    console.log('✔ C-flow stays public');

    console.log('Test 6: Health stays public...');
    const health = await request(app).get('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('✔ /health unauthenticated');
  } finally {
    if (previousKey === undefined) {
      delete process.env.GOV_DEMO_ACCESS_KEY;
    } else {
      process.env.GOV_DEMO_ACCESS_KEY = previousKey;
    }
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }

  console.log('\n=== CP-060 gov-access tests PASSED ===');
}

runGovAccessTests().catch((err) => {
  console.error('CP-060 gov-access tests FAILED:', err);
  process.exit(1);
});
