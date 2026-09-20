export type GeographyLevel = 'STATE' | 'DISTRICT' | 'SUBDISTRICT_BLOCK' | 'LOCAL_UNIT';

export interface Geography {
  geo_id: string; // PK
  level: GeographyLevel;
  parent_geo_id: string | null;
  code: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
}
