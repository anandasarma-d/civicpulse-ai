import { understandCitizenRequest, RequestUnderstandingInput } from './requestUnderstanding';
import { analyzePhotoEvidence, PhotoEvidenceInput } from './photoEvidenceAnalysis';
import { transcribeVoiceAudio, VoiceTranscriptionInput } from './voiceTranscription';

export interface EvaluationTestCase {
  id: string;
  category: 'PARAPHRASE' | 'GEOGRAPHY_INDEPENDENCE' | 'AMBIGUOUS_OR_MISSING_LOCATION' | 'PHOTO_AGREEMENT_AND_CONFLICT' | 'UNKNOWN_TAXONOMY' | 'INFRASTRUCTURE_COMPARISON';
  description: string;
  requestInput: RequestUnderstandingInput;
  photoInput?: PhotoEvidenceInput;
  voiceInput?: VoiceTranscriptionInput;
  assertions: {
    expectedCategory: string;
    expectedIssueType: string;
    expectedStatus?: string;
    expectedVerificationStatus?: string;
    expectedNeedsClarification?: boolean;
    expectedConflictFlag?: boolean;
    expectedVoiceSuccess?: boolean;
    assertionDescription: string;
  };
}

export interface EvaluationResult {
  testId: string;
  category: string;
  description: string;
  passed: boolean;
  actualCategory: string;
  actualIssueType: string;
  needsClarification: boolean;
  conflictFlag?: boolean;
  voiceSuccess?: boolean;
  confidence: {
    category: number;
    issue_type: number;
    intent: number;
    location: number;
  };
  notes: string;
}

/**
 * Curated AI Evaluation Test Set (Doc 06 §19, Doc 07 §10)
 * 1. Paraphrase family (same issue, multiple phrasings in English, Kannada, and Hindi)
 * 2. Same issue across different geographies (classification/embedding-readiness level, no premature clustering)
 * 3. Ambiguous and missing-location requests (location confidence = 0.0, needs_clarification = true)
 * 4. Multimodal photo agreement vs. conflict cases (observable tags only, conflict detection)
 * 5. Unknown-category phrase (mapped to UNKNOWN, never invented)
 * 6. High-demand/poor-infrastructure hero case vs. high-demand/strong-investment comparison case
 */
export const EVALUATION_TEST_SET: EvaluationTestCase[] = [
  // --- 1. Paraphrase Family: Drinking water shortage / pipeline rupture ---
  {
    id: 'EVAL-PARA-01',
    category: 'PARAPHRASE',
    description: 'Hero Water Pipeline Rupture (Direct phrasing, English)',
    requestInput: {
      raw_text: 'Drinking water pipeline ruptured on 80ft Road Whitefield, no water supply for 4 days for 500 houses.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedNeedsClarification: false,
      assertionDescription: 'Accurately classifies direct pipeline rupture in English',
    },
  },
  {
    id: 'EVAL-PARA-02',
    category: 'PARAPHRASE',
    description: 'Hero Water Pipeline Rupture (Passive phrasing, English)',
    requestInput: {
      raw_text: 'Water has stopped coming from the municipal tap because the main underground pipe broke and water is leaking everywhere across the road.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedNeedsClarification: false,
      assertionDescription: 'Accurately classifies passive water pipeline breakage in English',
    },
  },
  {
    id: 'EVAL-PARA-03',
    category: 'PARAPHRASE',
    description: 'Water Pipeline Rupture (Kannada phrasing)',
    requestInput: {
      raw_text: 'ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಮುಖ್ಯ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'kn',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedNeedsClarification: false,
      assertionDescription: 'Accurately classifies Kannada pipeline failure without transliteration error',
    },
  },
  {
    id: 'EVAL-PARA-04',
    category: 'PARAPHRASE',
    description: 'Water Pipeline Rupture (Hindi phrasing)',
    requestInput: {
      raw_text: 'हमारे इलाके में पीने के पानी की मुख्य पाइपलाइन फूट गई है और सड़क पर सारा पानी बह रहा है।',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'hi',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedNeedsClarification: false,
      assertionDescription: 'Accurately classifies Hindi pipeline rupture without transliteration error',
    },
  },

  // --- 2. Geography Independence (Same issue across different geographies) ---
  {
    id: 'EVAL-GEO-01',
    category: 'GEOGRAPHY_INDEPENDENCE',
    description: 'Pothole issue in Whitefield (GEO-BLR-001)',
    requestInput: {
      raw_text: 'Massive hazardous pothole on inner road causing scooter accidents.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'ROADS',
      expectedIssueType: 'POTHOLE',
      expectedNeedsClarification: false,
      assertionDescription: 'Classifies ROADS/POTHOLE for Ward 84 Whitefield independently',
    },
  },
  {
    id: 'EVAL-GEO-02',
    category: 'GEOGRAPHY_INDEPENDENCE',
    description: 'Identical pothole issue in Bellandur (GEO-BLR-002)',
    requestInput: {
      raw_text: 'Massive hazardous pothole on inner road causing scooter accidents.',
      geo_id: 'GEO-BLR-002',
      latitude: 12.9304,
      longitude: 77.6784,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'ROADS',
      expectedIssueType: 'POTHOLE',
      expectedNeedsClarification: false,
      assertionDescription: 'Classifies ROADS/POTHOLE for Ward 150 Bellandur independently without premature clustering',
    },
  },

  // --- 3. Ambiguous and Missing-Location Requests ---
  {
    id: 'EVAL-AMBIG-01',
    category: 'AMBIGUOUS_OR_MISSING_LOCATION',
    description: 'Missing location: valid water shortage text but geo_id, lat, long are null',
    requestInput: {
      raw_text: 'Water supply has stopped in our street completely for 3 days and no municipal tankers have arrived.',
      geo_id: null,
      latitude: null,
      longitude: null,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'SUPPLY_INTERRUPTION',
      expectedNeedsClarification: true,
      assertionDescription: 'Flags needs_clarification=true and location confidence=0.0 when location coordinates are missing',
    },
  },
  {
    id: 'EVAL-AMBIG-02',
    category: 'AMBIGUOUS_OR_MISSING_LOCATION',
    description: 'Vague text narrative: ambiguous complaint without civic specificity',
    requestInput: {
      raw_text: 'Everything is bad in this neighborhood, please fix the problem immediately.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'UNKNOWN',
      expectedIssueType: 'UNKNOWN',
      expectedNeedsClarification: true,
      assertionDescription: 'Flags UNKNOWN category and needs_clarification=true for vague complaint',
    },
  },

  // --- 4. Multimodal Photo Agreement and Conflict Cases ---
  {
    id: 'EVAL-PHOTO-01',
    category: 'PHOTO_AGREEMENT_AND_CONFLICT',
    description: 'Photo Agreement: Water pipeline leak photo matching water narrative',
    requestInput: {
      raw_text: 'Water pipe leak flooding pavement.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    photoInput: {
      request_id: 'REQ-EVAL-PHOTO-01',
      storage_uri: 'gs://civicpulse-bucket/photos/pipeline_water_leak.jpg',
      request_context: {
        raw_text: 'Water pipe leak flooding pavement.',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
      },
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedConflictFlag: false,
      assertionDescription: 'Contract B identifies observable tags and confirms NO conflict with water narrative',
    },
  },
  {
    id: 'EVAL-PHOTO-02',
    category: 'PHOTO_AGREEMENT_AND_CONFLICT',
    description: 'Photo Conflict: Clean dry indoor room photo submitted with severe flood/water rupture claim',
    requestInput: {
      raw_text: 'Severe water pipeline rupture with massive street flooding.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    photoInput: {
      request_id: 'REQ-EVAL-PHOTO-02',
      storage_uri: 'gs://civicpulse-bucket/photos/conflict_clean_room.jpg',
      request_context: {
        raw_text: 'Severe water pipeline rupture with massive street flooding.',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
      },
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedConflictFlag: true,
      assertionDescription: 'Contract B flags conflict_flag=true when photo contradicts narrative',
    },
  },

  // --- 5. Unknown Taxonomy Phrase Handling ---
  {
    id: 'EVAL-TAX-01',
    category: 'UNKNOWN_TAXONOMY',
    description: 'Unknown category phrase: alien invasion report outside municipal remit',
    requestInput: {
      raw_text: 'There are extraterrestrial spaceships landing in the playground taking over satellite TV signals.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'UNKNOWN',
      expectedIssueType: 'UNKNOWN',
      expectedNeedsClarification: true,
      assertionDescription: 'Maps to UNKNOWN / needs_clarification and NEVER invents a non-existent taxonomy value',
    },
  },

  // --- 6. Infrastructure Comparison Cases (Hero vs. Comparison) ---
  {
    id: 'EVAL-COMP-01',
    category: 'INFRASTRUCTURE_COMPARISON',
    description: 'Hero Case: High-demand, poor-infrastructure ward (Whitefield Ward 84)',
    requestInput: {
      raw_text: 'Underground water pipeline burst on 80ft Road, leaving 500 households completely without drinking water for 4 days.',
      geo_id: 'GEO-BLR-001',
      latitude: 12.9698,
      longitude: 77.7499,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'PIPELINE_FAILURE',
      expectedNeedsClarification: false,
      assertionDescription: 'Classifies high-demand water pipeline failure accurately',
    },
  },
  {
    id: 'EVAL-COMP-02',
    category: 'INFRASTRUCTURE_COMPARISON',
    description: 'Comparison Case: Similar issue in high-investment ward (Ward 150)',
    requestInput: {
      raw_text: 'Minor drinking water supply pressure drop in apartment complex pipeline branch.',
      geo_id: 'GEO-BLR-002',
      latitude: 12.9304,
      longitude: 77.6784,
      language: 'en',
    },
    assertions: {
      expectedCategory: 'WATER',
      expectedIssueType: 'DRINKING_WATER_SHORTAGE',
      expectedNeedsClarification: false,
      assertionDescription: 'Classifies comparison water issue without premature deterministic prioritization',
    },
  },
];

/**
 * Runner function for the complete evaluation suite
 */
export async function runFullAIEvaluation(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: EvaluationResult[];
}> {
  const results: EvaluationResult[] = [];

  for (const tc of EVALUATION_TEST_SET) {
    let passed = true;
    const notes: string[] = [];

    // 1. Contract A Understanding
    const aiResult = await understandCitizenRequest(tc.requestInput);

    // Assert Category
    if (aiResult.category_id !== tc.assertions.expectedCategory) {
      passed = false;
      notes.push(`Category mismatch: got ${aiResult.category_id}, expected ${tc.assertions.expectedCategory}`);
    }

    // Assert Issue Type
    if (aiResult.issue_type_id !== tc.assertions.expectedIssueType) {
      passed = false;
      notes.push(`Issue type mismatch: got ${aiResult.issue_type_id}, expected ${tc.assertions.expectedIssueType}`);
    }

    // Assert Needs Clarification if specified
    if (tc.assertions.expectedNeedsClarification !== undefined) {
      if (aiResult.needs_clarification !== tc.assertions.expectedNeedsClarification) {
        passed = false;
        notes.push(`Needs clarification mismatch: got ${aiResult.needs_clarification}, expected ${tc.assertions.expectedNeedsClarification}`);
      }
    }

    // Assert Missing Location confidence if applicable
    if (tc.requestInput.geo_id === null && aiResult.ai_confidence.location !== 0.0) {
      passed = false;
      notes.push(`Location confidence for missing location must be 0.0, got ${aiResult.ai_confidence.location}`);
    }

    // 2. Contract B Multimodal Photo Analysis if test has photoInput
    let conflictFlag: boolean | undefined = undefined;
    if (tc.photoInput) {
      const photoResult = await analyzePhotoEvidence(tc.photoInput);
      conflictFlag = photoResult.conflict_flag;

      if (tc.assertions.expectedConflictFlag !== undefined) {
        if (photoResult.conflict_flag !== tc.assertions.expectedConflictFlag) {
          passed = false;
          notes.push(`Photo conflict flag mismatch: got ${photoResult.conflict_flag}, expected ${tc.assertions.expectedConflictFlag}`);
        }
      }

      // Check observation safety: observable tags only
      if (!photoResult.observable_tags || photoResult.observable_tags.length === 0) {
        passed = false;
        notes.push('Missing observable_tags in photo analysis result');
      }
    }

    // 3. Voice Transcription if test has voiceInput
    let voiceSuccess: boolean | undefined = undefined;
    if (tc.voiceInput) {
      const voiceResult = await transcribeVoiceAudio(tc.voiceInput);
      voiceSuccess = voiceResult.success;
      if (tc.assertions.expectedVoiceSuccess !== undefined) {
        if (voiceResult.success !== tc.assertions.expectedVoiceSuccess) {
          passed = false;
          notes.push(`Voice transcription success mismatch: got ${voiceResult.success}, expected ${tc.assertions.expectedVoiceSuccess}`);
        }
      }
    }

    results.push({
      testId: tc.id,
      category: tc.category,
      description: tc.description,
      passed,
      actualCategory: aiResult.category_id,
      actualIssueType: aiResult.issue_type_id,
      needsClarification: aiResult.needs_clarification,
      conflictFlag,
      voiceSuccess,
      confidence: aiResult.ai_confidence,
      notes: notes.length > 0 ? notes.join('; ') : 'All assertions passed successfully.',
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
