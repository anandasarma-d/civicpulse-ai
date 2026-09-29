import fs from 'fs';
import path from 'path';
import { GapAssessment } from '../models/GapAssessment';
import {
  gapAssessmentToBq,
  loadFromBigQueryOrJson,
  mapGapAssessment,
  persistIfBigQuery,
} from './bigqueryStore';

export interface GapAssessmentFilter {
  geo_id?: string;
  category_id?: string;
  cluster_id?: string;
  limit?: number;
  offset?: number;
}

export interface GapAssessmentRepository {
  getById(gap_id: string): Promise<GapAssessment | null>;
  list(filter?: GapAssessmentFilter): Promise<GapAssessment[]>;
  create(gapAssessment: GapAssessment): Promise<GapAssessment>;
}

export class LocalJsonGapAssessmentRepository implements GapAssessmentRepository {
  private filePath: string;
  private cache: GapAssessment[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/gap_assessments.json');
  }

  private readJson(): GapAssessment[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as GapAssessment[];
  }

  private async ensureCache(): Promise<GapAssessment[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson('gap_assessments', () => this.readJson(), mapGapAssessment)
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

  async getById(gap_id: string): Promise<GapAssessment | null> {
    const item = (await this.ensureCache()).find((g) => g.gap_id === gap_id);
    return item ? { ...item } : null;
  }

  async list(filter?: GapAssessmentFilter): Promise<GapAssessment[]> {
    let data = await this.ensureCache();
    if (filter) {
      if (filter.geo_id !== undefined) {
        data = data.filter((g) => g.geo_id === filter.geo_id);
      }
      if (filter.category_id !== undefined) {
        data = data.filter((g) => g.category_id === filter.category_id);
      }
      if (filter.cluster_id !== undefined) {
        data = data.filter((g) => g.cluster_id === filter.cluster_id);
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

  async create(gapAssessment: GapAssessment): Promise<GapAssessment> {
    const data = await this.ensureCache();
    const existingIndex = data.findIndex((g) => g.gap_id === gapAssessment.gap_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...gapAssessment };
    } else {
      data.push({ ...gapAssessment });
    }
    await persistIfBigQuery('gap_assessments', 'gap_id', gapAssessment.gap_id, gapAssessmentToBq(gapAssessment));
    return { ...gapAssessment };
  }
}

export const gapAssessmentRepository: GapAssessmentRepository =
  new LocalJsonGapAssessmentRepository();
export default gapAssessmentRepository;
