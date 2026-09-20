import taxonomyData from '../../data/schemas/taxonomy.json';

export interface IssueTypeConfig {
  issue_type_id: string;
  name: string;
}

export interface CategoryConfig {
  category_id: string;
  name: string;
  priority_tier: 'P0' | 'P1';
  issue_types: IssueTypeConfig[];
}

export interface TaxonomyConfig {
  categories: CategoryConfig[];
}

export const TAXONOMY: TaxonomyConfig = taxonomyData as TaxonomyConfig;

export const VALID_CATEGORIES: Set<string> = new Set(
  TAXONOMY.categories.map((c) => c.category_id)
);

export const VALID_ISSUE_TYPES: Set<string> = new Set(
  TAXONOMY.categories.flatMap((c) => c.issue_types.map((it) => it.issue_type_id))
);

export const CATEGORY_ISSUE_MAP: Record<string, string[]> = TAXONOMY.categories.reduce(
  (acc, c) => {
    acc[c.category_id] = c.issue_types.map((it) => it.issue_type_id);
    return acc;
  },
  {} as Record<string, string[]>
);

export default TAXONOMY;
