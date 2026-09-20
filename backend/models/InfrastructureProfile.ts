export interface InfrastructureProfile {
  geo_id: string;
  category_id: string;
  coverage_score: number; // 0-100
  quality_score: number; // 0-100
  capacity_score: number; // 0-100
  facility_count: number | null;
  service_reliability: number; // 0-100
  data_source: string | null;
  as_of_date: string; // date (YYYY-MM-DD)
  synthetic_flag: boolean;
}
