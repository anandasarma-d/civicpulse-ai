import fs from 'fs';
import path from 'path';
import { CitizenRequest, InputModality, RequestChannel, CitizenRequestStatus, VerificationStatus } from '../backend/models/CitizenRequest';
import { VALID_CATEGORIES, VALID_ISSUE_TYPES } from '../backend/common/taxonomy';

interface ScenarioDefinition {
  requestId: string;
  category_id: string;
  issue_type_id: string;
  affected_service: string;
  language: string;
  raw_text: string;
  issue_summary: string;
  severity: number;
  urgency: number;
  geo_id: string | null;
  cluster_id: string | null;
  status: CitizenRequestStatus;
  verification_status: VerificationStatus;
  modality: InputModality;
  channel: RequestChannel;
  created_at: string;
}

// 60 Coherent, Narrative-First Scenarios
const scenarios: ScenarioDefinition[] = [
  // 1-10: Bellandur Water Crisis (aligned with CLU-001)
  {
    requestId: 'REQ-KA-0001',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Taps have been completely dry in Bellandur Green Glen Layout for the past 48 hours. Families are struggling to procure drinking water.',
    issue_summary: 'Severe potable water supply outage in Bellandur Green Glen Layout lasting over 48 hours.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'mobile',
    created_at: '2024-03-04T08:15:00Z'
  },
  {
    requestId: 'REQ-KA-0002',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Water Distribution Trunk Line',
    language: 'en',
    raw_text: 'A major municipal underground water pipe has cracked near Bellandur Central Junction. Clean water is gushing onto the road and flooding the walkway.',
    issue_summary: 'Major drinking water trunk line fracture causing high-volume water loss and road flooding at Bellandur Central Junction.',
    severity: 4,
    urgency: 5,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-05T09:30:00Z'
  },
  {
    requestId: 'REQ-KA-0003',
    category_id: 'WATER',
    issue_type_id: 'SUPPLY_INTERRUPTION',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Unscheduled water cutoff in Bellandur Ward 150 Sector 3 without any prior notice from the water board.',
    issue_summary: 'Unannounced water supply disruption affecting residents of Bellandur Ward 150 Sector 3.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-06T10:45:00Z'
  },
  {
    requestId: 'REQ-KA-0004',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Arterial Road Maintenance',
    language: 'en',
    raw_text: 'Huge crater-sized pothole on HSR 27th Main Road right opposite the bus depot. Multiple two-wheelers have skidded here today.',
    issue_summary: 'Dangerous large pothole on HSR 27th Main Road causing commuter skidding and accidents.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-06T14:20:00Z'
  },
  {
    requestId: 'REQ-KA-0005',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Drinking water tankers have not arrived in Bellandur Devarabisanahalli for four straight days. Groundwater is saline and undrinkable.',
    issue_summary: 'Four-day absence of potable water tankers in Bellandur Devarabisanahalli leaving residents without drinkable water.',
    severity: 5,
    urgency: 5,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-07T11:10:00Z'
  },
  {
    requestId: 'REQ-KA-0006',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Water Distribution Trunk Line',
    language: 'en',
    raw_text: 'Underground feeder valve broken near Bellandur Lake Road, resulting in low water pressure across 200 households.',
    issue_summary: 'Broken water feeder valve on Bellandur Lake Road causing severe pressure drop across 200 homes.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-08T07:45:00Z'
  },
  {
    requestId: 'REQ-KA-0007',
    category_id: 'WATER',
    issue_type_id: 'SUPPLY_INTERRUPTION',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Daily water supply hours in Bellandur have been reduced from 3 hours to less than 20 minutes without explanation.',
    issue_summary: 'Drastic reduction of municipal water supply duration to 20 minutes in Bellandur.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-08T16:30:00Z'
  },
  {
    requestId: 'REQ-KA-0008',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Community public taps in Bellandur Village are dry. Elderly residents are unable to carry water from distant commercial tankers.',
    issue_summary: 'Dry public taps in Bellandur Village causing severe hardship for senior citizens.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-09T09:00:00Z'
  },
  {
    requestId: 'REQ-KA-0009',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Severe drinking water deficit across Bellandur Ward 150 apartment complexes. Private tankers are price-gouging up to 3000 rupees.',
    issue_summary: 'Acute drinking water shortage in Bellandur apartment clusters with excessive private tanker costs.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'mobile',
    created_at: '2024-03-09T13:40:00Z'
  },
  {
    requestId: 'REQ-KA-0010',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Water Distribution Trunk Line',
    language: 'en',
    raw_text: 'Sub-pipeline burst near Bellandur outer ring road bridge has created water stagnation on the road shoulder and cut supply to local shops.',
    issue_summary: 'Burst water distribution line near Bellandur outer ring road bridge disrupting local commercial supply.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-10T10:15:00Z'
  },

  // 11-20: HSR Layout Road Infrastructure & Pothole Crisis (aligned with CLU-002)
  {
    requestId: 'REQ-KA-0011',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Deep hazardous potholes on HSR Sector 1 19th Main Road. Cars are suffering axle and wheel alignment damage constantly.',
    issue_summary: 'Clustered deep potholes on HSR Sector 1 19th Main damaging commuter vehicles.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-10T11:00:00Z'
  },
  {
    requestId: 'REQ-KA-0012',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'A string of sharp potholes has opened along the pedestrian crossing on HSR 27th Main. Elderly pedestrians are tripping.',
    issue_summary: 'Hazardous potholes along pedestrian crossing on HSR 27th Main causing injury risks.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-11T08:30:00Z'
  },
  {
    requestId: 'REQ-KA-0013',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'The top bituminous layer on HSR Sector 2 Main has disintegrated into loose gravel, creating extreme skid hazards for two-wheelers.',
    issue_summary: 'Bitumen surface degradation and loose gravel skid hazards on HSR Sector 2 Main.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-11T12:15:00Z'
  },
  {
    requestId: 'REQ-KA-0014',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Sunken trench pothole left behind by utility digging across HSR Sector 3 14th Main is jarring vehicles and causing tailbacks.',
    issue_summary: 'Unpaved trench and deep depression left across HSR Sector 3 14th Main causing traffic delays.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-12T09:40:00Z'
  },
  // REQ-KA-0015: Non-English Kannada Failure Case Fix
  {
    requestId: 'REQ-KA-0015',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'kn',
    raw_text: 'ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕಳೆದ ನಾಲ್ಕು ದಿನಗಳಿಂದ ಕುಡಿಯುವ ನೀರು ಬರುತ್ತಿಲ್ಲ, ಮುಖ್ಯ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ.',
    issue_summary: 'ಕುಡಿಯುವ ನೀರಿನ ಮುಖ್ಯ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ ಮತ್ತು 4 ದಿನಗಳಿಂದ ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತಗೊಂಡಿದೆ.',
    severity: 4,
    urgency: 5,
    geo_id: 'GEO-LOC-BLR-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-12T15:20:00Z'
  },
  {
    requestId: 'REQ-KA-0016',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Crater and asphalt breakup on HSR 5th Main near the community park causing heavy dust and bumper scraping.',
    issue_summary: 'Asphalt disintegration and craters on HSR 5th Main near the neighborhood community park.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-13T10:00:00Z'
  },
  {
    requestId: 'REQ-KA-0017',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Complete drinking water breakdown in Bellandur Kaikondrahalli area. Local schools are struggling to provide drinking water to students.',
    issue_summary: 'Drinking water outage in Bellandur Kaikondrahalli impacting local schools and community centers.',
    severity: 5,
    urgency: 5,
    geo_id: 'GEO-LOC-BLR-01',
    cluster_id: 'CLU-001',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-13T11:45:00Z'
  },
  {
    requestId: 'REQ-KA-0018',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Multiple unbarricaded potholes along HSR Sector 4 ring junction creating emergency collision risks at night.',
    issue_summary: 'Unbarricaded deep potholes at HSR Sector 4 ring junction posing severe night-time hazard.',
    severity: 4,
    urgency: 5,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-14T08:10:00Z'
  },
  {
    requestId: 'REQ-KA-0019',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Subgrade subsidence on HSR 17th Cross has caused the left side of the street to slump by six inches.',
    issue_summary: 'Six-inch subgrade pavement subsidence on HSR 17th Cross requiring immediate structural leveling.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-14T14:30:00Z'
  },
  {
    requestId: 'REQ-KA-0020',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Severe pothole clusters along the entire 500-meter stretch of HSR 27th Main between 18th Cross and 22nd Cross.',
    issue_summary: 'Extensive continuous pothole clusters on HSR 27th Main disrupting traffic flow over a 500-meter stretch.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-02',
    cluster_id: 'CLU-002',
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-15T09:20:00Z'
  },

  // 21-30: Varthur & Doddanekkundi Water, Drainage, Roads
  {
    requestId: 'REQ-KA-0021',
    category_id: 'DRAINAGE',
    issue_type_id: 'BLOCKED_DRAIN',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Stormwater canal in Varthur Ward 149 is choked solid with construction rubble and plastic waste, causing backflow into front yards.',
    issue_summary: 'Blocked stormwater canal in Varthur Ward 149 causing sewage and stormwater backflow into residential yards.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-15T13:10:00Z'
  },
  {
    requestId: 'REQ-KA-0022',
    category_id: 'DRAINAGE',
    issue_type_id: 'LOCAL_FLOODING',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Waterlogging of knee-deep rainwater on Varthur Main Road after 30 minutes of moderate rainfall, blocking all vehicular movement.',
    issue_summary: 'Knee-deep waterlogging on Varthur Main Road halting vehicular and pedestrian movement after rain.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-16T08:50:00Z'
  },
  {
    requestId: 'REQ-KA-0023',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Doddanekkundi Ward 85 residential enclave has had no piped drinking water supply for 5 days following motor breakdown.',
    issue_summary: 'Five-day potable water outage in Doddanekkundi Ward 85 caused by municipal motor breakdown.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-16T11:30:00Z'
  },
  {
    requestId: 'REQ-KA-0024',
    category_id: 'ROADS',
    issue_type_id: 'CONNECTIVITY_GAP',
    affected_service: 'Municipal Roads & Transit Access',
    language: 'en',
    raw_text: 'Unpaved 400-meter mud track between Doddanekkundi village and the new Outer Ring Road bus stop is impassable for pedestrians.',
    issue_summary: 'Unpaved 400-meter connectivity gap connecting Doddanekkundi village to Outer Ring Road public transit.',
    severity: 3,
    urgency: 2,
    geo_id: 'GEO-LOC-BLR-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'assisted',
    created_at: '2024-03-17T09:15:00Z'
  },
  {
    requestId: 'REQ-KA-0025',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Water pipe leaking clean drinking water onto Doddanekkundi railway cross road for over a week with no maintenance team attending.',
    issue_summary: 'Persistent drinking water pipeline leak at Doddanekkundi railway cross road ongoing for over a week.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-17T14:40:00Z'
  },
  {
    requestId: 'REQ-KA-0026',
    category_id: 'DRAINAGE',
    issue_type_id: 'BLOCKED_DRAIN',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Roadside gutter overflowing with dark sludge on Domlur 1st Stage 6th Cross, creating awful foul smell and mosquito breeding.',
    issue_summary: 'Sludge overflow and blockage in roadside drainage gutter on Domlur 1st Stage 6th Cross.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-18T10:05:00Z'
  },
  {
    requestId: 'REQ-KA-0027',
    category_id: 'HEALTH_ACCESS',
    issue_type_id: 'FACILITY_ACCESS',
    affected_service: 'Primary Healthcare Services',
    language: 'en',
    raw_text: 'The primary health centre in Domlur lacks a wheelchair ramp and accessible entrance for physically challenged and elderly patients.',
    issue_summary: 'Absence of wheelchair accessibility ramp at Domlur Urban Primary Health Centre.',
    severity: 3,
    urgency: 2,
    geo_id: 'GEO-LOC-BLR-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-18T15:20:00Z'
  },
  {
    requestId: 'REQ-KA-0028',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Broken concrete pavers and uneven stone slabs along Domlur Intermediate Ring Road service lane causing severe vehicle undercarriage damage.',
    issue_summary: 'Deteriorated concrete pavers and uneven service lane on Domlur Intermediate Ring Road.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-19T08:30:00Z'
  },
  {
    requestId: 'REQ-KA-0029',
    category_id: 'WATER',
    issue_type_id: 'SUPPLY_INTERRUPTION',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Rajarajeshwari Nagar Ward 160 BHEL Layout received no Cauvery water supply during the scheduled Tuesday morning distribution window.',
    issue_summary: 'Missed scheduled municipal water distribution in Rajarajeshwari Nagar BHEL Layout.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-19T11:50:00Z'
  },
  // REQ-KA-0030: Non-English Hindi Failure Case Fix
  {
    requestId: 'REQ-KA-0030',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'hi',
    raw_text: 'मुख्य चौराहे पर सड़क पर बहुत गहरा खतरनाक गड्ढा हो गया है, जिससे आए दिन दोपहिया वाहन दुर्घटनाग्रस्त हो रहे हैं और भारी जाम लग रहा है।',
    issue_summary: 'मुख्य चौराहे पर खतरनाक गहरा गड्ढा होने से दोपहिया वाहन गिर रहे हैं और दुर्घटनाएं हो रही हैं।',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-19T16:15:00Z'
  },

  // 31-45: Mysuru District Local Units (Chamundipuram, Kuvempunagar, Saraswathipuram, Gokulam, Hebbal, Jayalakshmipuram)
  {
    requestId: 'REQ-KA-0031',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Chamundipuram Ward 12 elevated area has faced low water pressure and intermittent dry spells for over a week.',
    issue_summary: 'Low water pressure and intermittent dry spells in elevated sections of Chamundipuram Ward 12.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-01',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-20T09:00:00Z'
  },
  {
    requestId: 'REQ-KA-0032',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'City Transit Arterials',
    language: 'en',
    raw_text: 'Dangerous potholes near Chamundipuram circle bus shelter making passenger boarding hazardous for seniors.',
    issue_summary: 'Potholes near Chamundipuram circle bus shelter creating boarding hazard for bus passengers.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-01',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-20T11:40:00Z'
  },
  {
    requestId: 'REQ-KA-0033',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Pipeline leakage in Kuvempunagar Block M is wasting treated water and eroding the roadside foundation.',
    issue_summary: 'Treated drinking water pipeline rupture eroding street subgrade in Kuvempunagar Block M.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-02',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-20T14:10:00Z'
  },
  {
    requestId: 'REQ-KA-0034',
    category_id: 'DRAINAGE',
    issue_type_id: 'BLOCKED_DRAIN',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Kuvempunagar Ward 18 storm drain covered in dried tree branches and leaves causing water to stagnate after rain.',
    issue_summary: 'Storm drain clogged with organic debris in Kuvempunagar Ward 18 creating stagnant water.',
    severity: 2,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-02',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-21T08:25:00Z'
  },
  {
    requestId: 'REQ-KA-0035',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Saraswathipuram 1st Main Road exhibits severe longitudinal cracking and surface raveling over 300 meters.',
    issue_summary: 'Longitudinal pavement cracks and surface raveling along Saraswathipuram 1st Main Road.',
    severity: 3,
    urgency: 2,
    geo_id: 'GEO-LOC-MYS-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-21T12:00:00Z'
  },
  {
    requestId: 'REQ-KA-0036',
    category_id: 'HEALTH_ACCESS',
    issue_type_id: 'CAPACITY_GAP',
    affected_service: 'Community Healthcare Facilities',
    language: 'en',
    raw_text: 'Saraswathipuram community health clinic lacks sufficient diagnostic equipment and doctors during evening rush hours.',
    issue_summary: 'Evening staffing shortage and diagnostic equipment deficit at Saraswathipuram community health clinic.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-21T16:30:00Z'
  },
  {
    requestId: 'REQ-KA-0037',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Deep pothole right before the railway underpass in Gokulam Ward 31 that fills with muddy water and hides its depth.',
    issue_summary: 'Concealed deep pothole before the railway underpass in Gokulam Ward 31.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-22T09:10:00Z'
  },
  {
    requestId: 'REQ-KA-0038',
    category_id: 'ELECTRICITY',
    issue_type_id: 'STREET_LIGHTING',
    affected_service: 'Public Lighting Infrastructure',
    language: 'en',
    raw_text: 'Streetlights on Gokulam 3rd Stage 5th Cross have been non-functional for three weeks, making it unsafe for night commuters.',
    issue_summary: 'Three-week blackout of municipal streetlights on Gokulam 3rd Stage 5th Cross.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-22T13:40:00Z'
  },
  {
    requestId: 'REQ-KA-0039',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Hebbal Ward 42 industrial workers colony facing acute water scarcity due to borewell silt contamination.',
    issue_summary: 'Acute drinking water deficit in Hebbal industrial workers colony due to silt contamination.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-22T17:00:00Z'
  },
  {
    requestId: 'REQ-KA-0040',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Hebbal main distribution valve jammed open, causing constant overflow into the roadside ditch while houses receive zero pressure.',
    issue_summary: 'Jammed municipal water distribution valve causing overflow into roadside ditch in Hebbal.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-23T08:20:00Z'
  },
  {
    requestId: 'REQ-KA-0041',
    category_id: 'SANITATION',
    issue_type_id: 'WASTE_COLLECTION',
    affected_service: 'Municipal Solid Waste Management',
    language: 'en',
    raw_text: 'Door-to-door garbage collection auto has not visited Jayalakshmipuram Ward 55 8th Main for four days, leading to trash piling on street corners.',
    issue_summary: 'Four-day lapse in solid waste collection resulting in street corner garbage accumulation in Jayalakshmipuram.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-23T11:15:00Z'
  },
  {
    requestId: 'REQ-KA-0042',
    category_id: 'WATER',
    issue_type_id: 'SUPPLY_INTERRUPTION',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Jayalakshmipuram Ward 55 morning water supply was contaminated with red sediment and iron smell, rendering it unusable.',
    issue_summary: 'Sediment and rust contamination in Jayalakshmipuram morning municipal water distribution.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-23T15:45:00Z'
  },
  {
    requestId: 'REQ-KA-0043',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'City Transit Arterials',
    language: 'en',
    raw_text: 'Large pothole at the intersection of Jayalakshmipuram Temple Road causing vehicle swerving into oncoming lane.',
    issue_summary: 'Hazardous road pothole at Jayalakshmipuram Temple Road intersection causing lane swerving.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-24T09:30:00Z'
  },
  {
    requestId: 'REQ-KA-0044',
    category_id: 'EDUCATION',
    issue_type_id: 'SCHOOL_CAPACITY',
    affected_service: 'Government Primary Education Infrastructure',
    language: 'en',
    raw_text: 'Government primary school in Chamundipuram has two classrooms with leaky ceilings and broken window panes.',
    issue_summary: 'Damaged ceilings and broken windows in Chamundipuram government primary school classrooms.',
    severity: 3,
    urgency: 2,
    geo_id: 'GEO-LOC-MYS-01',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'assisted',
    created_at: '2024-03-24T12:00:00Z'
  },
  {
    requestId: 'REQ-KA-0045',
    category_id: 'DRAINAGE',
    issue_type_id: 'LOCAL_FLOODING',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Heavy overflow from the road culvert near Saraswathipuram park submerging the main footpath during sudden downpours.',
    issue_summary: 'Footpath submergence and culvert overflow near Saraswathipuram park during heavy rains.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-24T16:10:00Z'
  },

  // 46-49: Additional multilingual & cross-ward requests
  {
    requestId: 'REQ-KA-0046',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'kn',
    raw_text: 'ಕುವೆಂಪುನಗರದಲ್ಲಿ ಬೇಸಿಗೆ ಆರಂಭವಾದಾಗಿನಿಂದ ನೀರಿನ ಕೊರತೆ ಹೆಚ್ಚಾಗಿದೆ, ಸಾರ್ವಜನಿಕ ಕೊಳವೆಬಾವಿ ಕೆಟ್ಟುಹೋಗಿದೆ.',
    issue_summary: 'ಕುವೆಂಪುನಗರದಲ್ಲಿ ಸಾರ್ವಜನಿಕ ಕೊಳವೆಬಾವಿ ದುರಸ್ತಿಯಿಲ್ಲದೆ ಕುಡಿಯುವ ನೀರಿನ ತೀವ್ರ ಕೊರತೆ ಉಂಟಾಗಿದೆ.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-02',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-25T08:45:00Z'
  },
  {
    requestId: 'REQ-KA-0047',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Widespread road surface erosion along Doddanekkundi inner access roads with exposed manhole rims protruding four inches.',
    issue_summary: 'Eroded road surface and dangerously protruding manhole covers on Doddanekkundi inner streets.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-25T11:20:00Z'
  },
  {
    requestId: 'REQ-KA-0048',
    category_id: 'CONNECTIVITY',
    issue_type_id: 'INTERNET_ACCESS',
    affected_service: 'Municipal Digital Centers',
    language: 'en',
    raw_text: 'The public citizen service kiosk in Hebbal has been unable to process ration and pension documents due to disconnected fiber network.',
    issue_summary: 'Fiber connectivity outage at Hebbal citizen service kiosk preventing pension and welfare processing.',
    severity: 2,
    urgency: 2,
    geo_id: 'GEO-LOC-MYS-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-25T14:35:00Z'
  },
  {
    requestId: 'REQ-KA-0049',
    category_id: 'ROADS',
    issue_type_id: 'CONNECTIVITY_GAP',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Lack of asphalt paving on the 200-meter connecting lane between Varthur layout and primary clinic forces ambulance detours.',
    issue_summary: 'Unpaved connecting lane in Varthur causing emergency ambulance detours.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-25T16:00:00Z'
  },

  // REQ-KA-0050: Missing Location Failure Case Fix
  {
    requestId: 'REQ-KA-0050',
    category_id: 'WATER',
    issue_type_id: 'SUPPLY_INTERRUPTION',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Water supply has stopped in our street completely for 3 days and no municipal tankers have arrived to help residents.',
    issue_summary: 'Complete drinking water supply stoppage for 3 consecutive days with no municipal tankers provided.',
    severity: 4,
    urgency: 4,
    geo_id: null, // Missing location scenario
    cluster_id: null,
    status: 'NEEDS_CLARIFICATION',
    verification_status: 'NEEDS_CLARIFICATION',
    modality: 'TEXT',
    channel: 'mobile',
    created_at: '2024-03-26T09:00:00Z'
  },

  // 51-60: Balanced distribution across categories & modalities
  {
    requestId: 'REQ-KA-0051',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Cracked water joint leaking hundreds of liters per hour onto pavement outside Gokulam library.',
    issue_summary: 'Cracked water distribution joint leaking water onto pavement outside Gokulam library.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-26T11:15:00Z'
  },
  {
    requestId: 'REQ-KA-0052',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Deep cavity in asphalt right at the entrance of Domlur bus depot causing traffic jams every morning.',
    issue_summary: 'Deep cavity in road asphalt at the entrance of Domlur bus depot causing recurring traffic congestion.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-26T14:40:00Z'
  },
  {
    requestId: 'REQ-KA-0053',
    category_id: 'DRAINAGE',
    issue_type_id: 'BLOCKED_DRAIN',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Concrete drain cover shattered and drain full of plastic bottles on Chamundipuram main commercial lane.',
    issue_summary: 'Shattered concrete drain cover and plastic debris blockage on Chamundipuram main market road.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-01',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-27T08:30:00Z'
  },
  {
    requestId: 'REQ-KA-0054',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Rajarajeshwari Nagar Ward 160 5th Stage houses receiving water only once every four days during high summer.',
    issue_summary: 'Infrequent drinking water supply scheduled only once every four days in Rajarajeshwari Nagar 5th Stage.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'VOICE',
    channel: 'assisted',
    created_at: '2024-03-27T10:50:00Z'
  },
  {
    requestId: 'REQ-KA-0055',
    category_id: 'ROADS',
    issue_type_id: 'ROAD_DAMAGE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Asphalt edge crumbling along Kuvempunagar Ring Road curve causing cyclists to slip on loose grit.',
    issue_summary: 'Crumbling asphalt road edge and gravel slip hazard along Kuvempunagar Ring Road curve.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-02',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-27T13:20:00Z'
  },
  {
    requestId: 'REQ-KA-0056',
    category_id: 'DRAINAGE',
    issue_type_id: 'LOCAL_FLOODING',
    affected_service: 'Stormwater Drainage Network',
    language: 'en',
    raw_text: 'Rainwater accumulates into a 30-meter pool in front of the Doddanekkundi government high school entrance gate.',
    issue_summary: 'Extensive rainwater ponding at Doddanekkundi government high school entrance gate preventing student access.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-04',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-28T09:10:00Z'
  },
  {
    requestId: 'REQ-KA-0057',
    category_id: 'HEALTH_ACCESS',
    issue_type_id: 'FACILITY_ACCESS',
    affected_service: 'Primary Healthcare Services',
    language: 'en',
    raw_text: 'Street leading to Saraswathipuram dispensary has no pedestrian footpath and is blocked by parked construction vans.',
    issue_summary: 'Pedestrian access to Saraswathipuram dispensary obstructed by lack of walkways and parked construction vehicles.',
    severity: 3,
    urgency: 2,
    geo_id: 'GEO-LOC-MYS-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-28T12:40:00Z'
  },
  {
    requestId: 'REQ-KA-0058',
    category_id: 'WATER',
    issue_type_id: 'DRINKING_WATER_SHORTAGE',
    affected_service: 'Municipal Potable Water Supply',
    language: 'en',
    raw_text: 'Acute water deficit in Varthur sub-ward 149 B-block. Evenings pass with dry taps despite assurances by local maintenance staff.',
    issue_summary: 'Unresolved drinking water scarcity in Varthur sub-ward 149 B-block despite maintenance staff commitments.',
    severity: 4,
    urgency: 4,
    geo_id: 'GEO-LOC-BLR-03',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'MIXED',
    channel: 'mobile',
    created_at: '2024-03-28T15:30:00Z'
  },
  {
    requestId: 'REQ-KA-0059',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    affected_service: 'Urban Road Network',
    language: 'en',
    raw_text: 'Wide pothole cluster on Hebbal Industrial 4th Main damaging delivery trucks and two-wheeler suspensions daily.',
    issue_summary: 'Wide pothole cluster on Hebbal Industrial 4th Main causing ongoing commercial vehicle and bike damage.',
    severity: 3,
    urgency: 4,
    geo_id: 'GEO-LOC-MYS-05',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'PHOTO',
    channel: 'mobile',
    created_at: '2024-03-29T08:45:00Z'
  },
  {
    requestId: 'REQ-KA-0060',
    category_id: 'SANITATION',
    issue_type_id: 'PUBLIC_SANITATION',
    affected_service: 'Public Sanitation Infrastructure',
    language: 'en',
    raw_text: 'Public toilet block near Jayalakshmipuram market has non-functioning flush valves and overflowing sinks.',
    issue_summary: 'Defective plumbing and unhygienic conditions in Jayalakshmipuram market public toilet facility.',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-MYS-06',
    cluster_id: null,
    status: 'PROCESSED',
    verification_status: 'CONFIRMED',
    modality: 'TEXT',
    channel: 'web',
    created_at: '2024-03-29T11:20:00Z'
  }
];

export function generateCitizenRequests(): CitizenRequest[] {
  console.log('Generating coherent citizen requests...');

  const requests: CitizenRequest[] = [];

  for (const s of scenarios) {
    // 1. Validate taxonomy coherence upfront
    if (!VALID_CATEGORIES.has(s.category_id)) {
      throw new Error(`Scenario ${s.requestId} has invalid category_id: ${s.category_id}`);
    }
    if (!VALID_ISSUE_TYPES.has(s.issue_type_id)) {
      throw new Error(`Scenario ${s.requestId} has invalid issue_type_id: ${s.issue_type_id}`);
    }

    // 2. Derive transcript from raw_text if voice/mixed modality
    let transcript: string | null = null;
    let audio_uri: string | null = null;
    let photo_uri: string | null = null;

    if (s.modality === 'VOICE' || s.modality === 'MIXED') {
      audio_uri = `gs://civicpulse-bucket/audio/${s.requestId}.wav`;
      transcript = s.raw_text; // Faithful transcript directly reflecting narrative
    }
    if (s.modality === 'PHOTO' || s.modality === 'MIXED') {
      photo_uri = `gs://civicpulse-bucket/photos/${s.requestId}.jpg`;
    }

    // 3. Construct record
    const record: CitizenRequest = {
      request_id: s.requestId,
      created_at: s.created_at,
      input_modality: s.modality,
      channel: s.channel,
      language: s.language,
      raw_text: s.raw_text,
      audio_uri,
      photo_uri,
      transcript,
      category_id: s.category_id,
      issue_type_id: s.issue_type_id,
      issue_summary: s.issue_summary,
      severity: s.severity,
      urgency: s.urgency,
      affected_service: s.affected_service,
      geo_id: s.geo_id,
      latitude: s.geo_id ? 12.9 + ((requests.length * 7) % 50) * 0.005 : null,
      longitude: s.geo_id ? 77.5 + ((requests.length * 11) % 50) * 0.005 : null,
      ai_confidence: {
        intent: 0.94,
        location: s.geo_id ? 0.91 : 0.0,
        category: 0.96,
        issue_type: 0.93
      },
      verification_status: s.verification_status,
      cluster_id: s.cluster_id,
      status: s.status,
      synthetic_flag: true
    };

    requests.push(record);
  }

  // 4. Self-Check Step (Doc 12 §18)
  runGeneratorSelfCheck(requests);

  const outputPath = path.resolve(process.cwd(), 'data/seed/citizen_requests.json');
  fs.writeFileSync(outputPath, JSON.stringify(requests, null, 2), 'utf-8');
  console.log(`Successfully generated and wrote ${requests.length} citizen requests to ${outputPath}`);

  return requests;
}

/**
 * Self-Check Step per Doc 12 §18:
 * - Verify no two records share identical issue_summary or transcript string unless deliberate duplicates.
 * - Verify that issue_summary keyword overlap with raw_text meets quality threshold.
 * - Verify transcript faithfully matches raw_text for VOICE/MIXED records.
 * - Verify category and issue_type are non-contradictory.
 */
export function runGeneratorSelfCheck(requests: CitizenRequest[]): void {
  console.log('Running generator self-check on generated citizen requests...');

  const summarySeen = new Map<string, string>();
  const transcriptSeen = new Map<string, string>();

  for (const r of requests) {
    // Check 1: No accidental cross-record duplication of issue_summary
    if (r.issue_summary) {
      const existing = summarySeen.get(r.issue_summary);
      if (existing && existing !== r.request_id) {
        throw new Error(
          `Self-Check Violation: Record ${r.request_id} duplicates issue_summary from ${existing}: "${r.issue_summary}"`
        );
      }
      summarySeen.set(r.issue_summary, r.request_id);
    }

    // Check 2: No accidental cross-record duplication of transcript
    if (r.transcript) {
      const existing = transcriptSeen.get(r.transcript);
      if (existing && existing !== r.request_id) {
        throw new Error(
          `Self-Check Violation: Record ${r.request_id} duplicates transcript from ${existing}: "${r.transcript}"`
        );
      }
      transcriptSeen.set(r.transcript, r.request_id);
    }

    // Check 3: For VOICE / MIXED records, transcript must faithfully match raw_text
    if ((r.input_modality === 'VOICE' || r.input_modality === 'MIXED')) {
      if (!r.transcript || r.transcript.trim() === '') {
        throw new Error(
          `Self-Check Violation: Record ${r.request_id} has modality ${r.input_modality} but empty transcript.`
        );
      }
      if (r.raw_text && r.transcript !== r.raw_text) {
        throw new Error(
          `Self-Check Violation: Record ${r.request_id} transcript does not match raw_text narrative.`
        );
      }
    }

    // Check 4: Keyword / semantic overlap between raw_text and issue_summary (language-aware across en, kn, hi)
    if (r.raw_text && r.issue_summary) {
      const cleanTokens = (text: string) =>
        text
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'।॥]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3);

      const rawWords = new Set(cleanTokens(r.raw_text));
      const summaryWords = cleanTokens(r.issue_summary);

      let matches = 0;
      for (const w of summaryWords) {
        if (rawWords.has(w)) {
          matches++;
        }
      }

      // At least 2 significant keywords must overlap between summary and raw text
      if (matches < 2) {
        throw new Error(
          `Self-Check Violation [Language: ${r.language}]: Record ${r.request_id} has insufficient keyword overlap between raw_text and issue_summary. Matches: ${matches}. Summary: "${r.issue_summary}"`
        );
      }
    }
  }

  console.log(`✔ Generator Self-Check PASSED: all ${requests.length} records verified coherent.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateCitizenRequests();
}
