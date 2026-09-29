/**
 * Ordered Gemini model candidates used by Contract D explanation and Contract E
 * recommendation live calls. Primary model first, then gemini-3.8-flash, then
 * gemini-flash-latest. This is the documented retry-with-different-model path.
 */
export function geminiModelCandidates(primary: string): string[] {
  const candidateModels = [primary];
  if (!candidateModels.includes('gemini-3.8-flash')) {
    candidateModels.push('gemini-3.8-flash');
  }
  if (!candidateModels.includes('gemini-flash-latest')) {
    candidateModels.push('gemini-flash-latest');
  }
  return candidateModels;
}

export async function callFirstSuccessfulModel<T>(
  models: string[],
  invoke: (model: string) => Promise<T>
): Promise<{ result: T; modelName: string }> {
  let lastError: unknown = null;
  for (const currentModel of models) {
    try {
      const result = await invoke(currentModel);
      return { result, modelName: currentModel };
    } catch (err) {
      lastError = err;
      console.warn(
        `[gemini] model ${currentModel} failed, trying next candidate`,
        err instanceof Error ? err.message : err
      );
    }
  }
  throw lastError || new Error('All Gemini model candidates failed');
}
