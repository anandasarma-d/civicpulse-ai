import fs from 'fs';
import path from 'path';
import { IssueCluster } from '../models/IssueCluster';
import {
  issueClusterToBq,
  loadFromBigQueryOrJson,
  mapIssueCluster,
  persistIfBigQuery,
} from './bigqueryStore';

export interface IssueClusterFilter {
  category_id?: string;
  geo_id?: string;
  issue_type_id?: string;
  limit?: number;
  offset?: number;
}

export interface IssueClusterRepository {
  getById(cluster_id: string): Promise<IssueCluster | null>;
  list(filter?: IssueClusterFilter): Promise<IssueCluster[]>;
  create(cluster: IssueCluster): Promise<IssueCluster>;
}

export class LocalJsonIssueClusterRepository implements IssueClusterRepository {
  private filePath: string;
  private cache: IssueCluster[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/issue_clusters.json');
  }

  private readJson(): IssueCluster[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as IssueCluster[];
  }

  private async ensureCache(): Promise<IssueCluster[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson('issue_clusters', () => this.readJson(), mapIssueCluster)
        .then((rows) => {
          this.cache = rows;
        })
        .finally(() => {
          this.loading = null;
        });
    }
    await this.loading;
    return this.cache || [];
  }

  async getById(cluster_id: string): Promise<IssueCluster | null> {
    const item = (await this.ensureCache()).find((c) => c.cluster_id === cluster_id);
    return item ? { ...item } : null;
  }

  async list(filter?: IssueClusterFilter): Promise<IssueCluster[]> {
    let data = await this.ensureCache();
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
    const data = await this.ensureCache();
    const existingIndex = data.findIndex((c) => c.cluster_id === cluster.cluster_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...cluster };
    } else {
      data.push({ ...cluster });
    }
    await persistIfBigQuery('issue_clusters', 'cluster_id', cluster.cluster_id, issueClusterToBq(cluster));
    return { ...cluster };
  }
}

export const issueClusterRepository: IssueClusterRepository =
  new LocalJsonIssueClusterRepository();
export default issueClusterRepository;
