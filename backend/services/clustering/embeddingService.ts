import { GoogleGenAI } from '@google/genai';
import config from '../../common/config';
import { CitizenRequest } from '../../models/CitizenRequest';
import { RequestEmbedding } from '../../models/RequestEmbedding';

export const EMBEDDING_MODEL_NAME = process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview';
export const CLUSTERING_VERSION = 'v1.0';

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

/**
 * Format string per Doc 13 §7: embedding_input_v1
 * Combines taxonomy boundaries with canonical narrative or transcript.
 */
export function formatEmbeddingInputV1(request: {
  category_id?: string | null;
  issue_type_id?: string | null;
  raw_text?: string | null;
  transcript?: string | null;
  issue_summary?: string | null;
}): string {
  const cat = request.category_id || 'UNKNOWN';
  const issue = request.issue_type_id || 'UNKNOWN';
  const narrative = (
    request.transcript ||
    request.raw_text ||
    request.issue_summary ||
    ''
  ).trim();

  return `Category: ${cat} | Issue Type: ${issue} | Narrative: ${narrative}`;
}

/**
 * Computes cosine similarity between two numerical vectors.
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates a deterministic pseudo-embedding vector from text tokens and taxonomy.
 * Used as fallback if Gemini embedding endpoint fails, is quota-limited, or unavailable.
 */
export function generateDeterministicEmbeddingVector(
  formattedInput: string,
  dimensions = 128
): number[] {
  const vector = new Array(dimensions).fill(0);
  const normalized = formattedInput.toLowerCase();
  const words = normalized.split(/[^a-z0-9_\u0900-\u0D7F]+/); // Supports English, Hindi, Kannada unicode

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    // Polynomial rolling hash per token
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 31 + word.charCodeAt(j)) >>> 0;
    }

    const index = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign * (1 / (1 + Math.log(1 + word.length)));
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Generates a RequestEmbedding record using Gemini embedding endpoint (gemini-embedding-2-preview)
 * or falls back cleanly to deterministic representation.
 */
export async function generateRequestEmbedding(
  request: CitizenRequest
): Promise<RequestEmbedding> {
  const formattedText = formatEmbeddingInputV1(request);
  const ai = getGenAI();

  if (ai) {
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL_NAME,
        contents: formattedText,
      });

      const vector = response.embeddings?.[0]?.values;
      if (Array.isArray(vector) && vector.length > 0) {
        return {
          request_id: request.request_id,
          embedding_vector: vector,
          model_version: EMBEDDING_MODEL_NAME,
          created_at: new Date().toISOString(),
          is_live_ai: true,
          execution_source: 'LIVE_GEMINI',
          clustering_version: CLUSTERING_VERSION,
        };
      }
    } catch (err) {
      console.warn(
        `[clustering_embedding] Gemini embedding call failed for request ${request.request_id}, using deterministic fallback:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Deterministic fallback path
  const fallbackVector = generateDeterministicEmbeddingVector(formattedText);
  return {
    request_id: request.request_id,
    embedding_vector: fallbackVector,
    model_version: 'deterministic-embedding-v1.0',
    created_at: new Date().toISOString(),
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
    clustering_version: CLUSTERING_VERSION,
  };
}
