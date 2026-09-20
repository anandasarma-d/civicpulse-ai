/**
 * Request Service Stub (RICE-02 Foundation)
 * Real implementation scheduled for RICE-04+
 */

export async function createRequest(_data?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export async function getRequest(_id?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export const requestService = {
  createRequest,
  getRequest,
};

export default requestService;
