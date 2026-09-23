import assert from 'assert';
import { validateDataIntegrity } from '../../scripts/validateDataIntegrity';
import { geographyRepository } from '../../backend/repositories/GeographyRepository';
import { citizenRequestRepository } from '../../backend/repositories/CitizenRequestRepository';
import { issueClusterRepository } from '../../backend/repositories/IssueClusterRepository';
import { gapAssessmentRepository } from '../../backend/repositories/GapAssessmentRepository';

async function runUnitTests() {
  console.log('Running unit tests for RICE-03 Data Model & Repositories...\n');

  // Test 1: Full dataset integrity validation
  console.log('Test 1: validateDataIntegrity()');
  const integrityPassed = validateDataIntegrity();
  assert.strictEqual(integrityPassed, true, 'Data integrity validation must pass with 0 errors');
  console.log('✔ Test 1 passed\n');

  // Test 2: GeographyRepository operations
  console.log('Test 2: GeographyRepository getById & list');
  const state = await geographyRepository.getById('GEO-ST-KA');
  assert(state !== null, 'Should find state GEO-ST-KA');
  assert.strictEqual(state.name, 'Karnataka');
  assert.strictEqual(state.level, 'STATE');

  const districts = await geographyRepository.list({ level: 'DISTRICT' });
  assert.strictEqual(districts.length, 2, 'Should find 2 districts');

  const localUnits = await geographyRepository.list({ level: 'LOCAL_UNIT' });
  assert(localUnits.length >= 10 && localUnits.length <= 20, 'Should find 10-20 local units');
  console.log('✔ Test 2 passed\n');

  // Test 3: CitizenRequestRepository operations
  console.log('Test 3: CitizenRequestRepository getById & list');
  const req1 = await citizenRequestRepository.getById('REQ-KA-0001');
  assert(req1 !== null, 'Should find REQ-KA-0001');
  assert.strictEqual(req1.synthetic_flag, true);

  const waterReqs = await citizenRequestRepository.list({ category_id: 'WATER' });
  assert(waterReqs.length > 0, 'Should have water requests');

  const allReqs = await citizenRequestRepository.list();
  assert(allReqs.length >= 50 && allReqs.length <= 200, 'Should list 50-200 requests');

  // Verify missing location request
  const missingLocationReq = allReqs.find((r) => r.geo_id === null);
  assert(missingLocationReq !== undefined, 'Should have request with geo_id null');
  assert.strictEqual(missingLocationReq.status, 'NEEDS_CLARIFICATION');

  // Verify non-English request
  const nonEnglishReq = allReqs.find((r) => r.language !== 'en');
  assert(nonEnglishReq !== undefined, 'Should have non-English request');

  // Verify specific RICE-03.01 spot-checked records
  const req15 = await citizenRequestRepository.getById('REQ-KA-0015');
  assert(req15 !== null, 'Should find REQ-KA-0015');
  assert.strictEqual(req15.language, 'kn');
  assert.strictEqual(req15.category_id, 'WATER');
  assert.strictEqual(req15.issue_type_id, 'PIPELINE_FAILURE');
  assert(req15.raw_text && req15.raw_text.includes('ಪೈಪ್‌ಲೈನ್'));
  assert(req15.issue_summary && req15.issue_summary.includes('ಪೈಪ್‌ಲೈನ್'));

  const req30 = await citizenRequestRepository.getById('REQ-KA-0030');
  assert(req30 !== null, 'Should find REQ-KA-0030');
  assert.strictEqual(req30.language, 'hi');
  assert.strictEqual(req30.category_id, 'ROADS');
  assert.strictEqual(req30.issue_type_id, 'POTHOLE');
  assert(req30.raw_text && req30.raw_text.includes('गड्ढा'));
  assert(req30.issue_summary && req30.issue_summary.includes('गड्ढा'));

  const req50 = await citizenRequestRepository.getById('REQ-KA-0050');
  assert(req50 !== null, 'Should find REQ-KA-0050');
  assert.strictEqual(req50.geo_id, null);
  assert.strictEqual(req50.category_id, 'WATER');
  assert.strictEqual(req50.issue_type_id, 'SUPPLY_INTERRUPTION');
  assert.strictEqual(req50.status, 'NEEDS_CLARIFICATION');
  assert(req50.raw_text && req50.raw_text.includes('3 days'));
  assert(req50.issue_summary && req50.issue_summary.includes('3 consecutive days'));
  assert.notStrictEqual(req50.issue_summary, req1.issue_summary);
  console.log('✔ Test 3 passed\n');

  // Test 4: IssueClusterRepository operations
  console.log('Test 4: IssueClusterRepository getById & list');
  const cluster = await issueClusterRepository.getById('CLU-001');
  assert(cluster !== null, 'Should find CLU-001');
  assert.strictEqual(cluster.category_id, 'WATER');

  const clusters = await issueClusterRepository.list();
  assert(clusters.length >= 2, 'Should list clusters');
  console.log('✔ Test 4 passed\n');

  // Test 5: GapAssessmentRepository operations
  console.log('Test 5: GapAssessmentRepository getById & list');
  const gap = await gapAssessmentRepository.getById('GAP-001');
  assert(gap !== null, 'Should find GAP-001');
  assert.strictEqual(gap.geo_id, 'GEO-LOC-BLR-01');

  const gaps = await gapAssessmentRepository.list();
  assert(gaps.length >= 2, 'Should list gap assessments');
  console.log('✔ Test 5 passed\n');

  console.log('All unit tests passed successfully!');
}

runUnitTests().catch((err) => {
  console.error('Unit tests failed:', err);
  process.exit(1);
});
