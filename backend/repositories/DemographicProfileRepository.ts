import fs from 'fs';
import path from 'path';
import { DemographicProfile } from '../models/DemographicProfile';
import { loadFromBigQueryOrJson, mapDemographicProfile } from './bigqueryStore';

export interface DemographicProfileRepository {
  getByGeoId(geo_id: string): Promise<DemographicProfile | null>;
  list(): Promise<DemographicProfile[]>;
}

export class LocalJsonDemographicProfileRepository implements DemographicProfileRepository {
  private filePath: string;
  private cache: DemographicProfile[] | null = null;
  private loading: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/demographic_profiles.json');
  }

  private readJson(): DemographicProfile[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as DemographicProfile[];
  }

  private async ensureCache(): Promise<DemographicProfile[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = loadFromBigQueryOrJson(
        'demographic_profiles',
        () => this.readJson(),
        mapDemographicProfile
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

  async getByGeoId(geo_id: string): Promise<DemographicProfile | null> {
    const item = (await this.ensureCache()).find((d) => d.geo_id === geo_id);
    return item ? { ...item } : null;
  }

  async list(): Promise<DemographicProfile[]> {
    const data = await this.ensureCache();
    return data.map((d) => ({ ...d }));
  }
}

export const demographicProfileRepository: DemographicProfileRepository =
  new LocalJsonDemographicProfileRepository();
export default demographicProfileRepository;
