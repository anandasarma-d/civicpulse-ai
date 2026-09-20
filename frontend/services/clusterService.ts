/**
 * Cluster Service Stub (RICE-02 Foundation)
 * Real implementation scheduled for RICE-04+
 */

export async function listClusters(_params?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export async function getCluster(_id?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export const clusterService = {
  listClusters,
  getCluster,
};

export default clusterService;
