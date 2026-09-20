import fs from 'fs';
import path from 'path';
import { TAXONOMY, VALID_CATEGORIES, VALID_ISSUE_TYPES } from '../backend/common/taxonomy';
import { Geography } from '../backend/models/Geography';
import { DemographicProfile } from '../backend/models/DemographicProfile';
import { InfrastructureProfile } from '../backend/models/InfrastructureProfile';
import { Facility } from '../backend/models/Facility';
import { ProjectInvestment } from '../backend/models/ProjectInvestment';
import { CitizenRequest } from '../backend/models/CitizenRequest';
import { MediaEvidence } from '../backend/models/MediaEvidence';
import { RequestEmbedding } from '../backend/models/RequestEmbedding';
import { IssueCluster } from '../backend/models/IssueCluster';
import { GapAssessment } from '../backend/models/GapAssessment';
import { Recommendation } from '../backend/models/Recommendation';

interface ValidationResult {
  violations: string[];
  passedCount: number;
}

function loadJson<T>(filename: string): T[] {
  const fullPath = path.resolve(process.cwd(), 'data/seed', filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Seed file not found: ${fullPath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T[];
}

export function validateDataIntegrity(): boolean {
  console.log('====================================================');
  console.log('  CivicPulse AI — Data Model & Integrity Validation');
  console.log('====================================================\n');

  const violations: string[] = [];
  let checksPassed = 0;

  // 1. Load all seed collections
  const geographies = loadJson<Geography>('geographies.json');
  const demographics = loadJson<DemographicProfile>('demographic_profiles.json');
  const infraProfiles = loadJson<InfrastructureProfile>('infrastructure_profiles.json');
  const facilities = loadJson<Facility>('facilities.json');
  const investments = loadJson<ProjectInvestment>('project_investments.json');
  const citizenRequests = loadJson<CitizenRequest>('citizen_requests.json');
  const mediaEvidence = loadJson<MediaEvidence>('media_evidence.json');
  const embeddings = loadJson<RequestEmbedding>('request_embeddings.json');
  const issueClusters = loadJson<IssueCluster>('issue_clusters.json');
  const gapAssessments = loadJson<GapAssessment>('gap_assessments.json');
  const recommendations = loadJson<Recommendation>('recommendations.json');

  console.log(`Loaded entities:
  - Geographies: ${geographies.length}
  - Demographic Profiles: ${demographics.length}
  - Infrastructure Profiles: ${infraProfiles.length}
  - Facilities: ${facilities.length}
  - Project Investments: ${investments.length}
  - Citizen Requests: ${citizenRequests.length}
  - Media Evidence: ${mediaEvidence.length}
  - Request Embeddings: ${embeddings.length}
  - Issue Clusters: ${issueClusters.length}
  - Gap Assessments: ${gapAssessments.length}
  - Recommendations: ${recommendations.length}\n`);

  const geoIdSet = new Set(geographies.map((g) => g.geo_id));
  const requestIdSet = new Set(citizenRequests.map((r) => r.request_id));
  const clusterIdSet = new Set(issueClusters.map((c) => c.cluster_id));
  const gapIdSet = new Set(gapAssessments.map((g) => g.gap_id));

  // --- CHECK 1: Geography hierarchy and IDs ---
  for (const g of geographies) {
    if (g.parent_geo_id && !geoIdSet.has(g.parent_geo_id)) {
      violations.push(`Geography ${g.geo_id} has nonexistent parent_geo_id: ${g.parent_geo_id}`);
    }
  }
  checksPassed++;

  // --- CHECK 2: All referenced geo_ids resolve to valid Geography records ---
  for (const d of demographics) {
    if (!geoIdSet.has(d.geo_id)) {
      violations.push(`DemographicProfile references invalid geo_id: ${d.geo_id}`);
    }
  }
  for (const ip of infraProfiles) {
    if (!geoIdSet.has(ip.geo_id)) {
      violations.push(`InfrastructureProfile references invalid geo_id: ${ip.geo_id}`);
    }
  }
  for (const f of facilities) {
    if (!geoIdSet.has(f.geo_id)) {
      violations.push(`Facility ${f.facility_id} references invalid geo_id: ${f.geo_id}`);
    }
  }
  for (const inv of investments) {
    if (!geoIdSet.has(inv.geo_id)) {
      violations.push(`ProjectInvestment ${inv.project_id} references invalid geo_id: ${inv.geo_id}`);
    }
  }
  for (const req of citizenRequests) {
    if (req.geo_id !== null && !geoIdSet.has(req.geo_id)) {
      violations.push(`CitizenRequest ${req.request_id} references invalid geo_id: ${req.geo_id}`);
    }
  }
  for (const clu of issueClusters) {
    if (!geoIdSet.has(clu.geo_id)) {
      violations.push(`IssueCluster ${clu.cluster_id} references invalid geo_id: ${clu.geo_id}`);
    }
  }
  for (const gap of gapAssessments) {
    if (!geoIdSet.has(gap.geo_id)) {
      violations.push(`GapAssessment ${gap.gap_id} references invalid geo_id: ${gap.geo_id}`);
    }
  }
  checksPassed++;

  // --- CHECK 3: Category IDs and Issue Type IDs exist in Taxonomy ---
  for (const ip of infraProfiles) {
    if (!VALID_CATEGORIES.has(ip.category_id)) {
      violations.push(`InfrastructureProfile has invalid category_id: ${ip.category_id}`);
    }
  }
  for (const f of facilities) {
    if (!VALID_CATEGORIES.has(f.category_id)) {
      violations.push(`Facility ${f.facility_id} has invalid category_id: ${f.category_id}`);
    }
  }
  for (const inv of investments) {
    if (!VALID_CATEGORIES.has(inv.category_id)) {
      violations.push(`ProjectInvestment ${inv.project_id} has invalid category_id: ${inv.category_id}`);
    }
  }
  for (const req of citizenRequests) {
    if (req.category_id !== null && !VALID_CATEGORIES.has(req.category_id)) {
      violations.push(`CitizenRequest ${req.request_id} has invalid category_id: ${req.category_id}`);
    }
    if (req.issue_type_id !== null && !VALID_ISSUE_TYPES.has(req.issue_type_id)) {
      violations.push(`CitizenRequest ${req.request_id} has invalid issue_type_id: ${req.issue_type_id}`);
    }
  }
  for (const clu of issueClusters) {
    if (!VALID_CATEGORIES.has(clu.category_id)) {
      violations.push(`IssueCluster ${clu.cluster_id} has invalid category_id: ${clu.category_id}`);
    }
    if (!VALID_ISSUE_TYPES.has(clu.issue_type_id)) {
      violations.push(`IssueCluster ${clu.cluster_id} has invalid issue_type_id: ${clu.issue_type_id}`);
    }
  }
  for (const gap of gapAssessments) {
    if (!VALID_CATEGORIES.has(gap.category_id)) {
      violations.push(`GapAssessment ${gap.gap_id} has invalid category_id: ${gap.category_id}`);
    }
  }
  checksPassed++;

  // --- CHECK 4: Every synthetic_flag is true ---
  for (const d of demographics) {
    if (d.synthetic_flag !== true) {
      violations.push(`DemographicProfile for geo ${d.geo_id} has synthetic_flag != true`);
    }
  }
  for (const ip of infraProfiles) {
    if (ip.synthetic_flag !== true) {
      violations.push(`InfrastructureProfile for geo ${ip.geo_id}/${ip.category_id} has synthetic_flag != true`);
    }
  }
  for (const f of facilities) {
    if (f.synthetic_flag !== true) {
      violations.push(`Facility ${f.facility_id} has synthetic_flag != true`);
    }
  }
  for (const inv of investments) {
    if (inv.synthetic_flag !== true) {
      violations.push(`ProjectInvestment ${inv.project_id} has synthetic_flag != true`);
    }
  }
  for (const req of citizenRequests) {
    if (req.synthetic_flag !== true) {
      violations.push(`CitizenRequest ${req.request_id} has synthetic_flag != true`);
    }
  }
  for (const med of mediaEvidence) {
    if (med.synthetic_flag !== true) {
      violations.push(`MediaEvidence ${med.media_id} has synthetic_flag != true`);
    }
  }
  checksPassed++;

  // --- CHECK 5: Foreign key integrity across relationships ---
  for (const med of mediaEvidence) {
    if (!requestIdSet.has(med.request_id)) {
      violations.push(`MediaEvidence ${med.media_id} references orphaned request_id: ${med.request_id}`);
    }
  }
  for (const emb of embeddings) {
    if (!requestIdSet.has(emb.request_id)) {
      violations.push(`RequestEmbedding references orphaned request_id: ${emb.request_id}`);
    }
  }
  for (const req of citizenRequests) {
    if (req.cluster_id !== null && !clusterIdSet.has(req.cluster_id)) {
      violations.push(`CitizenRequest ${req.request_id} references orphaned cluster_id: ${req.cluster_id}`);
    }
  }
  for (const clu of issueClusters) {
    for (const reqId of clu.representative_request_ids) {
      if (!requestIdSet.has(reqId)) {
        violations.push(`IssueCluster ${clu.cluster_id} references orphaned representative request_id: ${reqId}`);
      }
    }
  }
  for (const gap of gapAssessments) {
    if (!clusterIdSet.has(gap.cluster_id)) {
      violations.push(`GapAssessment ${gap.gap_id} references orphaned cluster_id: ${gap.cluster_id}`);
    }
  }
  for (const rec of recommendations) {
    if (!gapIdSet.has(rec.gap_id)) {
      violations.push(`Recommendation ${rec.recommendation_id} references orphaned gap_id: ${rec.gap_id}`);
    }
  }
  checksPassed++;

  // --- CHECK 6: Specific dataset constraints from specification ---
  // A: 1 state, 2 districts, 10-20 local units
  const states = geographies.filter((g) => g.level === 'STATE');
  const districts = geographies.filter((g) => g.level === 'DISTRICT');
  const localUnits = geographies.filter((g) => g.level === 'LOCAL_UNIT');

  if (states.length !== 1) {
    violations.push(`Expected exactly 1 state, found ${states.length}`);
  }
  if (districts.length !== 2) {
    violations.push(`Expected exactly 2 districts, found ${districts.length}`);
  }
  if (localUnits.length < 10 || localUnits.length > 20) {
    violations.push(`Expected 10-20 local units, found ${localUnits.length}`);
  }

  // B: 5-10 facilities
  if (facilities.length < 5 || facilities.length > 10) {
    violations.push(`Expected 5-10 facilities, found ${facilities.length}`);
  }

  // C: 5-10 project investments with some geo/category combinations having no row
  if (investments.length < 5 || investments.length > 10) {
    violations.push(`Expected 5-10 project investments, found ${investments.length}`);
  }
  // Check that no zero-budget row was fabricated to indicate absence
  for (const inv of investments) {
    if (inv.budget === 0) {
      violations.push(`ProjectInvestment ${inv.project_id} has budget: 0 (must omit row for absence instead of zero-value placeholder)`);
    }
  }

  // D: 50-200 CitizenRequests across at least WATER and ROADS
  if (citizenRequests.length < 50 || citizenRequests.length > 200) {
    violations.push(`Expected 50-200 citizen requests, found ${citizenRequests.length}`);
  }
  const waterReqs = citizenRequests.filter((r) => r.category_id === 'WATER');
  const roadReqs = citizenRequests.filter((r) => r.category_id === 'ROADS');
  if (waterReqs.length === 0 || roadReqs.length === 0) {
    violations.push(`Expected citizen requests in both WATER and ROADS categories`);
  }

  // E: At least one request in non-English
  const nonEnglishReqs = citizenRequests.filter((r) => r.language !== 'en');
  if (nonEnglishReqs.length === 0) {
    violations.push(`Expected at least one request with language != 'en'`);
  }

  // F: At least one request with geo_id: null and status NEEDS_CLARIFICATION
  const missingLocationReqs = citizenRequests.filter(
    (r) => r.geo_id === null && r.status === 'NEEDS_CLARIFICATION'
  );
  if (missingLocationReqs.length === 0) {
    violations.push(`Expected at least one request with geo_id: null and status NEEDS_CLARIFICATION`);
  }
  checksPassed++;

  // SUMMARY REPORT
  console.log('Validation Results:');
  console.log(`- Core Checks Evaluated: ${checksPassed}`);
  console.log(`- Total Violations Detected: ${violations.length}`);

  if (violations.length > 0) {
    console.error('\nFAIL — Data Integrity Violations:');
    violations.forEach((v, idx) => console.error(`  ${idx + 1}. ${v}`));
    return false;
  }

  console.log('\nPASS — All integrity constraints and specification rules validated with 0 errors.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const success = validateDataIntegrity();
  process.exit(success ? 0 : 1);
}
