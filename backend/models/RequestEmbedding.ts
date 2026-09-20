/**
 * RequestEmbedding:
 * Deliberately minimal representation per specification.
 */
export interface RequestEmbedding {
  request_id: string;
  embedding_vector: number[];
  model_version: string;
  created_at: string; // datetime (ISO 8601)
}
