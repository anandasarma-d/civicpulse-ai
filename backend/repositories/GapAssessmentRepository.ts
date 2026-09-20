import fs from 'fs';
import path from 'path';
import { GapAssessment } from '../models/GapAssessment';

export interface GapAssessmentFilter {
  geo_id?: string;
  category_id?: string;
  cluster_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Note: A BigQuery-backed implementation will be added later without changing the interface shape.
 */
export interface GapAssessmentRepository {
  getById(gap_id: string): Promise<GapAssessment | null>;
  list(filter?: GapAssessmentFilter): Promise<GapAssessment[]>;
  create(gapAssessment: GapAssessment): Promise<GapAssessment>;
}

export class LocalJsonGapAssessmentRepository implements GapAssessmentRepository {
  private filePath: string;
  private cache: GapAssessment[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/gap_assessments.json');
  }

  private loadData(): GapAssessment[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as GapAssessment[];
    return this.cache;
  }

  async getById(gap_id: string): Promise<GapAssessment | null> {
    const data = this.loadData();
    const item = data.find((g) => g.gap_id === gap_id);
    return item ? { ...item } : null;
  }

  async list(filter?: GapAssessmentFilter): Promise<GapAssessment[]> {
    let data = this.loadData();
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
    const data = this.loadData();
    const existingIndex = data.findIndex((g) => g.gap_id === gapAssessment.gap_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...gapAssessment };
    } else {
      data.push({ ...gapAssessment });
    }
    return { ...gapAssessment };
  }
}

export const gapAssessmentRepository: GapAssessmentRepository =
  new LocalJsonGapAssessmentRepository();
export default gapAssessmentRepository;
