import assert from 'assert';
import {
  callFirstSuccessfulModel,
  geminiModelCandidates,
} from '../../backend/common/geminiModelCandidates';

async function runGeminiModelFallbackTests() {
  console.log('=== gemini-flash-latest fallback (CP-038) ===\n');

  const candidates = geminiModelCandidates('gemini-3.8-flash');
  assert.deepStrictEqual(candidates, ['gemini-3.8-flash', 'gemini-flash-latest']);
  console.log('  ✔ candidate list is primary then gemini-flash-latest:', candidates.join(' → '));

  const attempts: string[] = [];
  const { result, modelName } = await callFirstSuccessfulModel(candidates, async (model) => {
    attempts.push(model);
    if (model === 'gemini-3.8-flash') {
      throw new Error('forced primary model failure (simulated 403 SERVICE_DISABLED)');
    }
    return { text: `response-from-${model}` };
  });

  assert.deepStrictEqual(attempts, ['gemini-3.8-flash', 'gemini-flash-latest']);
  assert.strictEqual(modelName, 'gemini-flash-latest');
  assert.strictEqual(result.text, 'response-from-gemini-flash-latest');
  console.log('  ✔ primary failure engaged gemini-flash-latest');
  console.log('  ✔ fallback model response:', result.text);
  console.log('\nAll gemini model fallback tests PASSED successfully!');
}

runGeminiModelFallbackTests().catch((err) => {
  console.error('gemini model fallback tests failed:', err);
  process.exit(1);
});
