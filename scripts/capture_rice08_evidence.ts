import request from 'supertest';
import app from '../backend/app';
import { getLastRecommendationCallTrace } from '../backend/services/recommendations/recommendationService';

async function captureEvidence() {
  console.log('=== CAPTURING RICE-08 LIVE EVIDENCE ===\n');

  console.log('--- EVIDENCE 1: RAW GET /api/v1/gaps/GAP-0001 JSON (recommendation_id) ---');
  const gapRes = await request(app).get('/api/v1/gaps/GAP-0001');
  console.log(JSON.stringify(gapRes.body, null, 2));

  console.log('\n--- EVIDENCE 2: RAW GET /api/v1/recommendations/REC-0001 JSON ---');
  const recRes = await request(app).get('/api/v1/recommendations/REC-0001');
  console.log(JSON.stringify(recRes.body, null, 2));

  console.log('\n--- EVIDENCE 3: score_breakdown ---');
  console.log(JSON.stringify(recRes.body.score_breakdown, null, 2));

  const trace = getLastRecommendationCallTrace();
  console.log('\n--- EVIDENCE 4: GEMINI / FALLBACK TRACE (recommendation_v1 Doc 13 §10) ---');
  if (!trace) {
    console.log('No call trace recorded (recommendation was served from cache without generation).');
    return;
  }
  console.log('Trace Metadata:');
  console.log('  Model:', trace.model_name);
  console.log('  Execution source:', trace.execution_source);
  console.log('  Prompt Version: recommendation_v1');
  console.log('  System Instruction:\n' + trace.system_instruction);
  console.log('  User Prompt:\n' + trace.user_prompt);
  console.log('  Raw Model Output:\n' + (trace.raw_model_response || '(none — DETERMINISTIC_FALLBACK)'));
}

captureEvidence().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});
