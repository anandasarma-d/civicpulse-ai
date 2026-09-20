/**
 * Recommendation Service Stub (RICE-02 Foundation)
 * Real implementation scheduled for RICE-04+
 */

export async function getRecommendation(_id?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export const recommendationService = {
  getRecommendation,
};

export default recommendationService;
