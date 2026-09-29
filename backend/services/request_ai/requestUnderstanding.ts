import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import config from '../../common/config';
import { TAXONOMY, VALID_CATEGORIES, VALID_ISSUE_TYPES, CATEGORY_ISSUE_MAP } from '../../common/taxonomy';
import { AIConfidence } from '../../models/CitizenRequest';

const REQUEST_UNDERSTANDING_PROMPT_PATH = path.resolve(
  process.cwd(),
  'prompts/request_understanding_v1.txt'
);

function loadRequestUnderstandingPrompt(replacements: {
  promptVersion: string;
  taxonomy: string;
  narrative: string;
  language: string;
  media: string;
  location: string;
}): string {
  const raw = fs.readFileSync(REQUEST_UNDERSTANDING_PROMPT_PATH, 'utf-8');
  const bodyStart = raw.indexOf('You are CivicPulse AI');
  if (bodyStart < 0) {
    throw new Error('prompts/request_understanding_v1.txt is missing the Contract A body');
  }
  return raw
    .slice(bodyStart)
    .replaceAll('{{PROMPT_VERSION}}', replacements.promptVersion)
    .replaceAll('{{TAXONOMY}}', replacements.taxonomy)
    .replaceAll('{{NARRATIVE}}', replacements.narrative)
    .replaceAll('{{LANGUAGE}}', replacements.language)
    .replaceAll('{{MEDIA}}', replacements.media)
    .replaceAll('{{LOCATION}}', replacements.location);
}

export interface RequestMediaItem {
  media_type: 'PHOTO' | 'AUDIO';
  uri?: string;
  data?: string;
  mime_type?: string;
}

export interface RequestUnderstandingInput {
  raw_text?: string | null;
  transcript?: string | null;
  language?: string | null;
  media?: RequestMediaItem[] | null;
  geo_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RequestUnderstandingResult {
  language: string;
  transcript: string | null;
  category_id: string; // From closed taxonomy or "UNKNOWN"
  issue_type_id: string; // From closed taxonomy or "UNKNOWN"
  issue_summary: string;
  affected_service: string;
  severity: number; // 1-5
  urgency: number; // 1-5
  ai_confidence: AIConfidence; // 4 approved keys: category, issue_type, intent, location
  evidence_tags: string[];
  needs_clarification: boolean;
  clarification_question: string | null;
  is_live_ai: boolean; // true if returned by live Gemini call, false if deterministic fallback
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

// Lazy-initialize GoogleGenAI client if API key is provided
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
 * AI Contract A Implementation (Doc 06 §6)
 * Processes citizen request narrative, media, and location to produce
 * structured understanding aligned with the closed taxonomy.
 */
export async function understandCitizenRequest(
  input: RequestUnderstandingInput
): Promise<RequestUnderstandingResult> {
  const narrativeText = (input.raw_text || input.transcript || '').trim();
  const hasLocation = Boolean(input.geo_id || (input.latitude != null && input.longitude != null));
  const locationConfidence = hasLocation ? 0.92 : 0.0;

  // If text is completely empty and no media
  if (!narrativeText && (!input.media || input.media.length === 0)) {
    return {
      language: input.language || 'en',
      transcript: null,
      category_id: 'UNKNOWN',
      issue_type_id: 'UNKNOWN',
      issue_summary: 'Empty citizen report received without narrative or evidence.',
      affected_service: 'General Municipal Inquiries',
      severity: 1,
      urgency: 1,
      ai_confidence: {
        category: 0.0,
        issue_type: 0.0,
        intent: 0.1,
        location: locationConfidence,
      },
      evidence_tags: ['EMPTY_REPORT'],
      needs_clarification: true,
      clarification_question: 'Please provide details or photos describing the civic issue.',
      is_live_ai: false,
      execution_source: 'DETERMINISTIC_FALLBACK',
    };
  }

  const ai = getGenAI();
  if (ai) {
    try {
      return await callGeminiRequestUnderstanding(ai, input, narrativeText, hasLocation, locationConfidence);
    } catch (err) {
      console.warn('[request_ai] Gemini API call failed, using deterministic understanding fallback:', err);
    }
  }

  // Deterministic local semantic engine (offline / fallback)
  return deterministicSemanticUnderstanding(input, narrativeText, hasLocation, locationConfidence);
}

/**
 * Gemini-powered understanding for AI Contract A
 */
async function callGeminiRequestUnderstanding(
  ai: GoogleGenAI,
  input: RequestUnderstandingInput,
  narrativeText: string,
  hasLocation: boolean,
  locationConfidence: number
): Promise<RequestUnderstandingResult> {
  let modelName = config.VERTEX_AI_MODEL || 'gemini-3.8-flash';
  if (!modelName || modelName.includes('placeholder') || modelName.includes('your-') || modelName === 'gemini-3.6-flash') {
    modelName = 'gemini-3.8-flash';
  }

  const prompt = loadRequestUnderstandingPrompt({
    promptVersion: config.PROMPT_VERSION_REQUEST_UNDERSTANDING || 'v1.0',
    taxonomy: JSON.stringify(TAXONOMY, null, 2),
    narrative: narrativeText,
    language: input.language || 'auto',
    media: input.media ? input.media.length + ' item(s)' : 'none',
    location: input.geo_id || (hasLocation ? `Lat ${input.latitude}, Lng ${input.longitude}` : 'MISSING'),
  });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          language: { type: Type.STRING },
          transcript: { type: Type.STRING, nullable: true },
          category_id: { type: Type.STRING },
          issue_type_id: { type: Type.STRING },
          issue_summary: { type: Type.STRING },
          affected_service: { type: Type.STRING },
          severity: { type: Type.INTEGER },
          urgency: { type: Type.INTEGER },
          ai_confidence: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.NUMBER },
              issue_type: { type: Type.NUMBER },
              intent: { type: Type.NUMBER },
              location: { type: Type.NUMBER },
            },
            required: ['category', 'issue_type', 'intent', 'location'],
          },
          evidence_tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          needs_clarification: { type: Type.BOOLEAN },
          clarification_question: { type: Type.STRING, nullable: true },
        },
        required: [
          'language',
          'category_id',
          'issue_type_id',
          'issue_summary',
          'affected_service',
          'severity',
          'urgency',
          'ai_confidence',
          'evidence_tags',
          'needs_clarification',
        ],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  // Strict validation against closed taxonomy
  let validCategory = parsed.category_id;
  let validIssueType = parsed.issue_type_id;
  let needsClarification = Boolean(parsed.needs_clarification);
  let clarificationQuestion = parsed.clarification_question || null;

  if (!VALID_CATEGORIES.has(validCategory)) {
    validCategory = 'UNKNOWN';
    validIssueType = 'UNKNOWN';
    needsClarification = true;
    clarificationQuestion = clarificationQuestion || 'Could you please clarify the specific public service issue you are experiencing?';
  } else {
    const allowedIssueTypes = CATEGORY_ISSUE_MAP[validCategory] || [];
    if (!allowedIssueTypes.includes(validIssueType)) {
      validIssueType = 'UNKNOWN';
      needsClarification = true;
      clarificationQuestion = clarificationQuestion || 'Could you please specify the exact type of issue?';
    }
  }

  if (!hasLocation) {
    needsClarification = true;
    if (!clarificationQuestion) {
      clarificationQuestion = 'Could you please provide the specific street, ward, or landmark where this issue occurred?';
    }
  }

  const confidenceObj: AIConfidence = {
    category: typeof parsed.ai_confidence?.category === 'number' ? Math.max(0, Math.min(1, parsed.ai_confidence.category)) : 0.9,
    issue_type: typeof parsed.ai_confidence?.issue_type === 'number' ? Math.max(0, Math.min(1, parsed.ai_confidence.issue_type)) : 0.85,
    intent: typeof parsed.ai_confidence?.intent === 'number' ? Math.max(0, Math.min(1, parsed.ai_confidence.intent)) : 0.92,
    location: hasLocation ? (typeof parsed.ai_confidence?.location === 'number' ? Math.max(0, Math.min(1, parsed.ai_confidence.location)) : locationConfidence) : 0.0,
  };

  return {
    language: parsed.language || input.language || 'en',
    transcript: parsed.transcript || input.transcript || (input.raw_text ? input.raw_text : null),
    category_id: validCategory,
    issue_type_id: validIssueType,
    issue_summary: parsed.issue_summary || narrativeText.slice(0, 100),
    affected_service: parsed.affected_service || 'Municipal Public Works',
    severity: Math.max(1, Math.min(5, Number(parsed.severity) || 3)),
    urgency: Math.max(1, Math.min(5, Number(parsed.urgency) || 3)),
    ai_confidence: confidenceObj,
    evidence_tags: Array.isArray(parsed.evidence_tags) ? parsed.evidence_tags : [],
    needs_clarification: needsClarification,
    clarification_question: clarificationQuestion,
    is_live_ai: true,
    execution_source: 'LIVE_GEMINI',
  };
}

/**
 * Deterministic semantic understanding engine
 * Used in offline test environments or when API key is not configured.
 * Operates across English, Kannada, and Hindi.
 */
export function deterministicSemanticUnderstanding(
  input: RequestUnderstandingInput,
  narrativeText: string,
  hasLocation: boolean,
  locationConfidence: number
): RequestUnderstandingResult {
  const textLower = narrativeText.toLowerCase();

  // Language detection
  let detectedLanguage = input.language || 'en';
  if (/[\u0C80-\u0CFF]/.test(narrativeText)) {
    detectedLanguage = 'kn';
  } else if (/[\u0900-\u097F]/.test(narrativeText)) {
    detectedLanguage = 'hi';
  }

  let category_id = 'UNKNOWN';
  let issue_type_id = 'UNKNOWN';
  let affected_service = 'Municipal Public Works';
  let severity = 3;
  let urgency = 3;
  const evidence_tags: string[] = [];

  // WATER
  if (
    textLower.includes('water') ||
    textLower.includes('ನೀರು') ||
    textLower.includes('ಕುಡಿಯುವ') ||
    textLower.includes('पानी') ||
    textLower.includes('नल') ||
    textLower.includes('tanker') ||
    textLower.includes('pipeline') ||
    textLower.includes('पाइप') ||
    textLower.includes('पाइपलाइन')
  ) {
    category_id = 'WATER';
    affected_service = 'Municipal Potable Water Supply';
    evidence_tags.push('WATER_INFRASTRUCTURE');

    if (
      textLower.includes('burst') ||
      textLower.includes('rupture') ||
      textLower.includes('leak') ||
      textLower.includes('broke') ||
      textLower.includes('crack') ||
      textLower.includes('ಒಡೆದು') ||
      textLower.includes('ಲೀಕ್') ||
      textLower.includes('फूट') ||
      textLower.includes('लीक')
    ) {
      issue_type_id = 'PIPELINE_FAILURE';
      severity = 4;
      urgency = 5;
      evidence_tags.push('PHYSICAL_RUPTURE');
    } else if (
      textLower.includes('stoppage') ||
      textLower.includes('stopped') ||
      textLower.includes('cutoff') ||
      textLower.includes('interruption') ||
      textLower.includes('distribution') ||
      textLower.includes('ಸ್ಥಗಿತ')
    ) {
      issue_type_id = 'SUPPLY_INTERRUPTION';
      severity = 3;
      urgency = 4;
      evidence_tags.push('SERVICE_OUTAGE');
    } else {
      issue_type_id = 'DRINKING_WATER_SHORTAGE';
      severity = 4;
      urgency = 4;
      evidence_tags.push('DEFICIT');
    }
  }
  // ROADS
  else if (
    textLower.includes('road') ||
    textLower.includes('pothole') ||
    textLower.includes('crater') ||
    textLower.includes('asphalt') ||
    textLower.includes('రస్తే') ||
    textLower.includes('ಗುಂಡಿ') ||
    textLower.includes('रंग') ||
    textLower.includes('सड़क') ||
    textLower.includes('गड्ढा') ||
    textLower.includes('गड्ढे')
  ) {
    category_id = 'ROADS';
    affected_service = 'Urban Arterial Road Maintenance';
    evidence_tags.push('ROAD_NETWORK');

    if (
      textLower.includes('pothole') ||
      textLower.includes('crater') ||
      textLower.includes('ಗುಂಡಿ') ||
      textLower.includes('गड्ढा') ||
      textLower.includes('गड्ढे')
    ) {
      issue_type_id = 'POTHOLE';
      severity = 4;
      urgency = 4;
      evidence_tags.push('SURFACE_HAZARD');
    } else if (
      textLower.includes('unpaved') ||
      textLower.includes('link') ||
      textLower.includes('transit') ||
      textLower.includes('connecting')
    ) {
      issue_type_id = 'CONNECTIVITY_GAP';
      severity = 3;
      urgency = 2;
      evidence_tags.push('ACCESSIBILITY');
    } else {
      issue_type_id = 'ROAD_DAMAGE';
      severity = 3;
      urgency = 3;
      evidence_tags.push('DEGRADATION');
    }
  }
  // DRAINAGE
  else if (
    textLower.includes('drain') ||
    textLower.includes('drainage') ||
    textLower.includes('flood') ||
    textLower.includes('gutter') ||
    textLower.includes('waterlog') ||
    textLower.includes('ಚರಂಡಿ') ||
    textLower.includes('नाली') ||
    textLower.includes('जलभराव')
  ) {
    category_id = 'DRAINAGE';
    affected_service = 'Stormwater Drainage Network';
    evidence_tags.push('DRAINAGE_NETWORK');

    if (
      textLower.includes('flood') ||
      textLower.includes('waterlog') ||
      textLower.includes('ponding') ||
      textLower.includes('जलभराव')
    ) {
      issue_type_id = 'LOCAL_FLOODING';
      severity = 4;
      urgency = 4;
      evidence_tags.push('FLOODING');
    } else {
      issue_type_id = 'BLOCKED_DRAIN';
      severity = 3;
      urgency = 3;
      evidence_tags.push('CLOGGED_CULVERT');
    }
  }
  // SANITATION
  else if (
    textLower.includes('garbage') ||
    textLower.includes('trash') ||
    textLower.includes('waste') ||
    textLower.includes('toilet') ||
    textLower.includes('ಕಸ') ||
    textLower.includes('कचरा')
  ) {
    category_id = 'SANITATION';
    affected_service = 'Municipal Solid Waste Management';
    evidence_tags.push('SANITATION');

    if (textLower.includes('toilet') || textLower.includes('shoppers') || textLower.includes('latrine')) {
      issue_type_id = 'PUBLIC_SANITATION';
      severity = 3;
      urgency = 3;
    } else {
      issue_type_id = 'WASTE_COLLECTION';
      severity = 3;
      urgency = 3;
    }
  }
  // ELECTRICITY
  else if (
    textLower.includes('light') ||
    textLower.includes('power') ||
    textLower.includes('electricity') ||
    textLower.includes('blackout') ||
    textLower.includes('ದೀಪ') ||
    textLower.includes('बिजली')
  ) {
    category_id = 'ELECTRICITY';
    affected_service = 'Public Street Lighting & Power Distribution';
    evidence_tags.push('ELECTRICAL_GRID');

    if (textLower.includes('street') || textLower.includes('lamp') || textLower.includes('pole')) {
      issue_type_id = 'STREET_LIGHTING';
      severity = 3;
      urgency = 3;
    } else {
      issue_type_id = 'LOCAL_RELIABILITY';
      severity = 3;
      urgency = 4;
    }
  }
  // HEALTH_ACCESS
  else if (textLower.includes('hospital') || textLower.includes('clinic') || textLower.includes('doctor') || textLower.includes('ಆಸ್ಪತ್ರೆ') || textLower.includes('अस्पताल')) {
    category_id = 'HEALTH_ACCESS';
    affected_service = 'Primary Healthcare Facilities';
    issue_type_id = 'FACILITY_ACCESS';
    severity = 3;
    urgency = 3;
    evidence_tags.push('HEALTHCARE');
  }
  // EDUCATION
  else if (textLower.includes('school') || textLower.includes('classroom') || textLower.includes('ಶಾಲೆ') || textLower.includes('स्कूल')) {
    category_id = 'EDUCATION';
    affected_service = 'Primary Education Infrastructure';
    issue_type_id = 'SCHOOL_CAPACITY';
    severity = 3;
    urgency = 2;
    evidence_tags.push('EDUCATION');
  }
  // CONNECTIVITY
  else if (textLower.includes('internet') || textLower.includes('fiber') || textLower.includes('kiosk') || textLower.includes('ಕಿಯೋಸ್ಕ್')) {
    category_id = 'CONNECTIVITY';
    affected_service = 'Municipal Citizen Digital Centers';
    issue_type_id = 'INTERNET_ACCESS';
    severity = 2;
    urgency = 2;
    evidence_tags.push('DIGITAL_SERVICES');
  }

  // Determine clarification needs
  let needs_clarification = false;
  let clarification_question: string | null = null;

  if (category_id === 'UNKNOWN' || issue_type_id === 'UNKNOWN') {
    needs_clarification = true;
    clarification_question = 'Could you please clarify the specific public service issue you are experiencing?';
  } else if (!hasLocation) {
    needs_clarification = true;
    clarification_question = 'Could you please provide your specific ward, street name, or nearby landmark so we can dispatch the field team?';
  }

  const categoryConfidence = category_id !== 'UNKNOWN' ? 0.95 : 0.2;
  const issueTypeConfidence = issue_type_id !== 'UNKNOWN' ? 0.92 : 0.2;
  const intentConfidence = narrativeText.length > 10 ? 0.94 : 0.5;

  const ai_confidence: AIConfidence = {
    category: categoryConfidence,
    issue_type: issueTypeConfidence,
    intent: intentConfidence,
    location: hasLocation ? locationConfidence : 0.0,
  };

  // Generate summary
  let issue_summary = narrativeText.length > 120 ? narrativeText.slice(0, 117) + '...' : narrativeText;
  if (category_id === 'WATER' && issue_type_id === 'DRINKING_WATER_SHORTAGE') {
    issue_summary = `Severe drinking water supply shortage reported: ${narrativeText.slice(0, 80)}`;
  } else if (category_id === 'WATER' && issue_type_id === 'PIPELINE_FAILURE') {
    issue_summary = `Drinking water pipeline rupture reported: ${narrativeText.slice(0, 80)}`;
  } else if (category_id === 'ROADS' && issue_type_id === 'POTHOLE') {
    issue_summary = `Hazardous road pothole condition reported: ${narrativeText.slice(0, 80)}`;
  }

  return {
    language: detectedLanguage,
    transcript: input.transcript || (input.raw_text ? input.raw_text : null),
    category_id,
    issue_type_id,
    issue_summary,
    affected_service,
    severity,
    urgency,
    ai_confidence,
    evidence_tags,
    needs_clarification,
    clarification_question,
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
  };
}

export default understandCitizenRequest;
