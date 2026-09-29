import { GapAssessmentRecord, GapListResponse } from '../types/gap';
import { govHeaders } from './govAccess';

export interface ListGapsParams {
  category_id?: string;
  geo_id?: string;
  priority_band?: string;
}

/**
 * List gap assessments, sorted priority-descending with gap_id tie-break (Doc 14 §9).
 */
export async function listGaps(params?: ListGapsParams): Promise<GapListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category_id) queryParams.set('category_id', params.category_id);
  if (params?.geo_id) queryParams.set('geo_id', params.geo_id);
  if (params?.priority_band) queryParams.set('priority_band', params.priority_band);

  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const res = await fetch(`/api/v1/gaps${qs}`, { headers: govHeaders() });

  if (!res.ok) {
    throw new Error(`Failed to list gaps: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Retrieve a specific gap assessment with factor breakdown, deterministic priority, and AI explanation (Doc 14 §10).
 */
export async function getGap(gapId: string): Promise<GapAssessmentRecord> {
  const res = await fetch(`/api/v1/gaps/${encodeURIComponent(gapId)}`, { headers: govHeaders() });

  if (!res.ok) {
    throw new Error(`Failed to get gap ${gapId}: HTTP ${res.status}`);
  }

  return res.json();
}

export const gapService = {
  listGaps,
  getGap,
};

export default gapService;
