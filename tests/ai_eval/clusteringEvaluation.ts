import assert from 'assert';
import { CitizenRequest } from '../../backend/models/CitizenRequest';
import { clusterRequests } from '../../backend/services/clustering/clusteringService';

export interface ClusteringEvalCase {
  id: string;
  type: 'POSITIVE_PAIR' | 'CROSS_LINGUAL_POSITIVE' | 'GEOGRAPHY_DECOY_NEGATIVE' | 'CROSS_TAXONOMY_NEGATIVE' | 'AMBIGUOUS_UNCLUSTERED';
  description: string;
  requests: CitizenRequest[];
  expectedMerge: boolean;
}

export const CLUSTERING_EVAL_CASES: ClusteringEvalCase[] = [
  // 1. Positive Pair: Paraphrase family (English) in same ward
  {
    id: 'CLU-EVAL-01',
    type: 'POSITIVE_PAIR',
    description: 'Direct vs Passive English phrasing of pipeline rupture in Ward 150 Bellandur',
    expectedMerge: true,
    requests: [
      {
        request_id: 'EVAL-REQ-01A',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        raw_text: 'Drinking water pipeline ruptured on 80ft Road, no water supply for 4 days for 500 houses.',
        status: 'PROCESSED',
        created_at: '2024-03-01T08:00:00Z',
      } as any,
      {
        request_id: 'EVAL-REQ-01B',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        raw_text: 'Water has stopped coming from municipal tap because underground main pipe burst and water is flooding road.',
        status: 'PROCESSED',
        created_at: '2024-03-01T09:00:00Z',
      } as any,
    ],
  },

  // 2. Cross-Lingual Positive: English, Kannada, Hindi in same ward
  {
    id: 'CLU-EVAL-02',
    type: 'CROSS_LINGUAL_POSITIVE',
    description: 'Multilingual reports (English, Kannada, Hindi) of drinking water crisis in same ward',
    expectedMerge: true,
    requests: [
      {
        request_id: 'EVAL-REQ-02A',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        language: 'en',
        raw_text: 'Municipal drinking water pipeline burst in Bellandur, clean water wasting on road.',
        status: 'PROCESSED',
        created_at: '2024-03-01T10:00:00Z',
      } as any,
      {
        request_id: 'EVAL-REQ-02B',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        language: 'kn',
        raw_text: 'ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಮುಖ್ಯ ಪೈಪ್‌ಲೈನ್ ಒಡೆದು ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ.',
        status: 'PROCESSED',
        created_at: '2024-03-01T10:30:00Z',
      } as any,
      {
        request_id: 'EVAL-REQ-02C',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        language: 'hi',
        raw_text: 'हमारे इलाके में पीने के पानी की मुख्य पाइपलाइन फूट गई है और सड़क पर सारा पानी बह रहा है।',
        status: 'PROCESSED',
        created_at: '2024-03-01T11:00:00Z',
      } as any,
    ],
  },

  // 3. Negative Pair: Decoy case with identical wording across distant districts
  {
    id: 'CLU-EVAL-03',
    type: 'GEOGRAPHY_DECOY_NEGATIVE',
    description: 'Identical text complaint in Bellandur (BLR) vs distant Mysuru (MYS) district',
    expectedMerge: false,
    requests: [
      {
        request_id: 'EVAL-REQ-03-HERO',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01', // Bengaluru
        raw_text: 'Drinking water pipeline ruptured on main road, no water supply for 4 days for 500 houses.',
        status: 'PROCESSED',
        created_at: '2024-03-01T08:00:00Z',
      } as any,
      {
        request_id: 'EVAL-REQ-03-DECOY',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-MYS-01', // Mysuru (distant district)
        raw_text: 'Drinking water pipeline ruptured on main road, no water supply for 4 days for 500 houses.',
        status: 'PROCESSED',
        created_at: '2024-03-01T08:05:00Z',
      } as any,
    ],
  },

  // 4. Negative Pair: Cross-Taxonomy reports in same locality
  {
    id: 'CLU-EVAL-04',
    type: 'CROSS_TAXONOMY_NEGATIVE',
    description: 'Roads pothole vs Water pipeline failure in the same ward (GEO-LOC-BLR-01)',
    expectedMerge: false,
    requests: [
      {
        request_id: 'EVAL-REQ-04-WATER',
        category_id: 'WATER',
        issue_type_id: 'PIPELINE_FAILURE',
        geo_id: 'GEO-LOC-BLR-01',
        raw_text: 'Massive water leak from burst municipal pipeline flooding 80ft road.',
        status: 'PROCESSED',
        created_at: '2024-03-01T08:00:00Z',
      } as any,
      {
        request_id: 'EVAL-REQ-04-ROAD',
        category_id: 'ROADS',
        issue_type_id: 'POTHOLE',
        geo_id: 'GEO-LOC-BLR-01',
        raw_text: 'Massive hazardous pothole on inner road causing scooter accidents.',
        status: 'PROCESSED',
        created_at: '2024-03-01T08:15:00Z',
      } as any,
    ],
  },

  // 5. Ambiguous / Missing Location Outlier
  {
    id: 'CLU-EVAL-05',
    type: 'AMBIGUOUS_UNCLUSTERED',
    description: 'Vague complaint missing geo_id remains unclustered candidate',
    expectedMerge: false,
    requests: [
      {
        request_id: 'EVAL-REQ-05-VAGUE',
        category_id: 'UNKNOWN',
        issue_type_id: 'UNKNOWN',
        geo_id: null,
        raw_text: 'Everything is bad in this neighborhood, please fix the problem immediately.',
        status: 'PENDING_TRIAGE',
        created_at: '2024-03-01T08:00:00Z',
      } as any,
    ],
  },
];

export async function runClusteringEvaluation() {
  console.log('=== Running CivicPulse AI Clustering Evaluation Suite (Doc 15 §10) ===\n');

  let positiveTestsTotal = 0;
  let positiveTestsPassed = 0;
  let negativeTestsTotal = 0;
  let negativeTestsPassed = 0; // Passed means NO FALSE MERGE
  let falseMergeCount = 0;
  let unclusteredCorrectCount = 0;
  let unclusteredTotal = 0;

  for (const tc of CLUSTERING_EVAL_CASES) {
    const res = await clusterRequests(tc.requests, { similarityThreshold: 0.75 });

    if (tc.type === 'POSITIVE_PAIR' || tc.type === 'CROSS_LINGUAL_POSITIVE') {
      positiveTestsTotal++;
      // Expected to merge into a single cluster
      const firstId = tc.requests[0].request_id;
      const clusterWithFirst = res.clusters.find((c) =>
        c.requests.some((r) => r.request_id === firstId)
      );
      const allMerged =
        clusterWithFirst &&
        tc.requests.every((req) =>
          clusterWithFirst.requests.some((r) => r.request_id === req.request_id)
        );

      if (allMerged) {
        positiveTestsPassed++;
        console.log(`[PASS] ${tc.id}: ${tc.description}`);
      } else {
        console.error(`[FAIL] ${tc.id}: Failed to merge related positive requests into one cluster`);
      }
    } else if (tc.type === 'GEOGRAPHY_DECOY_NEGATIVE' || tc.type === 'CROSS_TAXONOMY_NEGATIVE') {
      negativeTestsTotal++;
      // Expected NOT to merge into the same cluster
      const reqAId = tc.requests[0].request_id;
      const reqBId = tc.requests[1].request_id;

      const mergedTogether = res.clusters.some(
        (c) =>
          c.requests.some((r) => r.request_id === reqAId) &&
          c.requests.some((r) => r.request_id === reqBId)
      );

      if (!mergedTogether) {
        negativeTestsPassed++;
        console.log(`[PASS] ${tc.id}: ${tc.description} (Guardrails prevented false merge)`);
      } else {
        falseMergeCount++;
        console.error(`[FAIL] ${tc.id}: False merge occurred! Guardrail failed to isolate requests.`);
      }
    } else if (tc.type === 'AMBIGUOUS_UNCLUSTERED') {
      unclusteredTotal++;
      const reqId = tc.requests[0].request_id;
      const isUnclustered = res.unclusteredRequests.some((r) => r.request_id === reqId);
      if (isUnclustered) {
        unclusteredCorrectCount++;
        console.log(`[PASS] ${tc.id}: ${tc.description} (Correctly left unclustered)`);
      } else {
        console.error(`[FAIL] ${tc.id}: Ambiguous request incorrectly clustered.`);
      }
    }
  }

  const positivePrecision = positiveTestsTotal > 0 ? (positiveTestsPassed / positiveTestsTotal) * 100 : 100;
  const falseMergeRate = negativeTestsTotal > 0 ? (falseMergeCount / negativeTestsTotal) * 100 : 0;
  const unclusteredAccuracy = unclusteredTotal > 0 ? (unclusteredCorrectCount / unclusteredTotal) * 100 : 100;

  console.log('\n================ Clustering Evaluation Summary ================');
  console.log(`Positive Grouping Recall / Precision : ${positivePrecision.toFixed(1)}% (${positiveTestsPassed}/${positiveTestsTotal})`);
  console.log(`False-Merge Rate on Negative Pairs    : ${falseMergeRate.toFixed(1)}% (Must be 0.0%)`);
  console.log(`Unclustered Handling Accuracy         : ${unclusteredAccuracy.toFixed(1)}% (${unclusteredCorrectCount}/${unclusteredTotal})`);
  console.log('=================================================================\n');

  assert.strictEqual(falseMergeRate, 0.0, 'False-merge rate MUST be 0.0%');
  assert.strictEqual(positivePrecision, 100.0, 'Positive pair grouping must pass 100%');

  return {
    positivePrecision,
    falseMergeRate,
    unclusteredAccuracy,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runClusteringEvaluation().catch((err) => {
    console.error('Clustering evaluation failed:', err);
    process.exit(1);
  });
}
