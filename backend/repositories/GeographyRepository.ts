import fs from 'fs';
import path from 'path';
import { Geography, GeographyLevel } from '../models/Geography';
import { loadFromBigQueryOrJson, mapGeography } from './bigqueryStore';

export interface GeographyFilter {
  level?: GeographyLevel;
  parent_geo_id?: string | null;
}

export interface GeographyRepository {
  getById(geo_id: string): Promise<Geography | null>;
  list(filter?: GeographyFilter): Promise<Geography[]>;
  create(geography: Geography): Promise<Geography>;
}

export class LocalJsonGeographyRepository implements GeographyRepository {
  private filePath: string;
  private cache: Geography[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/geographies.json');
  }

  private readJson(): Geography[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as Geography[];
  }

  private async ensureCache(): Promise<Geography[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson('geographies', () => this.readJson(), mapGeography)
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

  async getById(geo_id: string): Promise<Geography | null> {
    const item = (await this.ensureCache()).find((g) => g.geo_id === geo_id);
    return item ? { ...item } : null;
  }

  async list(filter?: GeographyFilter): Promise<Geography[]> {
    let data = await this.ensureCache();
    if (filter) {
      if (filter.level !== undefined) {
        data = data.filter((g) => g.level === filter.level);
      }
      if (filter.parent_geo_id !== undefined) {
        data = data.filter((g) => g.parent_geo_id === filter.parent_geo_id);
      }
    }
    return data.map((item) => ({ ...item }));
  }

  async create(geography: Geography): Promise<Geography> {
    const data = await this.ensureCache();
    const existingIndex = data.findIndex((g) => g.geo_id === geography.geo_id);
    if (existingIndex >= 0) {
      data[existingIndex] = { ...geography };
    } else {
      data.push({ ...geography });
    }
    return { ...geography };
  }
}

export const geographyRepository: GeographyRepository = new LocalJsonGeographyRepository();
export default geographyRepository;
