import assert from 'node:assert';
import { understandCitizenRequest } from '../../backend/services/request_ai/requestUnderstanding';
import { VALID_CATEGORIES, VALID_ISSUE_TYPES } from '../../backend/common/taxonomy';

async function runTests() {
  console.log('=== Running AI Contract A (Request Understanding) Unit Tests ===\n');

  // Test 1: Hero Scenario — Potable Water Pipeline Rupture
  console.log('Test 1: Hero Scenario (Water Pipeline Rupture)...');
  const heroResult = await understandCitizenRequest({
    raw_text: 'Major water pipeline rupture on 80ft Road near Whitefield causing severe drinking water shortage for 500 houses.',
    language: 'en',
    geo_id: 'GEO-LOC-BLR-01',
    latitude: 12.9698,
    longitude: 77.7500,
  });

  assert.strictEqual(heroResult.category_id, 'WATER', 'Category must be WATER');
  assert.ok(
    VALID_CATEGORIES.has(heroResult.category_id),
    `Category ${heroResult.category_id} must be in closed taxonomy`
  );
  assert.ok(
    VALID_ISSUE_TYPES.has(heroResult.issue_type_id),
    `Issue type ${heroResult.issue_type_id} must be in closed taxonomy`
  );
  assert.strictEqual(typeof heroResult.severity, 'number', 'Severity must be a number');
  assert.ok(heroResult.severity >= 1 && heroResult.severity <= 5, 'Severity must be 1-5');
  assert.strictEqual(typeof heroResult.urgency, 'number', 'Urgency must be a number');
  assert.ok(heroResult.urgency >= 1 && heroResult.urgency <= 5, 'Urgency must be 1-5');

  // Verify the 4 approved keys of ai_confidence
  assert.ok(heroResult.ai_confidence, 'ai_confidence must exist');
  assert.strictEqual(typeof heroResult.ai_confidence.category, 'number', 'category confidence must be numeric');
  assert.strictEqual(typeof heroResult.ai_confidence.issue_type, 'number', 'issue_type confidence must be numeric');
  assert.strictEqual(typeof heroResult.ai_confidence.intent, 'number', 'intent confidence must be numeric');
  assert.strictEqual(typeof heroResult.ai_confidence.location, 'number', 'location confidence must be numeric');
  assert.ok(heroResult.ai_confidence.category >= 0 && heroResult.ai_confidence.category <= 1);
  assert.ok(heroResult.ai_confidence.issue_type >= 0 && heroResult.ai_confidence.issue_type <= 1);
  assert.ok(heroResult.ai_confidence.intent >= 0 && heroResult.ai_confidence.intent <= 1);
  assert.ok(heroResult.ai_confidence.location >= 0 && heroResult.ai_confidence.location <= 1);
  assert.strictEqual(heroResult.needs_clarification, false, 'Well-formed hero request should not need clarification');
  console.log('✔ Hero Scenario Passed: Category WATER, IssueType:', heroResult.issue_type_id, 'Confidence:', heroResult.ai_confidence);

  // Test 2: Multilingual Understanding (Kannada)
  console.log('\nTest 2: Multilingual Understanding (Kannada)...');
  const kannadaResult = await understandCitizenRequest({
    raw_text: 'ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ ಮತ್ತು ಮನೆಗಳಿಗೆ ನೀರು ಸರಬರಾಜು ಸ್ಥಗಿತಗೊಂಡಿದೆ.',
    language: 'kn',
    geo_id: 'GEO-LOC-BLR-02',
    latitude: 12.9716,
    longitude: 77.5946,
  });
  assert.strictEqual(kannadaResult.category_id, 'WATER');
  assert.strictEqual(kannadaResult.language, 'kn');
  assert.ok(VALID_ISSUE_TYPES.has(kannadaResult.issue_type_id));
  console.log('✔ Kannada understanding passed: Category', kannadaResult.category_id, 'IssueType', kannadaResult.issue_type_id);

  // Test 3: Multilingual Understanding (Hindi)
  console.log('\nTest 3: Multilingual Understanding (Hindi)...');
  const hindiResult = await understandCitizenRequest({
    raw_text: 'सड़क पर बहुत बड़ा गड्ढा हो गया है, आए दिन गाड़ियां दुर्घटनाग्रस्त हो रही हैं।',
    language: 'hi',
    geo_id: 'GEO-LOC-BLR-03',
  });
  assert.strictEqual(hindiResult.category_id, 'ROADS');
  assert.strictEqual(hindiResult.language, 'hi');
  assert.strictEqual(hindiResult.issue_type_id, 'POTHOLE');
  console.log('✔ Hindi understanding passed: Category', hindiResult.category_id, 'IssueType', hindiResult.issue_type_id);

  // Test 4: Unknown Taxonomy / Out-of-scope Grievance
  console.log('\nTest 4: Unknown Taxonomy Handling...');
  const unknownResult = await understandCitizenRequest({
    raw_text: 'Someone is playing loud chess tournaments in the park late at night.',
    language: 'en',
    geo_id: 'GEO-LOC-BLR-01',
  });
  assert.strictEqual(unknownResult.category_id, 'UNKNOWN', 'Out-of-scope grievance must map to UNKNOWN');
  assert.strictEqual(unknownResult.issue_type_id, 'UNKNOWN', 'Out-of-scope issue must map to UNKNOWN');
  assert.strictEqual(unknownResult.needs_clarification, true, 'UNKNOWN category must trigger needs_clarification');
  console.log('✔ Unknown taxonomy correctly mapped to UNKNOWN with needs_clarification=true');

  // Test 5: Missing Location Handling
  console.log('\nTest 5: Missing Location Handling...');
  const missingLocationResult = await understandCitizenRequest({
    raw_text: 'There is a huge pothole on the road.',
    language: 'en',
    geo_id: null,
    latitude: null,
    longitude: null,
  });
  assert.strictEqual(missingLocationResult.category_id, 'ROADS');
  assert.strictEqual(missingLocationResult.ai_confidence.location, 0.0, 'Location confidence must be 0 for missing location');
  assert.strictEqual(missingLocationResult.needs_clarification, true, 'Missing location must trigger needs_clarification');
  assert.ok(missingLocationResult.clarification_question, 'Clarification question must be provided');
  console.log('✔ Missing location handled correctly: location confidence 0, needs_clarification=true');

  // Test 6: Priority Scoring Exclusion Check
  console.log('\nTest 6: Priority Scoring Exclusion Verification...');
  assert.strictEqual(
    (heroResult as unknown as Record<string, unknown>).priority_score,
    undefined,
    'Priority score must not be computed by AI Contract A'
  );
  assert.strictEqual(
    (heroResult as unknown as Record<string, unknown>).composite_score,
    undefined,
    'Composite score must not be computed by AI Contract A'
  );
  console.log('✔ Priority scoring strictly excluded from AI Contract A');

  console.log('\nAll AI Contract A unit tests PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
