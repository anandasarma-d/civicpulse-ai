import { Router, Request, Response, NextFunction } from 'express';
import { gapAssessmentRepository } from '../../repositories/GapAssessmentRepository';
import { issueClusterRepository } from '../../repositories/IssueClusterRepository';
import { geographyRepository } from '../../repositories/GeographyRepository';
import {
  assessGapForCluster,
  computeGapFactorsForCluster,
} from '../../services/decision_intelligence/gapAssessmentService';
import {
  computeDeterministicPriorityScore,
  CALCULATION_VERSION,
} from '../../services/decision_intelligence/priorityEngine';
import { explainPriorityScore } from '../../services/decision_intelligence/priorityExplanationService';
import { recommendationIdForGap } from '../../services/recommendations/recommendationService';
import { GapAssessmentRecord } from '../../models/GapAssessmentTypes';

export const gapsRouter = Router();

// In-memory cache for assessed gaps so subsequent reads are instant and stable
const gapCache = new Map<string, GapAssessmentRecord>();

/**
 * Builds or retrieves the complete GapAssessmentRecord for a cluster/gap.
 * Strictly uses canonical GAP-XXXX IDs per Doc 04 §3 ID specification.
 */
async function getOrBuildGapRecord(
  gapId: string,
  targetClusterId?: string
): Promise<GapAssessmentRecord | null> {
  if (gapCache.has(gapId)) {
    return gapCache.get(gapId)!;
  }

  // Find stored seed gap assessment if present
  const seedGap = await gapAssessmentRepository.getById(gapId);
  const clusterIdToUse = targetClusterId || seedGap?.cluster_id;
  if (!clusterIdToUse) {
    return null;
  }
  const cluster = await issueClusterRepository.getById(clusterIdToUse);

  if (!cluster) {
    return null;
  }

  const rank = gapId === 'GAP-0001' ? 1 : 2;
  const gapRecord = await assessGapForCluster(cluster, gapId, rank);

  gapCache.set(gapId, gapRecord);

  return gapRecord;
}

/**
 * Pre-populates cache on startup or initial call with hero gaps
 */
async function ensureHeroGapsLoaded(): Promise<GapAssessmentRecord[]> {
  const gap1 = await getOrBuildGapRecord('GAP-0001', 'CLU-0001');
  const gap2 = await getOrBuildGapRecord('GAP-0002', 'CLU-0002');
  const results: GapAssessmentRecord[] = [];
  if (gap1) results.push(gap1);
  if (gap2) results.push(gap2);
  return results;
}

/**
 * GET /api/v1/gaps (Doc 14 §9)
 * List gaps, priority-descending with gap_id tie-break.
 * Supports filters: category_id, geo_id, priority_band.
 */
gapsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category_id, geo_id, priority_band } = req.query;

    let gaps = await ensureHeroGapsLoaded();

    // Also include any other clusters not yet assessed
    const allClusters = await issueClusterRepository.list();
    for (const cluster of allClusters) {
      if (cluster.cluster_id === 'CLU-001' || cluster.cluster_id === 'CLU-002') continue; // Aliases
      const matchingGap = gaps.find((g) => g.cluster_id === cluster.cluster_id);
      if (!matchingGap) {
        const nextId = `GAP-${String(gaps.length + 1).padStart(4, '0')}`;
        const newGap = await assessGapForCluster(cluster, nextId, gaps.length + 1);
        gapCache.set(nextId, newGap);
        gaps.push(newGap);
      }
    }

    // Apply filters
    if (category_id && typeof category_id === 'string') {
      gaps = gaps.filter((g) => g.category_id.toUpperCase() === category_id.toUpperCase());
    }
    if (geo_id && typeof geo_id === 'string') {
      gaps = gaps.filter((g) => g.geo_id === geo_id);
    }
    if (priority_band && typeof priority_band === 'string') {
      gaps = gaps.filter(
        (g) => g.priority.priority_band.toUpperCase() === priority_band.toUpperCase()
      );
    }

    // Sort priority-descending with gap_id tie-break
    gaps.sort((a, b) => {
      if (b.priority.priority_score !== a.priority.priority_score) {
        return b.priority.priority_score - a.priority.priority_score;
      }
      return a.gap_id.localeCompare(b.gap_id);
    });

    // Reassign ranks based on sorted order
    gaps = gaps.map((g, idx) => ({
      ...g,
      priority: {
        ...g.priority,
        rank: idx + 1,
      },
    }));

    res.status(200).json({
      items: gaps,
      total: gaps.length,
      limit: gaps.length,
      offset: 0,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/gaps/:gap_id (Doc 14 §10)
 * Retrieve a specific gap assessment with complete factor breakdown,
 * deterministic priority calculation, and AI Contract D priority explanation.
 */
gapsRouter.get('/:gap_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gapId = req.params.gap_id;

    // Strict Doc 04 §3 canonical ID enforcement (GAP-XXXX with 4 digits)
    if (!/^GAP-\d{4}$/.test(gapId)) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `GapAssessment with id '${gapId}' not found. IDs must conform to canonical GAP-XXXX format (Doc 04 §3).`,
          details: [],
          correlation_id: req.headers['x-correlation-id'] || 'system',
        },
      });
      return;
    }

    const gapRecord = await getOrBuildGapRecord(gapId);

    if (!gapRecord) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `GapAssessment with id '${gapId}' not found`,
          details: [],
          correlation_id: req.headers['x-correlation-id'] || 'system',
        },
      });
      return;
    }

    const recommendation_id = await recommendationIdForGap(gapId);
    const responseRecord = { ...gapRecord, recommendation_id };

    // Format response matching Doc 14 §10 response shape
    res.status(200).json(responseRecord);
  } catch (err) {
    next(err);
  }
});

export default gapsRouter;
