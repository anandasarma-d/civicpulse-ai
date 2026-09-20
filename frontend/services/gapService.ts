/**
 * Gap Service Stub (RICE-02 Foundation)
 * Real implementation scheduled for RICE-04+
 */

export async function listGaps(_params?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export async function getGap(_id?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export const gapService = {
  listGaps,
  getGap,
};

export default gapService;
