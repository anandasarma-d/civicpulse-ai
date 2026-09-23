import {
  ClusterDetailData,
  ClusterListResponse,
  IssueClusterSummary,
} from '../types/cluster';

export interface ClusterFilterParams {
  geo_id?: string;
  category_id?: string;
  issue_type_id?: string;
  limit?: number;
  offset?: number;
}

class ClusterService {
  private baseUrl = '/api/v1/clusters';

  async listClusters(params?: ClusterFilterParams): Promise<ClusterListResponse> {
    const query = new URLSearchParams();
    if (params?.geo_id) query.append('geo_id', params.geo_id);
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.issue_type_id) query.append('issue_type_id', params.issue_type_id);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const url = `${this.baseUrl}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch clusters: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getClusterById(clusterId: string): Promise<ClusterDetailData> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(clusterId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch cluster ${clusterId}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async triggerPipeline(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/run-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger clustering pipeline: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}

export const clusterService = new ClusterService();
export default clusterService;
