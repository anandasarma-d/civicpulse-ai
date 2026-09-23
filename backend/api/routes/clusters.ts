import { Router, Request, Response, NextFunction } from 'express';
import { issueClusterRepository } from '../../repositories/IssueClusterRepository';
import { citizenRequestRepository } from '../../repositories/CitizenRequestRepository';
import { geographyRepository } from '../../repositories/GeographyRepository';
import { infrastructureProfileRepository } from '../../repositories/InfrastructureProfileRepository';
import { projectInvestmentRepository } from '../../repositories/ProjectInvestmentRepository';
import { mediaEvidenceRepository } from '../../repositories/MediaEvidenceRepository';
import { runClusteringPipeline } from '../../services/clustering/clusteringPipeline';
import { IssueCluster } from '../../models/IssueCluster';
import { CitizenRequest } from '../../models/CitizenRequest';
import { InfrastructureProfile } from '../../models/InfrastructureProfile';
import { ProjectInvestment } from '../../models/ProjectInvestment';

export const clustersRouter = Router();

/**
 * Normalizes cluster ID lookup to support both CLU-0001 and CLU-001 aliases
 */
async function findClusterWithAlias(id: string): Promise<IssueCluster | null> {
  let cluster = await issueClusterRepository.getById(id);
  if (cluster) return cluster;

  // Try padded or unpadded alias
  if (id === 'CLU-0001') {
    cluster = await issueClusterRepository.getById('CLU-001');
  } else if (id === 'CLU-001') {
    cluster = await issueClusterRepository.getById('CLU-0001');
  } else if (id.startsWith('CLU-')) {
    const numPart = id.replace('CLU-', '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num)) {
      const padded = `CLU-${String(num).padStart(4, '0')}`;
      const unpadded = `CLU-${String(num).padStart(3, '0')}`;
      cluster = (await issueClusterRepository.getById(padded)) || (await issueClusterRepository.getById(unpadded));
    }
  }
  return cluster;
}

/**
 * GET /api/v1/clusters
 * Doc 14 §7: List clusters, filterable by geo_id, category_id, issue_type_id.
 * Paginated with stable deterministic ordering.
 */
clustersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { geo_id, category_id, issue_type_id } = req.query;
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit as string, 10)) : 20;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string, 10)) : 0;

    let clusters = await issueClusterRepository.list({
      geo_id: typeof geo_id === 'string' ? geo_id : undefined,
      category_id: typeof category_id === 'string' ? category_id : undefined,
      issue_type_id: typeof issue_type_id === 'string' ? issue_type_id : undefined,
    });

    // Stable deterministic ordering: signal level (request_count * severity) desc, request_count desc, cluster_id asc
    clusters.sort((a, b) => {
      const signalA = a.request_count * (a.severity || 1);
      const signalB = b.request_count * (b.severity || 1);
      if (signalB !== signalA) return signalB - signalA;
      if (b.request_count !== a.request_count) return b.request_count - a.request_count;
      return a.cluster_id.localeCompare(b.cluster_id);
    });

    const total = clusters.length;
    const paginatedItems = clusters.slice(offset, offset + limit);

    res.status(200).json({
      items: paginatedItems,
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/clusters/run-pipeline
 * Triggers the clustering pipeline
 */
clustersRouter.post('/run-pipeline', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runClusteringPipeline();
    res.status(200).json({
      status: 'SUCCESS',
      message: 'Clustering pipeline executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/clusters/:cluster_id
 * Doc 14 §8: Exact response shape with unique_local_units, severity, urgency, trend,
 * geographies, representative_requests, evidence_refs, infrastructure_context,
 * investment_context, and cluster_confidence.
 */
clustersRouter.get('/:cluster_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clusterId = req.params.cluster_id;
    const cluster = await findClusterWithAlias(clusterId);

    if (!cluster) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `IssueCluster with id '${clusterId}' not found`,
          details: [],
          correlation_id: req.headers['x-correlation-id'] || 'system',
        },
      });
      return;
    }

    // 1. Geographies (Doc 14 §8): Array of geo_id strings
    const geographies: string[] = [cluster.geo_id];

    // 2. Representative requests (Doc 14 §8): Ensure canonical cluster_id consistency
    let representative_requests: CitizenRequest[] = [];
    if (cluster.representative_request_ids && cluster.representative_request_ids.length > 0) {
      const fetched = await Promise.all(
        cluster.representative_request_ids.map((id) => citizenRequestRepository.getById(id))
      );
      representative_requests = (fetched.filter(Boolean) as CitizenRequest[]).map((r) => ({
        ...r,
        cluster_id: cluster.cluster_id,
      }));
    }
    // Fallback: If no representative IDs or missing, query by cluster_id
    if (representative_requests.length === 0) {
      const listFallback = await citizenRequestRepository.list({
        cluster_id: cluster.cluster_id,
        limit: 5,
      });
      representative_requests = listFallback.map((r) => ({
        ...r,
        cluster_id: cluster.cluster_id,
      }));
      if (representative_requests.length === 0 && cluster.cluster_id !== clusterId) {
        const altFallback = await citizenRequestRepository.list({
          cluster_id: clusterId,
          limit: 5,
        });
        representative_requests = altFallback.map((r) => ({
          ...r,
          cluster_id: cluster.cluster_id,
        }));
      }
    }

    // 3. Evidence references from member requests
    const evidence_refs: Array<{
      media_id: string;
      request_id: string;
      media_type: string;
      storage_uri: string;
      observable_tags?: string[];
    }> = [];

    for (const reqItem of representative_requests) {
      const mediaList = await mediaEvidenceRepository.list({ request_id: reqItem.request_id });
      for (const m of mediaList) {
        evidence_refs.push({
          media_id: m.media_id,
          request_id: m.request_id,
          media_type: m.media_type,
          storage_uri: m.storage_uri,
          observable_tags: m.observable_tags,
        });
      }
      if (reqItem.photo_uri && !mediaList.some((m) => m.storage_uri === reqItem.photo_uri)) {
        evidence_refs.push({
          media_id: `MED-REF-${reqItem.request_id}`,
          request_id: reqItem.request_id,
          media_type: 'PHOTO',
          storage_uri: reqItem.photo_uri,
          observable_tags: ['PHOTO_EVIDENCE'],
        });
      }
    }

    // 4. Infrastructure context (Doc 14 §8): Direct read from InfrastructureProfile table only.
    // Return "UNKNOWN" if no matching record exists; never fabricate a value.
    const infraRecord = await infrastructureProfileRepository.getByGeoAndCategory(
      cluster.geo_id,
      cluster.category_id
    );
    const infrastructure_context: InfrastructureProfile | 'UNKNOWN' = infraRecord
      ? infraRecord
      : 'UNKNOWN';

    // 5. Investment context (Doc 14 §8): Direct read from ProjectInvestment table only.
    // Must be an object: {"status": "UNKNOWN"} if no matching record exists; never fabricate a value.
    const investmentRecords = await projectInvestmentRepository.listByGeoAndCategory(
      cluster.geo_id,
      cluster.category_id
    );
    let investment_context: Record<string, any>;
    if (investmentRecords.length > 0) {
      const primary = investmentRecords[0];
      investment_context = {
        ...primary,
        status: primary.status,
        projects: investmentRecords,
      };
    } else {
      investment_context = { status: 'UNKNOWN' };
    }

    // Build Doc 14 §8 exact response shape
    const responsePayload = {
      cluster_id: cluster.cluster_id,
      canonical_issue: cluster.canonical_issue,
      category_id: cluster.category_id,
      issue_type_id: cluster.issue_type_id,
      geo_id: cluster.geo_id,
      request_count: cluster.request_count,
      unique_local_units: cluster.unique_local_units,
      affected_population: cluster.affected_population,
      severity: cluster.severity,
      severity_score: cluster.severity,
      urgency: cluster.urgency,
      urgency_score: cluster.urgency,
      trend: cluster.trend,
      trend_score: cluster.trend_score,
      investment_alignment_score: cluster.investment_alignment_score,
      representative_request_ids: cluster.representative_request_ids,
      cluster_confidence: cluster.cluster_confidence,
      geographies,
      representative_requests,
      evidence_refs,
      infrastructure_context,
      investment_context,
      created_at: cluster.created_at,
      updated_at: cluster.updated_at,
      is_live_ai: cluster.is_live_ai,
      execution_source: cluster.execution_source,
      clustering_version: cluster.clustering_version || 'v1.0',
    };

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
});

export default clustersRouter;
