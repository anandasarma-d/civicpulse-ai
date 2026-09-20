export interface DemographicProfile {
  geo_id: string;
  population: number;
  households: number | null;
  population_density: number | null;
  youth_share: number | null;
  elderly_share: number | null;
  vulnerability_index: number | null;
  data_source: string | null;
  as_of_date: string; // date (YYYY-MM-DD)
  synthetic_flag: boolean;
}
