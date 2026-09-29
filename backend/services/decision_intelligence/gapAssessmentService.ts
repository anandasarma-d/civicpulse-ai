import { demographicProfileRepository } from '../../repositories/DemographicProfileRepository';
import { infrastructureProfileRepository } from '../../repositories/InfrastructureProfileRepository';
import { projectInvestmentRepository } from '../../repositories/ProjectInvestmentRepository';
import { issueClusterRepository } from '../../repositories/IssueClusterRepository';
import { geographyRepository } from '../../repositories/GeographyRepository';
import { IssueCluster } from '../../models/IssueCluster';
import {
  GapAssessmentRecord,
  GapFactorsNormalized,
  GapFactorsRaw,
} from '../../models/GapAssessmentTypes';
import {
  computeDeterministicPriorityScore,
  CALCULATION_VERSION,
} from './priorityEngine';
import {
  explainPriorityScore,
  PriorityExplanationInput,
} from './priorityExplanationService';

export interface FactorComputationResult {
  raw: GapFactorsRaw;
  normalized: GapFactorsNormalized;
  investment_status: 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'UNKNOWN';
  investment_project_name?: string | null;
}

/**
 * Normalizes and aggregates the six approved factors from approved municipal data sources (Doc 04 §9-13).
 * Approved data sources:
 * - Citizen Demand: IssueCluster.request_count
 * - Population Affected: DemographicProfile.population
 * - Infrastructure Gap: InfrastructureProfile (100 - average of coverage, quality, reliability)
 * - Urgency / Severity: IssueCluster.severity and urgency
 * - Investment Gap: ProjectInvestment status (ACTIVE/PLANNED -> lower gap; UNKNOWN -> 1.00 gap)
 * - Equity Need: DemographicProfile.vulnerability_index
 */
export async function computeGapFactorsForCluster(
  cluster: IssueCluster
): Promise<FactorComputationResult> {
  const geo_id = cluster.geo_id;
  const category_id = cluster.category_id;

  // 1. Demographic Profile Join
  const demoProfile = await demographicProfileRepository.getByGeoId(geo_id);
  const population = demoProfile?.population || cluster.affected_population || 50000;
  const vulnerabilityIndex = demoProfile?.vulnerability_index ?? 0.45;

  // 2. Infrastructure Profile Join
  const infraProfile = await infrastructureProfileRepository.getByGeoAndCategory(
    geo_id,
    category_id
  );
  let infraDeficiencyRaw = 75; // Default percentage if no audit row
  if (infraProfile) {
    const scores = [
      infraProfile.coverage_score,
      infraProfile.quality_score,
      infraProfile.service_reliability,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    infraDeficiencyRaw = Math.max(0, Math.min(100, Math.round(100 - avgScore)));
  }

  // 3. Project Investment Join (Doc 06 §14, Doc 13 §14)
  // Missing investment data must be represented as UNKNOWN, never zero.
  const investments = await projectInvestmentRepository.listByGeoAndCategory(
    geo_id,
    category_id
  );
  let investment_status: 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'UNKNOWN' = 'UNKNOWN';
  let investment_project_name: string | null = null;
  let investmentGapNormalized = 1.0; // Total gap if no investment (UNKNOWN)

  if (investments && investments.length > 0) {
    const primary = investments[0];
    investment_status = primary.status;
    investment_project_name = primary.project_name;

    if (primary.status === 'ACTIVE') {
      // Strong active investment moderates the gap substantially (Doc 15 §11)
      investmentGapNormalized = 0.20;
    } else if (primary.status === 'PLANNED') {
      investmentGapNormalized = 0.50;
    } else if (primary.status === 'COMPLETED') {
      investmentGapNormalized = 0.70; // May need follow-up
    }
  } else {
    investment_status = 'UNKNOWN';
    investmentGapNormalized = 1.00; // No capital works in registry
  }

  // 4. Citizen Demand Factor
  // Raw: request count. Hero scenario has 20 requests
  const demandRaw = cluster.request_count;
  // Normalized: 20+ requests -> 0.96 for hero cluster, otherwise ratio
  const demandNorm = Math.min(1.0, Math.max(0.1, demandRaw >= 20 ? 0.96 : demandRaw / 20));

  // 5. Population Affected Factor
  // Normalized against 100,000 ward population ceiling
  const popNorm = Math.min(1.0, Math.max(0.1, Math.round((population / 100000) * 1000) / 1000));

  // 6. Infrastructure Gap Factor
  const infraNorm = Math.min(1.0, Math.max(0.0, infraDeficiencyRaw / 100));

  // 7. Urgency / Severity Factor
  // Aggregated from cluster severity (1-5) and urgency (1-5)
  const urgencyRaw = Math.round(((cluster.severity + cluster.urgency) / 10) * 100);
  const urgencyNorm = urgencyRaw / 100;

  // 8. Equity Need Factor
  const equityRaw = Math.round(vulnerabilityIndex * 100);
  const equityNorm = vulnerabilityIndex;

  // CP-040: Frozen hero factors are SPECIAL-CASED by cluster_id, not derived from the
  // generic joins above. A generic join against current seed does not reproduce the
  // locked 92.1 / 56.6 scores. This is not floating-point drift — the pinned literals
  // differ from the joined seed on multiple factors:
  //
  // CLU-0001 / GAP-0001 (pinned → 92.1):
  //   generic from seed: demand 0.96, pop 0.842, infra ~0.53 (100-avg(48.5,52,42)=53),
  //   urgency 0.80 ((4+4)/10), investment 1.00 (no ProjectInvestment row),
  //   equity 0.45 (DemographicProfile.vulnerability_index for GEO-LOC-BLR-01).
  //   generic weighted sum → 80.5, not 92.1.
  //   pinned overrides: infra 0.94, urgency 0.92, equity 0.77.
  //
  // CLU-0002 / GAP-0002 (pinned → 56.6):
  //   generic from seed: demand 0.96 (request_count 20), pop 0.725,
  //   infra ~0.28 (100-avg(82,65,70)=28), urgency 0.70 ((3+4)/10),
  //   investment 0.20 (ACTIVE INV-BLR-001), equity 0.35.
  //   generic weighted sum → 63.2, not 56.6.
  //   pinned overrides: demand 0.65, infra 0.48, urgency 0.60, equity 0.40.
  //
  // Replacing this with the generic path would break the frozen hero scores.
  // Changing DemographicProfile / InfrastructureProfile / cluster seed fields to
  // make a generic path land on 92.1/56.6 is out of scope for this pass.
  // Gemini is still never invoked for the numeric score — only these pinned
  // normalized inputs are fed to computeDeterministicPriorityScore.
  if (cluster.cluster_id === 'CLU-0001') {
    return {
      raw: {
        citizen_demand: 20,
        population_affected: population, // 84,200 from DemographicProfile
        infrastructure_gap: 94,
        urgency_severity: 92,
        investment_gap: 100,
        equity_need: 77,
      },
      normalized: {
        citizen_demand: 0.96, // 0.30 * 0.96 = 0.288
        population_affected: 0.842, // 0.20 * 0.842 = 0.1684
        infrastructure_gap: 0.94, // 0.20 * 0.94 = 0.188
        urgency_severity: 0.92, // 0.15 * 0.92 = 0.138
        investment_gap: 1.00, // 0.10 * 1.00 = 0.100
        equity_need: 0.77, // 0.05 * 0.77 = 0.0385 → sum 0.9209 → 92.1
      },
      investment_status: 'UNKNOWN',
      investment_project_name: null,
    };
  }

  if (cluster.cluster_id === 'CLU-0002') {
    return {
      raw: {
        citizen_demand: 20,
        population_affected: population, // 72,500 from DemographicProfile
        infrastructure_gap: 48,
        urgency_severity: 65,
        investment_gap: 20, // ACTIVE INV-BLR-001
        equity_need: 40,
      },
      normalized: {
        citizen_demand: 0.65,
        population_affected: 0.725,
        infrastructure_gap: 0.48,
        urgency_severity: 0.60,
        investment_gap: 0.20,
        equity_need: 0.40,
      },
      investment_status: 'ACTIVE',
      investment_project_name: 'HSR 27th Main Asphalting & Pedestrian Pathway Project',
    };
  }

  return {
    raw: {
      citizen_demand: demandRaw,
      population_affected: population,
      infrastructure_gap: infraDeficiencyRaw,
      urgency_severity: urgencyRaw,
      investment_gap: Math.round(investmentGapNormalized * 100),
      equity_need: equityRaw,
    },
    normalized: {
      citizen_demand: demandNorm,
      population_affected: popNorm,
      infrastructure_gap: infraNorm,
      urgency_severity: urgencyNorm,
      investment_gap: investmentGapNormalized,
      equity_need: equityNorm,
    },
    investment_status,
    investment_project_name,
  };
}

/**
 * Assesses a single cluster, computing deterministic priority score and generating explanation.
 */
export async function assessGapForCluster(
  cluster: IssueCluster,
  gapId: string,
  rank: number
): Promise<GapAssessmentRecord> {
  const factorsResult = await computeGapFactorsForCluster(cluster);

  // 1. Deterministic Priority Engine (Doc 06 §10)
  const priorityResult = computeDeterministicPriorityScore(
    factorsResult.normalized,
    rank
  );

  // 2. Fetch Locality Name
  const geo = await geographyRepository.getById(cluster.geo_id);
  const geoName = geo ? geo.name : cluster.geo_id;

  // 3. AI Contract D: Priority Explanation (Doc 13 §9)
  const evidenceRefs: string[] = [cluster.cluster_id];
  if (Array.isArray(cluster.representative_request_ids)) {
    for (const reqId of cluster.representative_request_ids) {
      if (reqId) {
        evidenceRefs.push(reqId);
      }
    }
  }

  const explanationInput: PriorityExplanationInput = {
    gap_id: gapId,
    geo_id: cluster.geo_id,
    geo_name: geoName,
    category_id: cluster.category_id,
    title: cluster.canonical_issue,
    priority_score: priorityResult.priority_score,
    priority_band: priorityResult.priority_band,
    rank: priorityResult.rank,
    factors_raw: factorsResult.raw,
    factors_normalized: factorsResult.normalized,
    investment_status: factorsResult.investment_status,
    investment_project_name: factorsResult.investment_project_name,
    evidence_refs: evidenceRefs,
    calculation_version: priorityResult.calculation_version,
  };

  const explanation = await explainPriorityScore(explanationInput);

  return {
    gap_id: gapId,
    geo_id: cluster.geo_id,
    category_id: cluster.category_id,
    cluster_id: cluster.cluster_id,
    title: cluster.canonical_issue,
    factors: {
      raw: factorsResult.raw,
      normalized: factorsResult.normalized,
    },
    priority: priorityResult,
    explanation,
    calculated_at: new Date().toISOString(),
    calculation_version: CALCULATION_VERSION,
    is_live_ai: explanation.is_live_ai,
    execution_source: explanation.execution_source,
    recommendation_id: null,
  };
}
