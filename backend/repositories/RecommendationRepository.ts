import fs from 'fs';
import path from 'path';
import { Recommendation } from '../models/Recommendation';
import {
  loadFromBigQueryOrJson,
  mapRecommendation,
  persistIfBigQuery,
  recommendationToBq,
} from './bigqueryStore';

export interface RecommendationRepository {
  getById(recommendation_id: string): Promise<Recommendation | null>;
  getByGapId(gap_id: string): Promise<Recommendation | null>;
  save(record: Recommendation): Promise<Recommendation>;
  list(): Promise<Recommendation[]>;
}

export class InMemoryRecommendationRepository implements RecommendationRepository {
  private seedPath: string;
  private cache: Recommendation[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.seedPath = filePath || path.resolve(process.cwd(), 'data/seed/recommendations.json');
  }

  private readJson(): Recommendation[] {
    if (!fs.existsSync(this.seedPath)) return [];
    return JSON.parse(fs.readFileSync(this.seedPath, 'utf-8')) as Recommendation[];
  }

  private async ensureCache(): Promise<Recommendation[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson('recommendations', () => this.readJson(), mapRecommendation)
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

  async getById(recommendation_id: string): Promise<Recommendation | null> {
    const item = (await this.ensureCache()).find((r) => r.recommendation_id === recommendation_id);
    return item ? { ...item } : null;
  }

  async getByGapId(gap_id: string): Promise<Recommendation | null> {
    const item = (await this.ensureCache()).find((r) => r.gap_id === gap_id);
    return item ? { ...item } : null;
  }

  async save(record: Recommendation): Promise<Recommendation> {
    const data = await this.ensureCache();
    const idx = data.findIndex((r) => r.recommendation_id === record.recommendation_id);
    if (idx >= 0) {
      data[idx] = { ...record };
    } else {
      data.push({ ...record });
    }
    await persistIfBigQuery(
      'recommendations',
      'recommendation_id',
      record.recommendation_id,
      recommendationToBq(record)
    );
    return { ...record };
  }

  async list(): Promise<Recommendation[]> {
    return (await this.ensureCache()).map((r) => ({ ...r }));
  }
}

export const recommendationRepository: RecommendationRepository =
  new InMemoryRecommendationRepository();
export default recommendationRepository;
