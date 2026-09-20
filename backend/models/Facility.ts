export type FacilityOperationalStatus = 'OPERATIONAL' | 'LIMITED' | 'CLOSED';

export interface Facility {
  facility_id: string; // PK
  geo_id: string;
  category_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  operational_status: FacilityOperationalStatus;
  coverage_area: string | null;
  synthetic_flag: boolean;
}
