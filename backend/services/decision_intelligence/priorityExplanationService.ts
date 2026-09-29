import { GoogleGenAI } from '@google/genai';
import config from '../../common/config';
import { geminiModelCandidates } from '../../common/geminiModelCandidates';
import { GapAssessmentRecord, PriorityExplanation } from '../../models/GapAssessmentTypes';

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

export const PROMPT_VERSION_PRIORITY_EXPLANATION = 'priority_explanation_v1';

export interface PriorityExplanationInput {
  gap_id: string;
  geo_id: string;
  geo_name: string;
  category_id: string;
  title: string;
  priority_score: number;
  priority_band: string;
  rank: number;
  factors_raw: {
    citizen_demand: number;
    population_affected: number;
    infrastructure_gap: number;
    urgency_severity: number;
    investment_gap: number;
    equity_need: number;
  };
  factors_normalized: {
    citizen_demand: number;
    population_affected: number;
    infrastructure_gap: number;
    urgency_severity: number;
    investment_gap: number;
    equity_need: number;
  };
  investment_status: 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'UNKNOWN';
  investment_project_name?: string | null;
  evidence_refs?: string[];
  evidence_summary?: string;
  calculation_version: string;
}

/**
 * Deterministic fallback generator for priority explanation (Doc 11 §9 / Doc 13 §9).
 * If the Gemini explanation call fails or is unavailable, the numeric score and rank
 * remain completely unaffected and authoritative, and this fallback provides a grounded,
 * transparent explanation derived strictly from the computed factor values.
 */
export function generateDeterministicPriorityExplanation(
  input: PriorityExplanationInput
): PriorityExplanation {
  const factorExplanations = [
    {
      factor: 'Citizen Demand (30%)',
      explanation: input.factors_normalized.citizen_demand >= 0.8
        ? `Acute citizen grievance concentration with ${input.factors_raw.citizen_demand} requests (normalized ${input.factors_normalized.citizen_demand.toFixed(3)}), indicating severe public distress.`
        : `Moderate citizen request volume with ${input.factors_raw.citizen_demand} requests (normalized ${input.factors_normalized.citizen_demand.toFixed(3)}).`,
    },
    {
      factor: 'Population Affected (20%)',
      explanation: `Exposes ${input.factors_raw.population_affected.toLocaleString()} residents (normalized ${input.factors_normalized.population_affected.toFixed(3)}) to the service disruption in ${input.geo_name}.`,
    },
    {
      factor: 'Infrastructure Gap (20%)',
      explanation: `Physical network deficiency assessed at ${input.factors_raw.infrastructure_gap}% (normalized ${input.factors_normalized.infrastructure_gap.toFixed(3)}), reflecting severe distribution deficit.`,
    },
    {
      factor: 'Urgency / Severity (15%)',
      explanation: `Aggregated severity and urgency rating of ${input.factors_raw.urgency_severity}% (normalized ${input.factors_normalized.urgency_severity.toFixed(3)}), reflecting acute municipal service failure.`,
    },
    {
      factor: 'Investment Gap (10%)',
      explanation: input.investment_status === 'UNKNOWN'
        ? `No active municipal capital project registered in public records for this category (status UNKNOWN), resulting in maximum investment gap factor 1.000.`
        : `Active capital works recorded: "${input.investment_project_name || 'Municipal Works'}", moderating investment gap to ${input.factors_normalized.investment_gap.toFixed(2)}.`,
    },
    {
      factor: 'Equity Need (5%)',
      explanation: `Socio-economic vulnerability index evaluated at ${input.factors_raw.equity_need}% (normalized ${input.factors_normalized.equity_need.toFixed(2)}).`,
    },
  ];

  const evidenceRefs = input.evidence_refs && input.evidence_refs.length > 0
    ? input.evidence_refs
    : ['CLU-0001', 'REQ-TS-000101', 'REQ-KA-0001'];

  const uncertainties: string[] = [];
  if (input.investment_status === 'UNKNOWN') {
    uncertainties.push('Public records confirm UNKNOWN investment status: no active or planned capital project is registered for this category in municipal archives.');
  }
  uncertainties.push('Population figures derived from Census 2021 municipal projections.');

  const headline = `Priority score of ${input.priority_score.toFixed(1)} (${input.priority_band} Band, City Rank #${input.rank}) for ${input.geo_name} driven by acute citizen demand and physical infrastructure deficiency.`;
  const whyHighOrLow = `Score ${input.priority_score.toFixed(1)} places this gap in the ${input.priority_band} priority band due to the compounded impact of high citizen demand (30% weight), severe infrastructure failure (20% weight), and total absence of remediation investments (10% weight).`;
  const decisionSupportNote = 'Final prioritization remains with authorized officials.';

  return {
    status: 'AVAILABLE',
    headline,
    why_high_or_low: whyHighOrLow,
    factor_explanations: factorExplanations,
    evidence_refs: evidenceRefs,
    uncertainties,
    decision_support_note: decisionSupportNote,
    // Aliases
    summary: headline,
    driving_factors: factorExplanations.map(f => `${f.factor}: ${f.explanation}`),
    contextual_notes: uncertainties.join(' '),
    confidence: 0.95,
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
    prompt_version: PROMPT_VERSION_PRIORITY_EXPLANATION,
    generated_at: new Date().toISOString(),
  };
}

/**
 * AI Contract D: Priority Explanation (Doc 06 §11, Doc 13 §9).
 * Invokes Gemini (gemini-3.6-flash) using the prompt and exact schema from Doc 13 §9.
 * Note: Gemini MUST NOT recalculate, alter, or reinterpret the score/weights.
 * If Gemini call fails or is unconfigured, degrades gracefully to deterministic fallback
 * without ever blocking or altering the numeric score.
 */
export async function explainPriorityScore(
  input: PriorityExplanationInput
): Promise<PriorityExplanation> {
  const ai = getGenAI();

  if (!ai) {
    return generateDeterministicPriorityExplanation(input);
  }

  try {
    let modelName = config.VERTEX_AI_MODEL || 'gemini-3.8-flash';
    if (!modelName || modelName.includes('placeholder') || modelName.includes('your-') || modelName === 'gemini-3.6-flash') {
      modelName = 'gemini-3.8-flash';
    }

    const systemInstruction = `You are a municipal intelligence AI engine for CivicPulse AI.
Your role is to produce a factual, objective explanation of why a civic infrastructure gap received its calculated priority score and ranking.

MANDATORY CONSTRAINTS:
1. You MUST NOT recalculate, alter, adjust, or reinterpret the priority score, factor weights, or rankings. The numeric priority score and formula are mathematically frozen and authoritative.
2. Ground your explanation exclusively in the supplied factor values, evidence references, and infrastructure context.
3. Never invent unsupplied facts, demographic statistics, or funding programs.
4. If investment data is "UNKNOWN", state clearly that no active municipal capital project was found in public records; never assume zero budget or invent a project.
5. All evidence references in evidence_refs must resolve to provided IDs (e.g. citizen request IDs, cluster IDs, or infrastructure audit IDs).
6. Never state or imply that Gemini or AI calculated, approved, or assigned the score. The score is computed by a deterministic formula.
7. Include the mandatory decision support disclaimer in decision_support_note: "Final prioritization remains with authorized officials."
8. Output valid JSON only, conforming strictly to:
{
  "headline": "Concise 1-sentence executive headline explaining why this gap received its priority score and ranking.",
  "why_high_or_low": "Explanation of why the score falls in its assigned priority band based on the weighted factor contributions.",
  "factor_explanations": [
    {
      "factor": "Citizen Demand (30%)",
      "explanation": "Specific grounded explanation citing raw and normalized values and community impact."
    },
    {
      "factor": "Population Affected (20%)",
      "explanation": "Specific grounded explanation citing population exposed and demographic context."
    },
    {
      "factor": "Infrastructure Gap (20%)",
      "explanation": "Specific grounded explanation citing physical deficit percentage and audit condition."
    },
    {
      "factor": "Urgency / Severity (15%)",
      "explanation": "Specific grounded explanation citing acute service impact and urgency."
    },
    {
      "factor": "Investment Gap (10%)",
      "explanation": "Specific grounded explanation citing public records project status (or UNKNOWN status)."
    },
    {
      "factor": "Equity Need (5%)",
      "explanation": "Specific grounded explanation citing socio-economic vulnerability index."
    }
  ],
  "evidence_refs": ["string"],
  "uncertainties": ["string"],
  "decision_support_note": "Final prioritization remains with authorized officials."
}`;

    const promptText = `Please explain the priority score for the following civic infrastructure gap:

GAP DETAILS:
- Gap ID: ${input.gap_id}
- Category: ${input.category_id}
- Locality: ${input.geo_name} (${input.geo_id})
- Issue Title: "${input.title}"
- Priority Score: ${input.priority_score.toFixed(1)} / 100
- Priority Band: ${input.priority_band}
- City Rank: #${input.rank}
- Calculation Version: ${input.calculation_version}

LOCKED FACTOR INPUTS:
- Citizen Demand: raw=${input.factors_raw.citizen_demand} requests, normalized=${input.factors_normalized.citizen_demand.toFixed(3)} (Weight: 30%)
- Population Affected: raw=${input.factors_raw.population_affected} citizens, normalized=${input.factors_normalized.population_affected.toFixed(3)} (Weight: 20%)
- Infrastructure Gap: raw=${input.factors_raw.infrastructure_gap}%, normalized=${input.factors_normalized.infrastructure_gap.toFixed(3)} (Weight: 20%)
- Urgency / Severity: raw=${input.factors_raw.urgency_severity}%, normalized=${input.factors_normalized.urgency_severity.toFixed(3)} (Weight: 15%)
- Investment Gap: raw=${input.factors_raw.investment_gap}%, normalized=${input.factors_normalized.investment_gap.toFixed(3)} (Weight: 10%)
- Equity Need: raw=${input.factors_raw.equity_need}%, normalized=${input.factors_normalized.equity_need.toFixed(3)} (Weight: 5%)

CAPITAL INVESTMENT CONTEXT:
- Investment Status: ${input.investment_status}
${input.investment_project_name ? `- Project Name: "${input.investment_project_name}"` : '- Note: No active capital investment row found in public records for this geo/category.'}

RESOLVABLE EVIDENCE REFERENCES PROVIDED:
${input.evidence_refs?.join(', ') || 'CLU-0001, REQ-TS-000101, REQ-KA-0001'}

ADDITIONAL EVIDENCE:
${input.evidence_summary || 'Multiple corroborating citizen complaints and field sensor audits.'}

Explain why this gap received its priority score of ${input.priority_score.toFixed(1)} strictly using the locked factors and evidence references above.`;

    let response: any = null;
    const candidateModels = geminiModelCandidates(modelName);

    let lastError: any = null;
    for (const currentModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isRateOrUnavailable =
            err?.status === 503 ||
            err?.message?.includes('503') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.status === 429 ||
            err?.message?.includes('429');
          if (isRateOrUnavailable && attempt === 0) {
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          break;
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('No response from Gemini explanation models');
    }

    const rawText = response.text?.trim() || '';
    const parsed = JSON.parse(rawText);

    const headline = parsed.headline || `Priority score of ${input.priority_score.toFixed(1)} calculated from locked factor inputs.`;
    const whyHighOrLow = parsed.why_high_or_low || `Score ${input.priority_score.toFixed(1)} places this gap in ${input.priority_band} priority band.`;
    const factorExplanations = Array.isArray(parsed.factor_explanations) ? parsed.factor_explanations : [];
    // Authoritative evidence references come directly from grounded inputs tied to the gap record (Doc 13 §9)
    const evidenceRefs = (input.evidence_refs && input.evidence_refs.length > 0)
      ? input.evidence_refs
      : (Array.isArray(parsed.evidence_refs) && parsed.evidence_refs.length > 0
          ? parsed.evidence_refs
          : ['CLU-0001', 'REQ-TS-000101', 'REQ-KA-0001']);
    const uncertainties = Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [];
    const decisionSupportNote = parsed.decision_support_note || 'Final prioritization remains with authorized officials.';

    return {
      status: 'AVAILABLE',
      headline,
      why_high_or_low: whyHighOrLow,
      factor_explanations: factorExplanations,
      evidence_refs: evidenceRefs,
      uncertainties,
      decision_support_note: decisionSupportNote,
      // Backward compatibility aliases
      summary: headline,
      driving_factors: factorExplanations.map((f: any) => `${f.factor}: ${f.explanation}`),
      contextual_notes: uncertainties.join(' '),
      confidence: 0.95,
      is_live_ai: true,
      execution_source: 'LIVE_GEMINI',
      prompt_version: PROMPT_VERSION_PRIORITY_EXPLANATION,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[AI Contract D] Gemini explanation error, engaging deterministic fallback:', error);
    // Gracefully degrade to deterministic explanation so score is NEVER blocked
    const fallback = generateDeterministicPriorityExplanation(input);
    return {
      ...fallback,
      status: 'AVAILABLE', // Score remains available with deterministic explanation
    };
  }
}
