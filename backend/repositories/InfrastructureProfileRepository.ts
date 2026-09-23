import fs from 'fs';
import path from 'path';
import { InfrastructureProfile } from '../models/InfrastructureProfile';

export interface InfrastructureProfileRepository {
  getByGeoAndCategory(geo_id: string, category_id: string): Promise<InfrastructureProfile | null>;
  list(filter?: { geo_id?: string; category_id?: string }): Promise<InfrastructureProfile[]>;
}

export class LocalJsonInfrastructureProfileRepository implements InfrastructureProfileRepository {
  private filePath: string;
  private cache: InfrastructureProfile[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/infrastructure_profiles.json');
  }

  private loadData(): InfrastructureProfile[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as InfrastructureProfile[];
    return this.cache;
  }

  async getByGeoAndCategory(
    geo_id: string,
    category_id: string
  ): Promise<InfrastructureProfile | null> {
    const data = this.loadData();
    const item = data.find(
      (p) => p.geo_id === geo_id && p.category_id === category_id
    );
    return item ? { ...item } : null;
  }

  async list(filter?: { geo_id?: string; category_id?: string }): Promise<InfrastructureProfile[]> {
    let data = this.loadData();
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
