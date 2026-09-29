import fs from 'fs';
import path from 'path';
import { CitizenRequest, CitizenRequestStatus } from '../models/CitizenRequest';
import {
  citizenRequestToBq,
  loadFromBigQueryOrJson,
  mapCitizenRequest,
  persistIfBigQuery,
} from './bigqueryStore';

export interface CitizenRequestFilter {
  category_id?: string;
  geo_id?: string | null;
  status?: CitizenRequestStatus;
  cluster_id?: string | null;
  limit?: number;
  offset?: number;
}

export interface CitizenRequestRepository {
  getById(request_id: string): Promise<CitizenRequest | null>;
  list(filter?: CitizenRequestFilter): Promise<CitizenRequest[]>;
  create(request: CitizenRequest): Promise<CitizenRequest>;
  update(request_id: string, updates: Partial<CitizenRequest>): Promise<CitizenRequest | null>;
}

export class LocalJsonCitizenRequestRepository implements CitizenRequestRepository {
  private filePath: string;
  private cache: CitizenRequest[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/citizen_requests.json');
  }

  private readJson(): CitizenRequest[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as CitizenRequest[];
  }

  private async ensureCache(): Promise<CitizenRequest[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson('citizen_requests', () => this.readJson(), mapCitizenRequest)
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

  async getById(request_id: string): Promise<CitizenRequest | null> {
    const item = (await this.ensureCache()).find((r) => r.request_id === request_id);
    return item ? { ...item } : null;
  }

  async list(filter?: CitizenRequestFilter): Promise<CitizenRequest[]> {
    let data = await this.ensureCache();
    if (filter) {
      if (filter.category_id !== undefined) {
        data = data.filter((r) => r.category_id === filter.category_id);
      }
      if (filter.geo_id !== undefined) {
        data = data.filter((r) => r.geo_id === filter.geo_id);
      }
      if (filter.status !== undefined) {
        data = data.filter((r) => r.status === filter.status);
      }
      if (filter.cluster_id !== undefined) {
        data = data.filter((r) => r.cluster_id === filter.cluster_id);
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

  async create(request: CitizenRequest): Promise<CitizenRequest> {
    const data = await this.ensureCache();
    const existingIndex = data.findIndex((r) => r.request_id === request.request_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...request };
    } else {
      data.push({ ...request });
    }
    await persistIfBigQuery(
      'citizen_requests',
      'request_id',
      request.request_id,
      citizenRequestToBq(request)
    );
    return { ...request };
  }

  async update(request_id: string, updates: Partial<CitizenRequest>): Promise<CitizenRequest | null> {
    const data = await this.ensureCache();
    const index = data.findIndex((r) => r.request_id === request_id);
    if (index < 0) {
      return null;
    }
    const updated: CitizenRequest = {
      ...data[index],
      ...updates,
      request_id,
    };
    data[index] = updated;
    await persistIfBigQuery(
      'citizen_requests',
      'request_id',
      request_id,
      citizenRequestToBq(updated)
    );
    return { ...updated };
  }
}

export const citizenRequestRepository: CitizenRequestRepository =
  new LocalJsonCitizenRequestRepository();
export default citizenRequestRepository;
