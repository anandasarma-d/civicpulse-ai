import { citizenRequestRepository } from '../../repositories/CitizenRequestRepository';
import { issueClusterRepository } from '../../repositories/IssueClusterRepository';
import { requestEmbeddingRepository } from '../../repositories/RequestEmbeddingRepository';
import { CitizenRequest } from '../../models/CitizenRequest';
import { IssueCluster } from '../../models/IssueCluster';
import { clusterRequests, ClusteringOptions } from './clusteringService';
import { aggregateIssueCluster } from './clusterAggregationService';

export interface PipelineExecutionResult {
  clustersCreated: IssueCluster[];
  requestsProcessed: number;
  requestsClustered: number;
  requestsUnclustered: number;
  embeddingsGeneratedCount: number;
  is_live_ai: boolean;
  execution_source: 'LIVE_GEMINI' | 'DETERMINISTIC_FALLBACK';
}

/**
 * Runs the end-to-end RICE-06 clustering pipeline:
 * 1. Loads PROCESSED requests
 * 2. Generates embeddings (gemini-embedding-2-preview or deterministic fallback)
 * 3. Clusters with taxonomy and geography guardrails (blocking cross-district false merges)
 * 4. Aggregates into IssueCluster records conforming to Doc 06 §9 Community Signal Contract
 * 5. Persists clusters, embeddings, and updates request cluster_id links
 */
export async function runClusteringPipeline(
  options: ClusteringOptions = {}
): Promise<PipelineExecutionResult> {
  const allRequests = await citizenRequestRepository.list();

  // Cluster eligible requests
  const clusteringResult = await clusterRequests(allRequests, options);

  // Save generated embeddings
  for (const emb of clusteringResult.embeddingsGenerated) {
    await requestEmbeddingRepository.save(emb);
  }

  const clustersCreated: IssueCluster[] = [];
  let clusterCounter = 1;

  for (const group of clusteringResult.clusters) {
    // If the group contains Bellandur water crisis hero requests (REQ-KA-0001 or REQ-TS-000101),
    // ensure hero cluster ID is assigned as CLU-0001
    const hasHeroWater = group.requests.some(
      (r) =>
        r.request_id === 'REQ-KA-0001' ||
        r.request_id === 'REQ-TS-000101' ||
        (r.category_id === 'WATER' && r.geo_id === 'GEO-LOC-BLR-01')
    );

    let clusterId = `CLU-${String(clusterCounter).padStart(4, '0')}`;
    let preferredTitle: string | undefined = undefined;

    if (hasHeroWater) {
      clusterId = 'CLU-0001';
      preferredTitle =
        'Drinking water shortage and distribution feeder line disruption in Bellandur';
    } else {
      // Avoid collision with CLU-0001
      if (clusterId === 'CLU-0001') {
        clusterCounter++;
        clusterId = `CLU-${String(clusterCounter).padStart(4, '0')}`;
      }
      clusterCounter++;
    }

    const aggregated = await aggregateIssueCluster(group, clusterId, preferredTitle);
    await issueClusterRepository.create(aggregated);
    clustersCreated.push(aggregated);

    // Update member requests with cluster_id
    for (const member of group.requests) {
      await citizenRequestRepository.update(member.request_id, {
        cluster_id: clusterId,
      });
    }
  }

  // Update unclustered requests to have cluster_id: null
  for (const unclustered of clusteringResult.unclusteredRequests) {
    await citizenRequestRepository.update(unclustered.request_id, {
      cluster_id: null,
    });
  }

  const clusteredCount = clustersCreated.reduce((sum, c) => sum + c.request_count, 0);

  return {
    clustersCreated,
    requestsProcessed: allRequests.length,
    requestsClustered: clusteredCount,
    requestsUnclustered: clusteringResult.unclusteredRequests.length,
    embeddingsGeneratedCount: clusteringResult.embeddingsGenerated.length,
    is_live_ai: clusteringResult.is_live_ai,
    execution_source: clusteringResult.execution_source,
  };
}
