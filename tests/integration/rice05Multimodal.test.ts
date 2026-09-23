import assert from 'node:assert';
import request from 'supertest';
import app from '../../backend/app';

async function runRICE05IntegrationTests() {
  console.log('=== Running CivicPulse AI RICE-05 Voice & Multimodal Integration Tests ===\n');

  // Test 1: VOICE Hero Scenario Submission end-to-end
  console.log('Test 1: Submitting VOICE Hero Scenario Water Request (POST /api/v1/requests)...');
  const voicePostRes = await request(app)
    .post('/api/v1/requests')
    .set('x-correlation-id', 'test-corr-voice-hero-001')
    .send({
      input_modality: 'VOICE',
      channel: 'mobile',
      language: 'en',
      media: [
        {
          media_type: 'AUDIO',
          uri: 'gs://civicpulse-bucket/audio/hero_voice_water.wav',
          mime_type: 'audio/wav',
        },
      ],
      geo_id: 'GEO-LOC-BLR-01',
      latitude: 12.9698,
      longitude: 77.75,
    });

  assert.strictEqual(voicePostRes.status, 202, 'Must return HTTP 202 Accepted');
  const voiceRequestId = voicePostRes.body.request_id;
  assert.ok(voiceRequestId, 'Must return request_id');
  console.log(`✔ Created VOICE request: ${voiceRequestId}`);

  const voiceGetRes = await request(app).get(`/api/v1/requests/${voiceRequestId}`);
  assert.strictEqual(voiceGetRes.status, 200);
  const voiceData = voiceGetRes.body;
  console.log('✔ VOICE Request Details:');
  console.log(' - Input Modality:', voiceData.input_modality);
  console.log(' - Category:', voiceData.category_id);
  console.log(' - Issue Type:', voiceData.issue_type_id);
  console.log(' - Transcript:', voiceData.transcript);
  console.log(' - Verification Status:', voiceData.verification_status);
  console.log(' - Status:', voiceData.status);

  assert.strictEqual(voiceData.input_modality, 'VOICE');
  assert.strictEqual(voiceData.category_id, 'WATER');
  assert.strictEqual(voiceData.issue_type_id, 'PIPELINE_FAILURE');
  assert.ok(voiceData.transcript && voiceData.transcript.length > 0, 'Transcript must be produced from audio');
  assert.strictEqual(voiceData.verification_status, 'PENDING', 'Must remain PENDING (no auto-confirmation)');
  assert.strictEqual(voiceData.status, 'PROCESSED');

  // Test 2: PHOTO/Text Conflict Case end-to-end
  console.log('\nTest 2: Submitting PHOTO/Text Conflict Case (Severe flood text + indoor tidy room photo)...');
  const conflictPostRes = await request(app)
    .post('/api/v1/requests')
    .set('x-correlation-id', 'test-corr-conflict-001')
    .send({
      input_modality: 'MIXED',
      channel: 'mobile',
      language: 'en',
      raw_text: 'Major water pipeline rupture on main avenue causing street flooding.',
      media: [
        {
          media_type: 'PHOTO',
          uri: 'gs://civicpulse-bucket/photos/conflict_clean_room.jpg',
          mime_type: 'image/jpeg',
        },
      ],
      geo_id: 'GEO-LOC-BLR-01',
      latitude: 12.9698,
      longitude: 77.75,
    });

  assert.strictEqual(conflictPostRes.status, 202);
  const conflictRequestId = conflictPostRes.body.request_id;
  console.log(`✔ Created Conflict request: ${conflictRequestId}`);

  const conflictGetRes = await request(app).get(`/api/v1/requests/${conflictRequestId}`);
  assert.strictEqual(conflictGetRes.status, 200);
  const conflictData = conflictGetRes.body;
  console.log('✔ Conflict Request Details:');
  console.log(' - Category:', conflictData.category_id);
  console.log(' - Status:', conflictData.status);
  console.log(' - Verification Status:', conflictData.verification_status);
  console.log(' - Media Evidence Count:', conflictData.media_evidence?.length);
  if (conflictData.media_evidence && conflictData.media_evidence.length > 0) {
    const med = conflictData.media_evidence[0];
    console.log(' - Media Evidence Analysis Summary:', med.analysis_summary);
    console.log(' - Media Evidence Observations:', JSON.stringify(med.observations));
    console.log(' - Conflict Flag:', med.observations?.conflict_flag);
    assert.strictEqual(med.observations?.conflict_flag, true, 'Conflict flag in MediaEvidence must be true');
  }

  // Material conflict flags the request for review
  assert.strictEqual(conflictData.status, 'REVIEW_REQUIRED', 'Material conflict must set status to REVIEW_REQUIRED');
  assert.strictEqual(conflictData.verification_status, 'PENDING', 'Verification status must stay PENDING');

  // Test 3: PHOTO Agreement Case end-to-end
  console.log('\nTest 3: Submitting PHOTO Agreement Case (Water pipeline leak text + matching photo)...');
  const agreePostRes = await request(app)
    .post('/api/v1/requests')
    .set('x-correlation-id', 'test-corr-agree-001')
    .send({
      input_modality: 'MIXED',
      channel: 'mobile',
      language: 'en',
      raw_text: 'Pipeline burst leaking water onto street footpath.',
      media: [
        {
          media_type: 'PHOTO',
          uri: 'gs://civicpulse-bucket/photos/pipeline_water_leak.jpg',
          mime_type: 'image/jpeg',
        },
      ],
      geo_id: 'GEO-LOC-BLR-01',
      latitude: 12.9698,
      longitude: 77.75,
    });

  assert.strictEqual(agreePostRes.status, 202);
  const agreeRequestId = agreePostRes.body.request_id;
  console.log(`✔ Created Agreement request: ${agreeRequestId}`);

  const agreeGetRes = await request(app).get(`/api/v1/requests/${agreeRequestId}`);
  assert.strictEqual(agreeGetRes.status, 200);
  const agreeData = agreeGetRes.body;
  assert.strictEqual(agreeData.status, 'PROCESSED');
  assert.strictEqual(agreeData.verification_status, 'PENDING');
  assert.strictEqual(agreeData.media_evidence?.[0]?.observations?.conflict_flag, false);
  console.log('✔ Agreement request processed successfully with conflict_flag: false');

  console.log('\nAll RICE-05 integration tests PASSED successfully!');
}

runRICE05IntegrationTests().catch((err) => {
  console.error('RICE-05 integration test failed:', err);
  process.exit(1);
});
