import { RecommendationApiResponse } from '../types/recommendation';
import { govHeaders } from './govAccess';

export async function getRecommendation(recommendationId: string): Promise<RecommendationApiResponse> {
  const res = await fetch(`/api/v1/recommendations/${encodeURIComponent(recommendationId)}`, {
    headers: govHeaders(),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Failed to get recommendation ${recommendationId}: HTTP ${res.status}`);
  }
  return res.json();
}

export const recommendationService = {
  getRecommendation,
};

export default recommendationService;
