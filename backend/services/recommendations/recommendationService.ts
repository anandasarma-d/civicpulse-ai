import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import config from '../../common/config';
import { CitizenRequest } from '../../models/CitizenRequest';
import { Facility } from '../../models/Facility';
import { GapAssessmentRecord } from '../../models/GapAssessmentTypes';
import { InfrastructureProfile } from '../../models/InfrastructureProfile';
import { IssueCluster } from '../../models/IssueCluster';
import { ProjectInvestment } from '../../models/ProjectInvestment';
import {
  Recommendation,
  RecommendationApiResponse,
  RecommendationModelOutput,
} from '../../models/Recommendation';
import { citizenRequestRepository } from '../../repositories/CitizenRequestRepository';
import { demographicProfileRepository } from '../../repositories/DemographicProfileRepository';
import { gapAssessmentRepository } from '../../repositories/GapAssessmentRepository';
import { geographyRepository } from '../../repositories/GeographyRepository';
import { infrastructureProfileRepository } from '../../repositories/InfrastructureProfileRepository';
import { issueClusterRepository } from '../../repositories/IssueClusterRepository';
import { projectInvestmentRepository } from '../../repositories/ProjectInvestmentRepository';
import { recommendationRepository } from '../../repositories/RecommendationRepository';
import { assessGapForCluster } from '../decision_intelligence/gapAssessmentService';
import { buildScoreBreakdown } from './scoreBreakdown';
import { coerceJson } from '../../common/bigqueryClient';
import { callFirstSuccessfulModel, geminiModelCandidates } from '../../common/geminiModelCandidates';

/** Canonical Contract E disclaimer. Appended server-side after every generation. */
export const DECISION_SUPPORT_CAVEAT =
  'This is a decision-support recommendation, not an autonomous government decision or an executed action.';

export function ensureDecisionSupportCaveat(caveats: string[]): string[] {
  const next = caveats.map(String);
  if (!next.includes(DECISION_SUPPORT_CAVEAT)) {
    next.push(DECISION_SUPPORT_CAVEAT);
  }
  return next;
}

export const PROMPT_VERSION_RECOMMENDATION = 'recommendation_v1';

export interface RecommendationCallTrace {
  system_instruction: string;
  user_prompt: string;
  model_name: string;
  raw_model_response: string | null;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

export interface AssembledRecommendationEvidence {
  gap: GapAssessmentRecord;
  cluster: IssueCluster | null;
  geo_name: string;
  representative_requests: CitizenRequest[];
  infrastructure: InfrastructureProfile | null;
  facilities: Facility[];
  investments: ProjectInvestment[];
  population: number | null;
  vulnerability_index: number | null;
  allowed_evidence_refs: string[];
  evidence_is_thin: boolean;
}

let lastCallTrace: RecommendationCallTrace | null = null;

export function getLastRecommendationCallTrace(): RecommendationCallTrace | null {
  return lastCallTrace;
}

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Loads Document 13 §10 verbatim and prepends Common AI Rules
 * as instructed by the frozen baseline ("prepend to every AI prompt").
 * The REC-0042 API envelope example is not sent to the model.
 */
export function loadRecommendationSystemInstruction(): string {
  const promptPath = path.resolve(process.cwd(), 'prompts/recommendation_v1.txt');
  const raw = fs.readFileSync(promptPath, 'utf-8');

  const generationStart = raw.indexOf('You are performing RECOMMENDATION_GENERATION.');
  const commonStart = raw.indexOf('You are an AI component inside CivicPulse AI');
  if (generationStart < 0 || commonStart < 0) {
    throw new Error('prompts/recommendation_v1.txt is missing Doc 13 §10 sections');
  }

  const generationBlock = raw.slice(generationStart, commonStart).trim();
  const commonRules = raw.slice(commonStart).trim();
  return `${commonRules}\n\n${generationBlock}`;
}

function loadFacilities(geoId: string, categoryId: string): Facility[] {
  const filePath = path.resolve(process.cwd(), 'data/seed/facilities.json');
  if (!fs.existsSync(filePath)) return [];
  const all = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Facility[];
  return all.filter((f) => f.geo_id === geoId && f.category_id === categoryId);
}

export async function loadGapRecord(gapId: string): Promise<GapAssessmentRecord | null> {
  const seedGap = await gapAssessmentRepository.getById(gapId);
  const clusterId = gapId === 'GAP-0001' ? 'CLU-0001' : gapId === 'GAP-0002' ? 'CLU-0002' : seedGap?.cluster_id;
  if (!clusterId) return null;
  const cluster = await issueClusterRepository.getById(clusterId);
  if (!cluster) return null;
  const rank = gapId === 'GAP-0001' ? 1 : gapId === 'GAP-0002' ? 2 : seedGap?.rank || 99;
  return assessGapForCluster(cluster, gapId, rank);
}

export async function assembleEvidence(gap: GapAssessmentRecord): Promise<AssembledRecommendationEvidence> {
  const cluster = await issueClusterRepository.getById(gap.cluster_id);
  const geo = await geographyRepository.getById(gap.geo_id);
  const demo = await demographicProfileRepository.getByGeoId(gap.geo_id);
  const infrastructure = await infrastructureProfileRepository.getByGeoAndCategory(
    gap.geo_id,
    gap.category_id
  );
  const investments = await projectInvestmentRepository.listByGeoAndCategory(gap.geo_id, gap.category_id);
  const facilities = loadFacilities(gap.geo_id, gap.category_id);

  let representative_requests: CitizenRequest[] = [];
  const ids = cluster?.representative_request_ids || [];
  if (ids.length > 0) {
    const fetched = await Promise.all(ids.map((id) => citizenRequestRepository.getById(id)));
    representative_requests = fetched.filter(Boolean) as CitizenRequest[];
  }

  const allowed = new Set<string>([gap.gap_id, gap.cluster_id]);
  for (const req of representative_requests) {
    allowed.add(req.request_id);
  }
  for (const fac of facilities) {
    allowed.add(fac.facility_id);
  }

  const evidence_is_thin =
    !cluster ||
    representative_requests.length === 0 ||
    !infrastructure;

  return {
    gap,
    cluster,
    geo_name: geo?.name || gap.geo_id,
    representative_requests,
    infrastructure,
    facilities,
    investments,
    population: demo?.population ?? cluster?.affected_population ?? null,
    vulnerability_index: demo?.vulnerability_index ?? null,
    allowed_evidence_refs: Array.from(allowed),
    evidence_is_thin,
  };
}

export function buildRecommendationUserPrompt(evidence: AssembledRecommendationEvidence): string {
  const { gap, cluster, geo_name, representative_requests, infrastructure, facilities, investments } = evidence;

  const requestLines = representative_requests.length
    ? representative_requests
        .map(
          (r) =>
            `- ${r.request_id} [${r.input_modality}/${r.language}]: ${r.issue_summary || r.raw_text || r.transcript || 'No narrative'}`
        )
        .join('\n')
    : '- NONE supplied';

  const infraLines = infrastructure
    ? [
        `- coverage_score: ${infrastructure.coverage_score}`,
        `- quality_score: ${infrastructure.quality_score}`,
        `- service_reliability: ${infrastructure.service_reliability}`,
        `- facility_count: ${infrastructure.facility_count}`,
        `- data_source: ${infrastructure.data_source}`,
      ].join('\n')
    : '- UNKNOWN (no InfrastructureProfile row for this geo/category)';

  const facilityLines = facilities.length
    ? facilities
        .map(
          (f) =>
            `- ${f.facility_id}: ${f.name} (status ${f.operational_status}${f.coverage_area ? `, coverage ${f.coverage_area}` : ''})`
        )
        .join('\n')
    : '- NONE supplied';

  const investmentLines = investments.length
    ? investments
        .map((inv) => `- ${inv.project_id}: "${inv.project_name}" status=${inv.status}`)
        .join('\n')
    : '- UNKNOWN: no ProjectInvestment row found in public records for this geo/category. Do not invent a project, funding source, cost, timeline, or agency.';

  return `SUPPLIED CONTEXT FOR RECOMMENDATION_GENERATION

GAP:
- gap_id: ${gap.gap_id}
- title: ${gap.title}
- category_id: ${gap.category_id}
- geo_id: ${gap.geo_id}
- locality: ${geo_name}
- cluster_id: ${gap.cluster_id}
- priority_score: ${gap.priority.priority_score} (deterministic; do not recalculate)
- priority_band: ${gap.priority.priority_band}
- rank: ${gap.priority.rank}

LOCKED FACTOR VALUES (already validated; do not recalculate):
- citizen_demand normalized=${gap.factors.normalized.citizen_demand} raw=${gap.factors.raw.citizen_demand}
- population_affected normalized=${gap.factors.normalized.population_affected} raw=${gap.factors.raw.population_affected}
- infrastructure_gap normalized=${gap.factors.normalized.infrastructure_gap} raw=${gap.factors.raw.infrastructure_gap}
- urgency_severity normalized=${gap.factors.normalized.urgency_severity} raw=${gap.factors.raw.urgency_severity}
- investment_gap normalized=${gap.factors.normalized.investment_gap} raw=${gap.factors.raw.investment_gap}
- equity_need normalized=${gap.factors.normalized.equity_need} raw=${gap.factors.raw.equity_need}

CLUSTER:
- cluster_id: ${cluster?.cluster_id || 'UNKNOWN'}
- canonical_issue: ${cluster?.canonical_issue || 'UNKNOWN'}
- request_count: ${cluster?.request_count ?? 'UNKNOWN'}
- trend: ${cluster?.trend || 'UNKNOWN'}
- severity: ${cluster?.severity ?? 'UNKNOWN'}
- urgency: ${cluster?.urgency ?? 'UNKNOWN'}

POPULATION / DEMOGRAPHICS:
- population: ${evidence.population ?? 'UNKNOWN'}
- vulnerability_index: ${evidence.vulnerability_index ?? 'UNKNOWN'}

INFRASTRUCTURE PROFILE:
${infraLines}

FACILITIES (only supplied rows; do not invent others):
${facilityLines}

PROJECT INVESTMENT:
${investmentLines}

REPRESENTATIVE CITIZEN REQUESTS:
${requestLines}

ALLOWED evidence_refs (cite only from this list):
${evidence.allowed_evidence_refs.join(', ')}

Generate the recommendation JSON now.`;
}

function filterEvidenceRefs(refs: unknown, allowed: string[]): string[] {
  if (!Array.isArray(refs)) return allowed.slice(0, 4);
  const filtered = refs.filter((r): r is string => typeof r === 'string' && allowed.includes(r));
  return filtered.length > 0 ? filtered : allowed.slice(0, 4);
}

export function generateDeterministicRecommendation(
  evidence: AssembledRecommendationEvidence
): RecommendationModelOutput {
  const { gap, cluster, geo_name, investments, facilities, infrastructure } = evidence;
  const hasInvestment = investments.length > 0;
  const primaryInvestment = hasInvestment ? investments[0] : null;
  const facilityNote = facilities.length
    ? `Supplied facility context includes ${facilities.map((f) => `${f.facility_id} (${f.name}, ${f.operational_status})`).join('; ')}.`
    : 'No facility row was supplied for this geo and category.';

  const intervention = hasInvestment
    ? `Review and accelerate remediation of the recorded ${gap.category_id.toLowerCase()} service failure in ${geo_name}, aligned with the already-registered capital works record ${primaryInvestment!.project_id} ("${primaryInvestment!.project_name}", status ${primaryInvestment!.status}). This is advisory only and requires authorized official review.`
    : `Prioritize field verification and restoration of the recorded ${gap.category_id.toLowerCase()} service failure in ${geo_name}. No active or planned municipal capital project is registered in the supplied public records for this locality and category — none is proposed here. This is advisory only and requires authorized official review.`;

  const why_here = `${geo_name} (${gap.geo_id}) is the locality on the source gap ${gap.gap_id} and cluster ${gap.cluster_id}${cluster ? ` ("${cluster.canonical_issue}")` : ''}. ${
    infrastructure
      ? `Infrastructure audit scores on file: coverage ${infrastructure.coverage_score}, quality ${infrastructure.quality_score}, reliability ${infrastructure.service_reliability}.`
      : 'No InfrastructureProfile row was supplied.'
  } ${facilityNote}`;

  const why_now = `Demand and urgency are already recorded on ${gap.gap_id}: ${gap.factors.raw.citizen_demand} citizen requests (normalized demand ${gap.factors.normalized.citizen_demand}), urgency/severity ${gap.factors.raw.urgency_severity}, priority band ${gap.priority.priority_band} with deterministic score ${gap.priority.priority_score} and city rank #${gap.priority.rank}${cluster?.trend ? `, cluster trend ${cluster.trend}` : ''}.`;

  const expected_benefit = `If authorized officials act on the recorded failure, an expected (not guaranteed) reduction in service disruption for the ${
    evidence.population != null ? `recorded ${evidence.population.toLocaleString()} residents` : 'recorded exposed population'
  } in ${geo_name} is the intended outcome. No delivery date or cost is asserted.`;

  const caveats: string[] = [
    'This is a decision-support recommendation, not an autonomous government decision or an executed action.',
  ];
  if (!hasInvestment) {
    caveats.push(
      'No ProjectInvestment row was found in public records for this geo/category. Investment status is UNKNOWN. No funding source, project name, cost, timeline, or implementing agency is asserted.'
    );
  }
  if (!infrastructure) {
    caveats.push('Infrastructure profile is missing; physical-condition claims are limited to the supplied cluster and request records.');
  }
  if (evidence.representative_requests.length === 0) {
    caveats.push('No representative citizen requests were supplied; request-level grounding is incomplete.');
  }
  if (evidence.evidence_is_thin) {
    caveats.push('Evidence is insufficient for a confident recommendation. Field verification and human review are required before any official action.');
  }

  return {
    intervention,
    why_here,
    why_now,
    expected_benefit,
    caveats,
    evidence_refs: evidence.allowed_evidence_refs.slice(0, 6),
    review_required: evidence.evidence_is_thin,
  };
}

async function callGeminiRecommendation(
  systemInstruction: string,
  userPrompt: string
): Promise<{ output: RecommendationModelOutput; modelName: string; raw: string }> {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Gemini client unavailable');
  }

  let modelName = config.VERTEX_AI_MODEL || 'gemini-3.8-flash';
  if (!modelName || modelName.includes('placeholder') || modelName.includes('your-') || modelName === 'gemini-3.6-flash') {
    modelName = 'gemini-3.8-flash';
  }

  const { result, modelName: usedModel } = await callFirstSuccessfulModel(
    geminiModelCandidates(modelName),
    async (currentModel) => {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      const raw = (response.text || '').trim();
      if (!raw) {
        throw new Error('Empty Gemini recommendation response');
      }
      const parsed = JSON.parse(raw) as RecommendationModelOutput;
      return { output: parsed, raw };
    }
  );
  return { output: result.output, modelName: usedModel, raw: result.raw };
}

function toApiResponse(record: Recommendation): RecommendationApiResponse {
  const score_breakdown =
    coerceJson<Recommendation['score_breakdown']>(record.score_breakdown) || record.score_breakdown;
  return {
    recommendation_id: record.recommendation_id,
    gap_id: record.gap_id,
    recommendation: {
      intervention: record.intervention,
      why_here: record.why_here,
      why_now: record.why_now,
      expected_benefit: record.expected_benefit,
      caveats: ensureDecisionSupportCaveat(record.caveats || []),
      evidence_refs: record.evidence_refs,
    },
    score_breakdown,
    review_required: record.review_required,
    prompt_version: 'recommendation_v1',
    is_live_ai: record.is_live_ai,
    execution_source: record.execution_source,
  };
}

export async function generateRecommendationForGap(
  gap: GapAssessmentRecord,
  recommendationId: string
): Promise<RecommendationApiResponse> {
  const existing = await recommendationRepository.getById(recommendationId);
  if (existing && existing.prompt_version === PROMPT_VERSION_RECOMMENDATION && existing.gap_id === gap.gap_id) {
    return toApiResponse(existing);
  }

  const evidence = await assembleEvidence(gap);
  const systemInstruction = loadRecommendationSystemInstruction();
  const userPrompt = buildRecommendationUserPrompt(evidence);
  const score_breakdown = buildScoreBreakdown(gap);

  let modelOutput: RecommendationModelOutput;
  let modelName: string | null = null;
  let execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK' = 'DETERMINISTIC_FALLBACK';
  let rawResponse: string | null = null;

  const ai = getGenAI();
  if (ai) {
    try {
      const live = await callGeminiRecommendation(systemInstruction, userPrompt);
      modelOutput = live.output;
      modelName = live.modelName;
      rawResponse = live.raw;
      execution_source = 'LIVE_GEMINI';
    } catch (err) {
      console.warn('[AI Contract E] Gemini recommendation error, engaging deterministic fallback:', err);
      modelOutput = generateDeterministicRecommendation(evidence);
    }
  } else {
    modelOutput = generateDeterministicRecommendation(evidence);
  }

  lastCallTrace = {
    system_instruction: systemInstruction,
    user_prompt: userPrompt,
    model_name: modelName || 'DETERMINISTIC_FALLBACK',
    raw_model_response: rawResponse,
    execution_source,
  };

  const allowed = evidence.allowed_evidence_refs;
  const evidence_refs = filterEvidenceRefs(modelOutput.evidence_refs, allowed);
  const review_required = Boolean(modelOutput.review_required) || evidence.evidence_is_thin;

  const caveats = ensureDecisionSupportCaveat(
    Array.isArray(modelOutput.caveats) && modelOutput.caveats.length > 0
      ? modelOutput.caveats.map(String)
      : generateDeterministicRecommendation(evidence).caveats
  );

  if (review_required && !caveats.some((c) => /review|insufficient|UNKNOWN|missing|not found/i.test(c))) {
    caveats.push('Evidence is insufficient for a confident recommendation. Human review is required.');
  }

  const record: Recommendation = {
    recommendation_id: recommendationId,
    gap_id: gap.gap_id,
    rank: gap.priority.rank,
    intervention: String(modelOutput.intervention || ''),
    why_here: String(modelOutput.why_here || ''),
    why_now: String(modelOutput.why_now || ''),
    expected_benefit: String(modelOutput.expected_benefit || ''),
    caveats,
    evidence_refs,
    score_breakdown,
    model_name: modelName,
    prompt_version: PROMPT_VERSION_RECOMMENDATION,
    generated_at: new Date().toISOString(),
    status: 'DRAFT',
    review_required,
    is_live_ai: execution_source === 'LIVE_GEMINI',
    execution_source,
  };

  await recommendationRepository.save(record);
  return toApiResponse(record);
}

export function gapIdForRecommendationId(recommendationId: string): string | null {
  if (recommendationId === 'REC-0001') return 'GAP-0001';
  if (recommendationId === 'REC-0002') return 'GAP-0002';
  return null;
}

export async function getOrGenerateRecommendation(
  recommendationId: string
): Promise<RecommendationApiResponse | null> {
  const cached = await recommendationRepository.getById(recommendationId);
  if (cached && cached.prompt_version === PROMPT_VERSION_RECOMMENDATION) {
    return toApiResponse(cached);
  }

  const gapId = gapIdForRecommendationId(recommendationId);
  if (!gapId) return cached ? toApiResponse(cached) : null;

  const gap = await loadGapRecord(gapId);
  if (!gap) return null;
  return generateRecommendationForGap(gap, recommendationId);
}

export async function recommendationIdForGap(gapId: string): Promise<string | null> {
  if (gapId === 'GAP-0001') {
    const gap = await loadGapRecord('GAP-0001');
    if (!gap) return null;
    await generateRecommendationForGap(gap, 'REC-0001');
    return 'REC-0001';
  }
  if (gapId === 'GAP-0002') {
    const gap = await loadGapRecord('GAP-0002');
    if (!gap) return null;
    await generateRecommendationForGap(gap, 'REC-0002');
    return 'REC-0002';
  }
  const existing = await recommendationRepository.getByGapId(gapId);
  return existing?.recommendation_id || null;
}
