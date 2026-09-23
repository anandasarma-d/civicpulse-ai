/**
 * RequestEmbedding:
 * Deliberately minimal representation per specification.
 */
export interface RequestEmbedding {
  request_id: string;
  embedding_vector: number[];
  model_version: string;
  created_at: string; // datetime (ISO 8601)
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  clustering_version: string;
}
