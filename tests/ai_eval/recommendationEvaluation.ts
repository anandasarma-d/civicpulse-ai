import assert from 'assert';
import {
  assembleEvidence,
  DECISION_SUPPORT_CAVEAT,
  generateDeterministicRecommendation,
  generateRecommendationForGap,
  loadGapRecord,
  loadRecommendationSystemInstruction,
} from '../../backend/services/recommendations/recommendationService';
import { GapAssessmentRecord } from '../../backend/models/GapAssessmentTypes';

const INVENTED_PATTERN = /₹|\$\d|USD|INR|lakh|crore|BWSSB|BBMP|tanker|42,000/i;

function thinGapStub(): GapAssessmentRecord {
  return {
    gap_id: 'GAP-0099',
    geo_id: 'GEO-LOC-UNKNOWN',
    category_id: 'WATER',
    cluster_id: 'CLU-9999',
    title: 'Sparse evidence gap for review_required evaluation',
    factors: {
      raw: {
        citizen_demand: 1,
        population_affected: 0,
        infrastructure_gap: 0,
        urgency_severity: 0,
        investment_gap: 100,
        equity_need: 0,
      },
      normalized: {
        citizen_demand: 0.05,
        population_affected: 0,
        infrastructure_gap: 0,
        urgency_severity: 0,
        investment_gap: 1,
        equity_need: 0,
      },
    },
    priority: {
      priority_score: 6.5,
      priority_band: 'LOW',
      rank: 99,
      calculation_version: 'v1.0.0-deterministic',
      formula: 'PriorityScore = 0.30×Demand + 0.20×Population + 0.20×InfrastructureGap + 0.15×UrgencySeverity + 0.10×InvestmentGap + 0.05×EquityNeed',
      weights: {
        citizen_demand: 0.3,
        population_affected: 0.2,
        infrastructure_gap: 0.2,
        urgency_severity: 0.15,
        investment_gap: 0.1,
        equity_need: 0.05,
      },
    },
    explanation: {
      headline: 'Insufficient evidence',
      why_high_or_low: 'LOW because supplied evidence is sparse',
      factor_explanations: [],
      evidence_refs: ['GAP-0099'],
      uncertainties: ['Cluster, infrastructure, and request records are missing.'],
      decision_support_note: 'Final prioritization remains with authorized officials.',
      status: 'AVAILABLE',
      is_live_ai: false,
      execution_source: 'DETERMINISTIC_FALLBACK',
      prompt_version: 'priority_explanation_v1',
      generated_at: '2026-09-24T00:00:00Z',
    },
    calculated_at: '2026-09-24T00:00:00Z',
    calculation_version: 'v1.0.0-deterministic',
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
    recommendation_id: null,
  };
}

function joinedNarrative(rec: { intervention: string; why_here: string; why_now: string; expected_benefit: string; caveats: string[] }): string {
  return [rec.intervention, rec.why_here, rec.why_now, rec.expected_benefit, ...rec.caveats].join(' ');
}

async function runRecommendationEvaluation() {
  console.log('=== Starting CivicPulse AI Recommendation Evaluation (Doc 15 §13) ===\n');

  const rows: Array<{ id: string; result: string; note: string }> = [];

  console.log('Row 1: Doc 13 §10 prompt is loaded verbatim with Common AI Rules prepended...');
  const system = loadRecommendationSystemInstruction();
  assert.ok(system.startsWith('You are an AI component inside CivicPulse AI'), 'Common AI Rules must be prepended');
  assert.ok(system.includes('You are performing RECOMMENDATION_GENERATION.'));
  assert.ok(system.includes('Never calculate or modify CivicPulse\'s deterministic priority score.'));
  assert.ok(system.includes('Do not invent funding, project names, costs, timelines, agencies'));
  assert.ok(system.includes('Do not present the recommendation as an autonomous government decision.'));
  assert.ok(!system.includes('REC-0042'), 'API envelope example must not be sent to the model');
  rows.push({ id: '1', result: 'PASS', note: 'recommendation_v1 prepends Common AI Rules; REC-0042 envelope excluded' });
  console.log('  ✔ Prompt contract\n');

  console.log('Row 2: Hero GAP-0001 / REC-0001 is grounded and not an autonomous decision...');
  const heroGap = await loadGapRecord('GAP-0001');
  assert.ok(heroGap, 'Hero gap must load');
  const hero = await generateRecommendationForGap(heroGap!, 'REC-0001');
  const heroText = joinedNarrative(hero.recommendation);
  assert.strictEqual(hero.recommendation_id, 'REC-0001');
  assert.strictEqual(hero.gap_id, 'GAP-0001');
  assert.ok(!INVENTED_PATTERN.test(heroText), 'Must not invent funding/project/cost/timeline/agency');
  assert.ok(/advisory|decision-support|authorized official|not an autonomous/i.test(heroText));
  assert.ok(hero.recommendation.evidence_refs.includes('GAP-0001'));
  assert.ok(hero.recommendation.evidence_refs.includes('CLU-0001'));
  assert.ok(
    hero.recommendation.caveats.includes(DECISION_SUPPORT_CAVEAT),
    'Hero caveats must include the server-side decision-support disclaimer'
  );
  rows.push({ id: '2', result: 'PASS', note: 'REC-0001 grounded on GAP-0001 / CLU-0001; advisory framing' });
  console.log('  ✔ Hero grounded\n');

  console.log('Row 3: score_breakdown is service-computed from locked hero factors...');
  assert.strictEqual(hero.score_breakdown.source_gap_id, 'GAP-0001');
  assert.strictEqual(hero.score_breakdown.citizen_demand.weighted_contribution, 28.8);
  assert.strictEqual(hero.score_breakdown.equity_need.weighted_contribution, 3.85);
  assert.strictEqual(heroGap!.priority.priority_score, 92.1, 'Recommendation path must not alter 92.1');
  rows.push({ id: '3', result: 'PASS', note: 'score_breakdown reused from GAP-0001; score remains 92.1' });
  console.log('  ✔ score_breakdown\n');

  console.log('Row 4: UNKNOWN investment is caveated, not invented...');
  assert.ok(/UNKNOWN|no .*project|not found|no active or planned/i.test(heroText));
  assert.ok(!/INV-BLR-001|State Municipal Development Fund/i.test(heroText));
  rows.push({ id: '4', result: 'PASS', note: 'Hero caveats UNKNOWN investment; does not invent a project' });
  console.log('  ✔ UNKNOWN investment\n');

  console.log('Row 5: Evidence-thin REC-0099 requires review...');
  const thinGap = thinGapStub();
  const thin = await generateRecommendationForGap(thinGap, 'REC-0099');
  const thinText = joinedNarrative(thin.recommendation);
  assert.strictEqual(thin.recommendation_id, 'REC-0099');
  assert.strictEqual(thin.review_required, true, 'Thin evidence must set review_required');
  assert.ok(/review|insufficient|missing|UNKNOWN/i.test(thinText));
  assert.ok(!INVENTED_PATTERN.test(thinText));
  assert.ok(!/INV-BLR-001|HSR 27th Main/i.test(thinText), 'Thin case must not borrow hero/HSR project facts');
  rows.push({ id: '5', result: 'PASS', note: 'REC-0099 review_required=true; no invented investment' });
  console.log('  ✔ Thin REC-0099\n');

  console.log('Row 6: GAP-0002 may cite the supplied ACTIVE project only...');
  const gap2 = await loadGapRecord('GAP-0002');
  assert.ok(gap2);
  const rec2 = await generateRecommendationForGap(gap2!, 'REC-0002');
  const rec2Text = joinedNarrative(rec2.recommendation);
  assert.ok(/INV-BLR-001|HSR 27th Main/i.test(rec2Text), 'May cite the registered project already on file');
  assert.ok(!/₹|lakh|crore|12500000|12,500,000/i.test(rec2Text), 'Must not invent or echo cost figures');
  rows.push({ id: '6', result: 'PASS', note: 'REC-0002 cites supplied INV-BLR-001 without inventing cost' });
  console.log('  ✔ Supplied investment citation\n');

  console.log('Row 7: evidence_refs are restricted to supplied IDs...');
  const evidence = await assembleEvidence(heroGap!);
  for (const ref of hero.recommendation.evidence_refs) {
    assert.ok(evidence.allowed_evidence_refs.includes(ref), `Unexpected evidence_ref ${ref}`);
  }
  const fallback = generateDeterministicRecommendation(evidence);
  assert.ok(fallback.evidence_refs.every((ref) => evidence.allowed_evidence_refs.includes(ref)));
  rows.push({ id: '7', result: 'PASS', note: 'evidence_refs filtered to assembled IDs only' });
  console.log('  ✔ evidence_refs\n');

  console.log('Row 8: Schema completeness and review_required boolean...');
  assert.strictEqual(hero.prompt_version, 'recommendation_v1');
  assert.ok(Array.isArray(hero.recommendation.caveats));
  assert.ok(typeof hero.review_required === 'boolean');
  assert.ok(typeof thin.review_required === 'boolean');
  rows.push({ id: '8', result: 'PASS', note: 'Doc 13 §10 fields present; review_required is boolean' });
  console.log('  ✔ Schema\n');

  console.log('Doc 15 §13 evaluation table:');
  console.log('| # | Result | Note |');
  console.log('|---|---|---|');
  for (const row of rows) {
    console.log(`| ${row.id} | ${row.result} | ${row.note} |`);
  }

  console.log('\nAll Doc 15 §13 Recommendation evaluation scenarios PASSED successfully!');
}

runRecommendationEvaluation().catch((err) => {
  console.error('Recommendation evaluation failed:', err);
  process.exit(1);
});
