import fs from 'fs';
import path from 'path';
import { IssueCluster } from '../models/IssueCluster';

export interface IssueClusterFilter {
  category_id?: string;
  geo_id?: string;
  issue_type_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Note: A BigQuery-backed implementation will be added later without changing the interface shape.
 */
export interface IssueClusterRepository {
  getById(cluster_id: string): Promise<IssueCluster | null>;
  list(filter?: IssueClusterFilter): Promise<IssueCluster[]>;
  create(cluster: IssueCluster): Promise<IssueCluster>;
}

export class LocalJsonIssueClusterRepository implements IssueClusterRepository {
  private filePath: string;
  private cache: IssueCluster[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/issue_clusters.json');
  }

  private loadData(): IssueCluster[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as IssueCluster[];
    return this.cache;
  }

  async getById(cluster_id: string): Promise<IssueCluster | null> {
    const data = this.loadData();
    const item = data.find((c) => c.cluster_id === cluster_id);
    return item ? { ...item } : null;
  }

  async list(filter?: IssueClusterFilter): Promise<IssueCluster[]> {
    let data = this.loadData();
    if (filter) {
      if (filter.category_id !== undefined) {
        data = data.filter((c) => c.category_id === filter.category_id);
      }
      if (filter.geo_id !== undefined) {
        data = data.filter((c) => c.geo_id === filter.geo_id);
      }
      if (filter.issue_type_id !== undefined) {
        data = data.filter((c) => c.issue_type_id === filter.issue_type_id);
      }
      if (filter.offset !== undefined && filter.offset > 0) {
        data = data.slice(filter.offset);
      }
      if (filter.limit !== undefined && filter.limit > 0) {
        data = data.slice(0, filter.limit);
      }
    }
    return data.map((item) => ({ ...item }));
  }

  async create(cluster: IssueCluster): Promise<IssueCluster> {
    const data = this.loadData();
    const existingIndex = data.findIndex((c) => c.cluster_id === cluster.cluster_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...cluster };
    } else {
      data.push({ ...cluster });
    }
    return { ...cluster };
  }
}

export const issueClusterRepository: IssueClusterRepository =
  new LocalJsonIssueClusterRepository();
export default issueClusterRepository;
