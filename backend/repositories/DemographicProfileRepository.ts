import fs from 'fs';
import path from 'path';
import { DemographicProfile } from '../models/DemographicProfile';

export interface DemographicProfileRepository {
  getByGeoId(geo_id: string): Promise<DemographicProfile | null>;
  list(): Promise<DemographicProfile[]>;
}

export class LocalJsonDemographicProfileRepository implements DemographicProfileRepository {
  private filePath: string;
  private cache: DemographicProfile[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/demographic_profiles.json');
  }

  private loadData(): DemographicProfile[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as DemographicProfile[];
    return this.cache;
  }

  async getByGeoId(geo_id: string): Promise<DemographicProfile | null> {
    const data = this.loadData();
    const item = data.find((d) => d.geo_id === geo_id);
    return item ? { ...item } : null;
  }

  async list(): Promise<DemographicProfile[]> {
    const data = this.loadData();
    return data.map((d) => ({ ...d }));
  }
}

export const demographicProfileRepository: DemographicProfileRepository =
  new LocalJsonDemographicProfileRepository();
export default demographicProfileRepository;
