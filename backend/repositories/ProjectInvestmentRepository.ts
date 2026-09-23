import fs from 'fs';
import path from 'path';
import { ProjectInvestment } from '../models/ProjectInvestment';

export interface ProjectInvestmentRepository {
  listByGeoAndCategory(geo_id: string, category_id: string): Promise<ProjectInvestment[]>;
  list(filter?: { geo_id?: string; category_id?: string }): Promise<ProjectInvestment[]>;
}

export class LocalJsonProjectInvestmentRepository implements ProjectInvestmentRepository {
  private filePath: string;
  private cache: ProjectInvestment[] | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.resolve(process.cwd(), 'data/seed/project_investments.json');
  }

  private loadData(): ProjectInvestment[] {
    if (this.cache) {
      return this.cache;
    }
    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.cache = JSON.parse(raw) as ProjectInvestment[];
    return this.cache;
  }

  async listByGeoAndCategory(
    geo_id: string,
    category_id: string
  ): Promise<ProjectInvestment[]> {
    const data = this.loadData();
    return data
      .filter((p) => p.geo_id === geo_id && p.category_id === category_id)
      .map((p) => ({ ...p }));
  }

  async list(filter?: { geo_id?: string; category_id?: string }): Promise<ProjectInvestment[]> {
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

export const projectInvestmentRepository: ProjectInvestmentRepository =
  new LocalJsonProjectInvestmentRepository();
export default projectInvestmentRepository;
