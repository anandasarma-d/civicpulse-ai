import assert from 'assert';
import {
  formatEmbeddingInputV1,
  computeCosineSimilarity,
  generateDeterministicEmbeddingVector,
} from '../../backend/services/clustering/embeddingService';
import {
  clusterRequests,
  deterministicTaxonomyGeographyFallback,
} from '../../backend/services/clustering/clusteringService';
import { aggregateIssueCluster } from '../../backend/services/clustering/clusterAggregationService';
import { CitizenRequest } from '../../backend/models/CitizenRequest';

async function testEmbeddingFormatting() {
  console.log('Testing embedding_input_v1 canonical string formatting...');
  const req: Partial<CitizenRequest> = {
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    raw_text: 'Drinking water pipe burst on 80ft road',
  };
  const formatted = formatEmbeddingInputV1(req as any);
  assert.strictEqual(
    formatted,
    'Category: WATER | Issue Type: PIPELINE_FAILURE | Narrative: Drinking water pipe burst on 80ft road'
  );
  console.log('✔ formatEmbeddingInputV1 matches Doc 13 §7 specification');
}

async function testCosineSimilarity() {
  console.log('Testing cosine similarity computation...');
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];

  assert.strictEqual(computeCosineSimilarity(vecA, vecB), 1.0);
  assert.strictEqual(computeCosineSimilarity(vecA, vecC), 0.0);

  const vecD = [1, 1, 0];
  const simAD = computeCosineSimilarity(vecA, vecD);
  assert(Math.abs(simAD - 1 / Math.sqrt(2)) < 1e-6);
  console.log('✔ Cosine similarity accurately calculates directional correlation');
}

async function testDeterministicFallback() {
  console.log('Testing deterministic taxonomy+geography fallback (Technical Constraint 3)...');
  const dummyRequests: CitizenRequest[] = [
    {
      request_id: 'REQ-DUMMY-1',
      category_id: 'WATER',
      issue_type_id: 'DRINKING_WATER_SHORTAGE',
      geo_id: 'GEO-LOC-BLR-01',
      status: 'PROCESSED',
      severity: 4,
      urgency: 4,
      raw_text: 'No water',
      created_at: new Date().toISOString(),
    } as any,
    {
      request_id: 'REQ-DUMMY-2',
      category_id: 'WATER',
      issue_type_id: 'DRINKING_WATER_SHORTAGE',
      geo_id: 'GEO-LOC-BLR-01',
      status: 'PROCESSED',
      severity: 3,
      urgency: 4,
      raw_text: 'Taps dry',
      created_at: new Date().toISOString(),
    } as any,
    {
      request_id: 'REQ-DUMMY-3',
      category_id: 'ROADS',
      issue_type_id: 'POTHOLE',
      geo_id: 'GEO-LOC-BLR-02',
      status: 'PROCESSED',
      severity: 2,
      urgency: 3,
      raw_text: 'Pothole',
      created_at: new Date().toISOString(),
    } as any,
  ];

  const fallbackResult = deterministicTaxonomyGeographyFallback(dummyRequests);
  assert.strictEqual(fallbackResult.is_live_ai, false);
  assert.strictEqual(fallbackResult.execution_source, 'DETERMINISTIC_FALLBACK');
  assert.strictEqual(fallbackResult.clusters.length, 2);

  const waterGroup = fallbackResult.clusters.find((c) => c.category_id === 'WATER');
  assert(waterGroup);
  assert.strictEqual(waterGroup?.requests.length, 2);
  assert.strictEqual(waterGroup?.geo_id, 'GEO-LOC-BLR-01');

  const roadsGroup = fallbackResult.clusters.find((c) => c.category_id === 'ROADS');
  assert(roadsGroup);
  assert.strictEqual(roadsGroup?.requests.length, 1);
  assert.strictEqual(roadsGroup?.geo_id, 'GEO-LOC-BLR-02');
  console.log('✔ Deterministic taxonomy+geography fallback correctly partitions groups without AI');
}

async function testGuardrailsAndDecoyRejection() {
  console.log('Testing geography & taxonomy guardrails (blocking false merges)...');

  // Hero water crisis request in Bellandur
  const heroReq: CitizenRequest = {
    request_id: 'REQ-TS-000101',
    created_at: '2024-03-04T08:00:00Z',
    input_modality: 'TEXT',
    channel: 'mobile',
    language: 'en',
    raw_text: 'Drinking water pipeline ruptured on main road Bellandur Ward 150, no water supply for 4 days for 500 houses.',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    issue_summary: 'Drinking water pipeline ruptured in Bellandur Ward 150.',
    severity: 4,
    urgency: 5,
    affected_service: 'Municipal Potable Water Supply',
    geo_id: 'GEO-LOC-BLR-01',
    status: 'PROCESSED',
    synthetic_flag: true,
  } as any;

  // Paraphrase in same locality
  const localParaphrase: CitizenRequest = {
    request_id: 'REQ-KA-0001',
    created_at: '2024-03-04T08:15:00Z',
    input_modality: 'TEXT',
    channel: 'mobile',
    language: 'en',
    raw_text: 'Taps have been completely dry in Bellandur Green Glen Layout for the past 48 hours. Families are struggling.',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    issue_summary: 'Drinking water shortage due to trunk line damage.',
    severity: 4,
    urgency: 4,
    affected_service: 'Municipal Potable Water Supply',
    geo_id: 'GEO-LOC-BLR-01',
    status: 'PROCESSED',
    synthetic_flag: true,
  } as any;

  // Decoy Case: IDENTICAL wording as hero, but submitted from distant Mysuru (GEO-LOC-MYS-01)
  const decoyDistantReq: CitizenRequest = {
    request_id: 'REQ-TS-000102',
    created_at: '2024-03-04T08:05:00Z',
    input_modality: 'TEXT',
    channel: 'mobile',
    language: 'en',
    raw_text: 'Drinking water pipeline ruptured on main road Bellandur Ward 150, no water supply for 4 days for 500 houses.',
    category_id: 'WATER',
    issue_type_id: 'PIPELINE_FAILURE',
    issue_summary: 'Duplicate complaint submitted from distant Mysuru district.',
    severity: 4,
    urgency: 5,
    affected_service: 'Municipal Potable Water Supply',
    geo_id: 'GEO-LOC-MYS-01', // DISTANT DISTRICT DECOY
    status: 'PROCESSED',
    synthetic_flag: true,
  } as any;

  // Different category in same locality (ROADS instead of WATER)
  const crossTaxonomyReq: CitizenRequest = {
    request_id: 'REQ-DIFF-CAT-1',
    created_at: '2024-03-04T08:20:00Z',
    input_modality: 'TEXT',
    channel: 'mobile',
    language: 'en',
    raw_text: 'Dangerous deep pothole on Bellandur inner road.',
    category_id: 'ROADS',
    issue_type_id: 'POTHOLE',
    severity: 3,
    urgency: 3,
    geo_id: 'GEO-LOC-BLR-01',
    status: 'PROCESSED',
    synthetic_flag: true,
  } as any;

  const clusteringResult = await clusterRequests([
    heroReq,
    localParaphrase,
    decoyDistantReq,
    crossTaxonomyReq,
  ]);

  // Find the cluster containing heroReq
  const heroClusterGroup = clusteringResult.clusters.find((c) =>
    c.requests.some((r) => r.request_id === 'REQ-TS-000101')
  );

  assert(heroClusterGroup, 'Hero cluster group must exist');
  assert.strictEqual(heroClusterGroup?.geo_id, 'GEO-LOC-BLR-01');

  // Check 1: Local paraphrase in GEO-LOC-BLR-01 IS grouped into hero cluster
  const containsLocalParaphrase = heroClusterGroup?.requests.some(
    (r) => r.request_id === 'REQ-KA-0001'
  );
  assert(containsLocalParaphrase, 'Local paraphrase in Bellandur must merge into hero cluster');

  // Check 2: Decoy from GEO-LOC-MYS-01 MUST NOT merge into hero cluster!
  const containsDecoy = heroClusterGroup?.requests.some(
    (r) => r.request_id === 'REQ-TS-000102'
  );
  assert(!containsDecoy, 'Decoy request with same wording from distant district MUST NOT merge into hero cluster');

  // Check 3: Cross taxonomy request (ROADS) MUST NOT merge into WATER cluster!
  const containsCrossTaxonomy = heroClusterGroup?.requests.some(
    (r) => r.request_id === 'REQ-DIFF-CAT-1'
  );
  assert(!containsCrossTaxonomy, 'Cross-taxonomy request MUST NOT merge across category boundaries');

  console.log('✔ Geography guardrail successfully blocked distant district decoy (REQ-TS-000102)');
  console.log('✔ Taxonomy guardrail successfully blocked cross-category false merge');
}

async function run() {
  console.log('=== Starting CivicPulse AI Clustering Unit Tests ===\n');
  try {
    await testEmbeddingFormatting();
    await testCosineSimilarity();
    await testDeterministicFallback();
    await testGuardrailsAndDecoyRejection();
    console.log('\nAll clustering unit tests PASSED successfully!\n');
  } catch (err) {
    console.error('\n❌ Clustering unit tests FAILED:', err);
    process.exit(1);
  }
}

run();
