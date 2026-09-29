import fs from 'fs';
import path from 'path';
import { InfrastructureProfile } from '../models/InfrastructureProfile';
import { loadFromBigQueryOrJson, mapInfrastructureProfile } from './bigqueryStore';

export interface InfrastructureProfileRepository {
  getByGeoAndCategory(geo_id: string, category_id: string): Promise<InfrastructureProfile | null>;
  list(filter?: { geo_id?: string; category_id?: string }): Promise<InfrastructureProfile[]>;
}

export class LocalJsonInfrastructureProfileRepository implements InfrastructureProfileRepository {
  private filePath: string;
  private cache: InfrastructureProfile[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/infrastructure_profiles.json');
  }

  private readJson(): InfrastructureProfile[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as InfrastructureProfile[];
  }

  private async ensureCache(): Promise<InfrastructureProfile[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson(
        'infrastructure_profiles',
        () => this.readJson(),
        mapInfrastructureProfile
      )
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

  async getByGeoAndCategory(
    geo_id: string,
    category_id: string
  ): Promise<InfrastructureProfile | null> {
    const item = (await this.ensureCache()).find(
      (p) => p.geo_id === geo_id && p.category_id === category_id
    );
    return item ? { ...item } : null;
  }

  async list(filter?: { geo_id?: string; category_id?: string }): Promise<InfrastructureProfile[]> {
    let data = await this.ensureCache();
    if (filter) {
      if (filter.geo_id) {
        data = data.filter((p) => p.geo_id === filter.geo_id);
      }
      if (filter.category_id) {
        data = data.filter((p) => p.category_id === filter.category_id);
      }
    }
    return data.map((d) => ({ ...d }));
  }
}

export const infrastructureProfileRepository: InfrastructureProfileRepository =
  new LocalJsonInfrastructureProfileRepository();
export default infrastructureProfileRepository;
