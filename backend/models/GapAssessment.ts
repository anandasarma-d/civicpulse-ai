export interface GapAssessment {
  gap_id: string; // PK, format GAP-{number}
  geo_id: string;
  category_id: string;
  cluster_id: string;
  citizen_demand: number;
  population_affected: number;
  infrastructure_gap: number;
  urgency_severity: number;
  investment_gap: number;
  equity_need: number;
  priority_score: number;
  rank: number;
  calculated_at: string; // datetime (ISO 8601)
  calculation_version: string;
}
