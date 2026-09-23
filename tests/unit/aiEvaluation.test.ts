import { runFullAIEvaluation } from '../../backend/services/request_ai/aiEvaluationHarness';
import { analyzePhotoEvidence } from '../../backend/services/request_ai/photoEvidenceAnalysis';
import { transcribeVoiceAudio } from '../../backend/services/request_ai/voiceTranscription';

async function main() {
  console.log('=== Running CivicPulse AI RICE-05 AI Evaluation Test Set (Doc 06 §19, Doc 07 §10) ===\n');

  // 1. Run full evaluation harness
  const evalResult = await runFullAIEvaluation();

  console.log(`Evaluated ${evalResult.total} test cases across 6 key evaluation dimensions:`);
  console.log('--------------------------------------------------------------------------------');
  console.log(
    `| ${'Test ID'.padEnd(14)} | ${'Dimension'.padEnd(25)} | ${'Expected'.padEnd(22)} | ${'Actual'.padEnd(22)} | ${'Result'.padEnd(6)} |`
  );
  console.log('--------------------------------------------------------------------------------');

  for (const r of evalResult.results) {
    const statusStr = r.passed ? 'PASS' : 'FAIL';
    const expectedShort = `${r.actualCategory}/${r.actualIssueType}`.slice(0, 22);
    const actualShort = `${r.actualCategory}/${r.actualIssueType}`.slice(0, 22);
    console.log(
      `| ${r.testId.padEnd(14)} | ${r.category.padEnd(25)} | ${expectedShort.padEnd(22)} | ${actualShort.padEnd(22)} | ${statusStr.padEnd(6)} |`
    );
    if (!r.passed) {
      console.error(`  ↳ FAIL Details: ${r.notes}`);
    }
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`Summary: ${evalResult.passed}/${evalResult.total} passed (${evalResult.failed} failed).\n`);

  // 2. Multimodal Photo Agreement & Conflict Standalone Verification
  console.log('--- Verifying Multimodal Photo Analysis (AI Contract B) ---');
  const photoAgreement = await analyzePhotoEvidence({
    request_id: 'REQ-TEST-AGREE-01',
    storage_uri: 'gs://civicpulse-bucket/photos/pipeline_water_leak.jpg',
    request_context: {
      raw_text: 'Drinking water pipe burst',
      category_id: 'WATER',
      issue_type_id: 'PIPELINE_FAILURE',
    },
  });
  console.log('Photo Agreement Case:');
  console.log(' - Summary:', photoAgreement.analysis_summary);
  console.log(' - Observable Tags:', photoAgreement.observable_tags);
  console.log(' - Conflict Flag:', photoAgreement.conflict_flag);
  if (photoAgreement.conflict_flag !== false) {
    throw new Error('Expected photoAgreement conflict_flag to be false');
  }

  const photoConflict = await analyzePhotoEvidence({
    request_id: 'REQ-TEST-CONFLICT-01',
    storage_uri: 'gs://civicpulse-bucket/photos/conflict_clean_room.jpg',
    request_context: {
      raw_text: 'Severe water pipeline rupture with massive street flooding.',
      category_id: 'WATER',
      issue_type_id: 'PIPELINE_FAILURE',
    },
  });
  console.log('Photo Conflict Case:');
  console.log(' - Summary:', photoConflict.analysis_summary);
  console.log(' - Conflict Flag:', photoConflict.conflict_flag);
  console.log(' - Conflict Reason:', photoConflict.conflict_reason);
  if (photoConflict.conflict_flag !== true) {
    throw new Error('Expected photoConflict conflict_flag to be true');
  }

  // 3. Voice Transcription Standalone Verification
  console.log('\n--- Verifying Voice Audio Transcription (P0-10) ---');
  const voiceSuccess = await transcribeVoiceAudio({
    audio_uri: 'gs://civicpulse-bucket/audio/hero_voice_water.wav',
    language_hint: 'en',
  });
  console.log('Voice Transcription Case:');
  console.log(' - Transcript:', voiceSuccess.transcript);
  console.log(' - Confidence:', voiceSuccess.confidence);
  if (!voiceSuccess.success || !voiceSuccess.transcript) {
    throw new Error('Expected successful voice transcription');
  }

  const voiceFailure = await transcribeVoiceAudio({
    audio_data: undefined,
    audio_uri: undefined,
  });
  console.log('Voice Failure Case (Missing Audio):');
  console.log(' - Success:', voiceFailure.success);
  console.log(' - Error:', voiceFailure.error);
  if (voiceFailure.success !== false || voiceFailure.transcript !== null) {
    throw new Error('Voice failure case must produce null transcript without fabricating speech');
  }

  if (evalResult.failed > 0) {
    process.exit(1);
  }

  console.log('\n✔ All AI Evaluation and Contract B verification tests passed successfully!');
}

main().catch((err) => {
  console.error('Fatal error running evaluation test:', err);
  process.exit(1);
});
