export type ProjectInvestmentStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

/**
 * ProjectInvestment:
 * Important: absence of a row for a geo_id/category means "no aligned investment" (UNKNOWN),
 * which is DIFFERENT from a row with budget: 0. Never synthesize a zero-value row to represent absence.
 */
export interface ProjectInvestment {
  project_id: string; // PK
  geo_id: string;
  category_id: string;
  project_name: string;
  status: ProjectInvestmentStatus;
  budget: number | null;
  start_date: string | null; // date
  end_date: string | null; // date
  expected_beneficiaries: number | null;
  coverage_target: string | null;
  source: string | null;
  synthetic_flag: boolean;
}
