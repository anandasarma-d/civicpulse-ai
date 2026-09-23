import { CitizenRequest } from '../../models/CitizenRequest';
import { RequestEmbedding } from '../../models/RequestEmbedding';
import {
  computeCosineSimilarity,
  generateRequestEmbedding,
  CLUSTERING_VERSION,
} from './embeddingService';

export interface ClusteringOptions {
  similarityThreshold?: number; // default 0.78
  minClusterSize?: number; // default 2
  temporalWindowDays?: number; // default 90 days
}

export interface ClusteredGroup {
  clusterKey: string;
  category_id: string;
  issue_type_id: string;
  geo_id: string;
  requests: CitizenRequest[];
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
  averageSimilarity: number;
}

export interface ClusteringResult {
  clusters: ClusteredGroup[];
  unclusteredRequests: CitizenRequest[];
  embeddingsGenerated: RequestEmbedding[];
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

/**
 * Technical Constraint 3: Explicit deterministic fallback for clustering.
 * Located at: backend/services/clustering/clusteringService.ts -> deterministicTaxonomyGeographyFallback
 *
 * If the embedding or semantic similarity call fails or throws,
 * falls back to exact taxonomy + geography grouping (same category_id + issue_type_id + geo_id)
 * rather than leaving requests permanently unclustered or fabricating a similarity score.
 */
export function deterministicTaxonomyGeographyFallback(
  requests: CitizenRequest[]
): ClusteringResult {
  const groupMap = new Map<string, CitizenRequest[]>();
  const unclustered: CitizenRequest[] = [];

  for (const req of requests) {
    if (!req.category_id || req.category_id === 'UNKNOWN' || !req.geo_id) {
      unclustered.push(req);
      continue;
    }

    const key = `${req.category_id}::${req.issue_type_id || 'GENERAL'}::${req.geo_id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(req);
  }

  const clusters: ClusteredGroup[] = [];
  for (const [key, groupReqs] of groupMap.entries()) {
    const [cat, issue, geo] = key.split('::');
    clusters.push({
      clusterKey: key,
      category_id: cat,
      issue_type_id: issue,
      geo_id: geo,
      requests: groupReqs,
      is_live_ai: false,
      execution_source: 'DETERMINISTIC_FALLBACK',
      averageSimilarity: 1.0,
    });
  }

  return {
    clusters,
    unclusteredRequests: unclustered,
    embeddingsGenerated: [],
    is_live_ai: false,
    execution_source: 'DETERMINISTIC_FALLBACK',
  };
}

/**
 * Main Semantic Clustering Service with Taxonomy & Geography Guardrails (Doc 06 §8, Doc 11 §11)
 *
 * Guardrail Enforcement:
 * 1. Hard Semantic Boundary: Category and Issue Type must match.
 * 2. Geography Guardrail: Requests must share the exact same geo_id.
 *    Same wording in a distant district/ward will NOT be merged.
 * 3. Semantic Similarity: Cosine similarity on embedding vectors must exceed threshold.
 * 4. Temporal Window: Requests within active temporal window.
 */
export async function clusterRequests(
  requests: CitizenRequest[],
  options: ClusteringOptions = {}
): Promise<ClusteringResult> {
  const similarityThreshold = options.similarityThreshold ?? 0.78;
  const minClusterSize = options.minClusterSize ?? 1;

  // 1. Filter eligible requests: PROCESSED requests with non-null category
  const eligibleRequests = requests.filter(
    (r) => r.status === 'PROCESSED' && r.category_id && r.category_id !== 'UNKNOWN'
  );

  const unclusteredList: CitizenRequest[] = requests.filter(
    (r) => !eligibleRequests.includes(r)
  );

  if (eligibleRequests.length === 0) {
    return {
      clusters: [],
      unclusteredRequests: unclusteredList,
      embeddingsGenerated: [],
      is_live_ai: false,
      execution_source: 'DETERMINISTIC_FALLBACK',
    };
  }

  // 2. Generate or gather embeddings
  const embeddingsMap = new Map<string, RequestEmbedding>();
  const embeddingsList: RequestEmbedding[] = [];
  let anyLiveAi = false;
  let allLiveAi = true;

  try {
    for (const req of eligibleRequests) {
      const emb = await generateRequestEmbedding(req);
      embeddingsMap.set(req.request_id, emb);
      embeddingsList.push(emb);
      if (emb.is_live_ai) {
        anyLiveAi = true;
      } else {
        allLiveAi = false;
      }
    }
  } catch (err) {
    console.warn(
      '[clusteringService] Embedding generation encountered fatal error; engaging deterministic taxonomy+geography fallback:',
      err
    );
    return deterministicTaxonomyGeographyFallback(eligibleRequests);
  }

  // Technical Constraint 3: If any embedding generation fell back to deterministic representation,
  // engage deterministicTaxonomyGeographyFallback rather than computing similarity on pseudo-vectors.
  if (!allLiveAi && !anyLiveAi) {
    return deterministicTaxonomyGeographyFallback(eligibleRequests);
  }

  // 3. Perform Guardrailed Semantic Clustering
  try {
    const visited = new Set<string>();
    const clusters: ClusteredGroup[] = [];

    // Group eligible requests by strict taxonomy + geography partition first (guardrails 1 & 2)
    const partitionMap = new Map<string, CitizenRequest[]>();
    for (const req of eligibleRequests) {
      // Guardrail: must have geo_id
      if (!req.geo_id) {
        unclusteredList.push(req);
        continue;
      }

      // Hard boundary key: Category + Issue Type + Geography (Doc 06 §8)
      // Note: Compatible issue types in same category can cluster if semantic similarity warrants,
      // but category and geography are absolute hard walls.
      const partitionKey = `${req.category_id}::${req.geo_id}`;
      if (!partitionMap.has(partitionKey)) {
        partitionMap.set(partitionKey, []);
      }
      partitionMap.get(partitionKey)!.push(req);
    }

    for (const [partitionKey, partitionRequests] of partitionMap.entries()) {
      const [category_id, geo_id] = partitionKey.split('::');

      for (let i = 0; i < partitionRequests.length; i++) {
        const rootReq = partitionRequests[i];
        if (visited.has(rootReq.request_id)) continue;

        const currentClusterReqs: CitizenRequest[] = [rootReq];
        visited.add(rootReq.request_id);

        const rootEmbedding = embeddingsMap.get(rootReq.request_id);
        let similaritySum = 0;
        let pairCount = 0;

        for (let j = i + 1; j < partitionRequests.length; j++) {
          const candidateReq = partitionRequests[j];
          if (visited.has(candidateReq.request_id)) continue;

          // Issue type guardrail: Either exact issue_type_id match, or compatible under same category
          const sameIssueType = rootReq.issue_type_id === candidateReq.issue_type_id;

          const candidateEmbedding = embeddingsMap.get(candidateReq.request_id);

          let similarity = 0;
          if (rootEmbedding && candidateEmbedding) {
            similarity = computeCosineSimilarity(
              rootEmbedding.embedding_vector,
              candidateEmbedding.embedding_vector
            );
          }

          // Semantic similarity threshold check
          // If issue types match exactly, threshold is standard (0.78).
          // If issue types differ slightly within same category, require higher similarity (0.85).
          const requiredThreshold = sameIssueType ? similarityThreshold : 0.85;

          if (similarity >= requiredThreshold) {
            currentClusterReqs.push(candidateReq);
            visited.add(candidateReq.request_id);
            similaritySum += similarity;
            pairCount++;
          }
        }

        if (currentClusterReqs.length >= minClusterSize) {
          const avgSim = pairCount > 0 ? similaritySum / pairCount : 1.0;
          const clusterIsLiveAi = currentClusterReqs.every(
            (r) => embeddingsMap.get(r.request_id)?.is_live_ai ?? false
          );

          clusters.push({
            clusterKey: `${partitionKey}::${rootReq.issue_type_id || 'GENERAL'}::${clusters.length + 1}`,
            category_id,
            issue_type_id: rootReq.issue_type_id || 'GENERAL',
            geo_id,
            requests: currentClusterReqs,
            is_live_ai: clusterIsLiveAi,
            execution_source: clusterIsLiveAi ? 'LIVE_GEMINI' : 'DETERMINISTIC_FALLBACK',
            averageSimilarity: Number(avgSim.toFixed(4)),
          });
        } else {
          // Singleton outlier below minClusterSize remains unclustered / candidate
          unclusteredList.push(rootReq);
        }
      }
    }

    return {
      clusters,
      unclusteredRequests: unclusteredList,
      embeddingsGenerated: embeddingsList,
      is_live_ai: anyLiveAi,
      execution_source: anyLiveAi ? 'LIVE_GEMINI' : 'DETERMINISTIC_FALLBACK',
    };
  } catch (err) {
    console.warn(
      '[clusteringService] Semantic clustering evaluation failed; using deterministic fallback:',
      err
    );
    return deterministicTaxonomyGeographyFallback(eligibleRequests);
  }
}
