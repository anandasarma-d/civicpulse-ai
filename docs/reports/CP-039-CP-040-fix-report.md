# CP-039 / CP-040 Fix Report

**Date:** 25 September 2026  
**Scope:** Narrow targeted pass only. No RICE-08 / Contract E work. No README updates. No other orientation CP items.  
**Status:** COMPLETE

| ID | Title | Outcome |
|---|---|---|
| **CP-039** | Cluster-side ID aliasing | Fixed. Canonical `CLU-XXXX` only. `CLU-001` → 404. |
| **CP-040** | Hero gap factors: hardcoded or generic? | Special-cased (path b). Documented in code. Frozen scores preserved. |

---

## CP-039 — Cluster-side ID aliasing

`backend/api/routes/gaps.ts` already enforced canonical 4-digit IDs (`GET /api/v1/gaps/GAP-001` → 404). The clusters route did not: `data/seed/issue_clusters.json` had both `CLU-0001`/`CLU-0002` and 3-digit alias rows `CLU-001`/`CLU-002`, and `clusters.ts` resolved aliases via `findClusterWithAlias`.

### What changed

1. Removed `findClusterWithAlias` from `backend/api/routes/clusters.ts`.
2. Enforced `/^CLU-\d{4}$/` on `GET /api/v1/clusters/:cluster_id`. Non-canonical IDs return 404 with the Doc 04 §3 message.
3. Removed the alias-only representative-request fallback (`cluster_id !== clusterId`).
4. Removed 3-digit alias rows from `data/seed/issue_clusters.json`. Seed now contains only `CLU-0001` and `CLU-0002`.
5. Updated `tests/unit/dataIntegrity.test.ts` to look up `CLU-0001` instead of `CLU-001`.
6. Added clusters integration Test 4b: `GET /api/v1/clusters/CLU-001` must return 404.

---

## CP-040 — Hero gap factors: hardcoded or generically derived?

**Verdict: special-cased by `cluster_id`. Path (b).**

`computeGapFactorsForCluster` does run generic joins against `DemographicProfile`, `InfrastructureProfile`, and `ProjectInvestment`. After those joins, it **returns pinned literals** when `cluster_id === 'CLU-0001'` or `'CLU-0002'`.

A generic join against current seed **cannot** produce the frozen scores. This is not floating-point drift.

### CLU-0001 / GAP-0001

| Factor | Generic from current seed | Pinned | Seed source |
|---|---|---|---|
| demand | 0.96 | 0.96 | `IssueCluster.request_count` 20 |
| population | 0.842 | 0.842 | `DemographicProfile.population` 84200 (`GEO-LOC-BLR-01`) |
| infra | **0.53** | **0.94** | WATER audit avg(48.5, 52, 42) → deficit 53 |
| urgency | **0.80** | **0.92** | cluster severity 4 + urgency 4 |
| investment | 1.00 | 1.00 | no `ProjectInvestment` for `(GEO-LOC-BLR-01, WATER)` |
| equity | **0.45** | **0.77** | `vulnerability_index` 0.45, not 0.77 |
| **score** | **80.5** | **92.1** | |

### CLU-0002 / GAP-0002

Both hero clusters have `request_count` 20, so a generic demand rule cannot yield 0.96 and 0.65 at the same time.

| Factor | Generic from current seed | Pinned |
|---|---|---|
| demand | 0.96 | **0.65** |
| population | 0.725 | 0.725 |
| infra | **0.28** (100 − avg(82, 65, 70)) | **0.48** |
| urgency | **0.70** ((3+4)/10) | **0.60** |
| investment | 0.20 (ACTIVE `INV-BLR-001`) | 0.20 |
| equity | **0.35** | **0.40** |
| **score** | **63.2** | **56.6** |

### Why path (b)

Path (a) — replace the override with a genuine generic computation that still lands on 92.1 / 56.6 given **current** seed — is not possible without rewriting `DemographicProfile`, `InfrastructureProfile`, and/or cluster seed fields. That was out of scope for this pass.

What was done instead:

- Left the hero overrides in place so frozen scores stay 92.1 / 56.6.
- Removed dead `CLU-001` / `CLU-002` branches (aliases deleted by CP-039).
- Documented the mismatch in an explicit comment on the function (not silent).
- Gemini is still never invoked for the numeric score. Pinned normalized inputs are fed to `computeDeterministicPriorityScore`.

---

## Git diff

`backend/services/decision_intelligence/gapAssessmentService.ts` is **untracked** (RICE-07 work never committed), so `git diff` does not include it. The post-fix function body is in the next section. Tracked diffs:

### `backend/api/routes/clusters.ts`

```diff
diff --git a/backend/api/routes/clusters.ts b/backend/api/routes/clusters.ts
index f3e3d39..c6f8cfd 100644
--- a/backend/api/routes/clusters.ts
+++ b/backend/api/routes/clusters.ts
@@ -6,37 +6,12 @@ import { infrastructureProfileRepository } from '../../repositories/Infrastructu
 import { projectInvestmentRepository } from '../../repositories/ProjectInvestmentRepository';
 import { mediaEvidenceRepository } from '../../repositories/MediaEvidenceRepository';
 import { runClusteringPipeline } from '../../services/clustering/clusteringPipeline';
-import { IssueCluster } from '../../models/IssueCluster';
 import { CitizenRequest } from '../../models/CitizenRequest';
 import { InfrastructureProfile } from '../../models/InfrastructureProfile';
 import { ProjectInvestment } from '../../models/ProjectInvestment';
 
 export const clustersRouter = Router();
 
-/**
- * Normalizes cluster ID lookup to support both CLU-0001 and CLU-001 aliases
- */
-async function findClusterWithAlias(id: string): Promise<IssueCluster | null> {
-  let cluster = await issueClusterRepository.getById(id);
-  if (cluster) return cluster;
-
-  // Try padded or unpadded alias
-  if (id === 'CLU-0001') {
-    cluster = await issueClusterRepository.getById('CLU-001');
-  } else if (id === 'CLU-001') {
-    cluster = await issueClusterRepository.getById('CLU-0001');
-  } else if (id.startsWith('CLU-')) {
-    const numPart = id.replace('CLU-', '');
-    const num = parseInt(numPart, 10);
-    if (!isNaN(num)) {
-      const padded = `CLU-${String(num).padStart(4, '0')}`;
-      const unpadded = `CLU-${String(num).padStart(3, '0')}`;
-      cluster = (await issueClusterRepository.getById(padded)) || (await issueClusterRepository.getById(unpadded));
-    }
-  }
-  return cluster;
-}
-
 /**
  * GET /api/v1/clusters
  * Doc 14 §7: List clusters, filterable by geo_id, category_id, issue_type_id.
@@ -103,7 +78,21 @@ clustersRouter.post('/run-pipeline', async (_req: Request, res: Response, next:
 clustersRouter.get('/:cluster_id', async (req: Request, res: Response, next: NextFunction) => {
   try {
     const clusterId = req.params.cluster_id;
-    const cluster = await findClusterWithAlias(clusterId);
+
+    // Strict Doc 04 §3 canonical ID enforcement (CLU-XXXX with 4 digits)
+    if (!/^CLU-\d{4}$/.test(clusterId)) {
+      res.status(404).json({
+        error: {
+          code: 'NOT_FOUND',
+          message: `IssueCluster with id '${clusterId}' not found. IDs must conform to canonical CLU-XXXX format (Doc 04 §3).`,
+          details: [],
+          correlation_id: req.headers['x-correlation-id'] || 'system',
+        },
+      });
+      return;
+    }
+
+    const cluster = await issueClusterRepository.getById(clusterId);
 
     if (!cluster) {
       res.status(404).json({
@@ -141,16 +130,6 @@ clustersRouter.get('/:cluster_id', async (req: Request, res: Response, next: Nex
         ...r,
         cluster_id: cluster.cluster_id,
       }));
-      if (representative_requests.length === 0 && cluster.cluster_id !== clusterId) {
-        const altFallback = await citizenRequestRepository.list({
-          cluster_id: clusterId,
-          limit: 5,
-        });
-        representative_requests = altFallback.map((r) => ({
-          ...r,
-          cluster_id: cluster.cluster_id,
-        }));
-      }
     }
```

### `data/seed/issue_clusters.json`

```diff
diff --git a/data/seed/issue_clusters.json b/data/seed/issue_clusters.json
index abf408a..9ee9f82 100644
--- a/data/seed/issue_clusters.json
+++ b/data/seed/issue_clusters.json
@@ -25,32 +25,6 @@
     "execution_source": "LIVE_GEMINI",
     "clustering_version": "v1.0"
   },
-  {
-    "cluster_id": "CLU-001",
-    "canonical_issue": "Drinking water shortage and distribution feeder line disruption in Bellandur",
-    "category_id": "WATER",
-    "issue_type_id": "DRINKING_WATER_SHORTAGE",
-    "geo_id": "GEO-LOC-BLR-01",
-    "request_count": 20,
-    "unique_local_units": 1,
-    "affected_population": 84200,
-    "severity": 4,
-    "urgency": 4,
-    "trend_score": 0.78,
-    "trend": "RISING",
-    "investment_alignment_score": 0.15,
-    "representative_request_ids": [
-      "REQ-TS-000101",
-      "REQ-KA-0001",
-      "REQ-KA-0002"
-    ],
-    "cluster_confidence": 0.93,
-    "created_at": "2024-03-10T08:00:00Z",
-    "updated_at": "2024-03-20T14:30:00Z",
-    "is_live_ai": true,
-    "execution_source": "LIVE_GEMINI",
-    "clustering_version": "v1.0"
-  },
   {
     "cluster_id": "CLU-0002",
     "canonical_issue": "Severe pavement degradation and deep potholes on HSR Sector main corridor",
@@ -76,31 +50,5 @@
     "is_live_ai": true,
     "execution_source": "LIVE_GEMINI",
     "clustering_version": "v1.0"
-  },
-  {
-    "cluster_id": "CLU-002",
-    "canonical_issue": "Severe pavement degradation and deep potholes on HSR Sector main corridor",
-    "category_id": "ROADS",
-    "issue_type_id": "POTHOLE",
-    "geo_id": "GEO-LOC-BLR-02",
-    "request_count": 20,
-    "unique_local_units": 1,
-    "affected_population": 72500,
-    "severity": 3,
-    "urgency": 4,
-    "trend_score": 0.45,
-    "trend": "STABLE",
-    "investment_alignment_score": 0.85,
-    "representative_request_ids": [
-      "REQ-KA-0004",
-      "REQ-KA-0012",
-      "REQ-KA-0020"
-    ],
-    "cluster_confidence": 0.88,
-    "created_at": "2024-03-12T09:15:00Z",
-    "updated_at": "2024-03-21T11:00:00Z",
-    "is_live_ai": true,
-    "execution_source": "LIVE_GEMINI",
-    "clustering_version": "v1.0"
   }
 ]
```

### `tests/unit/dataIntegrity.test.ts`

```diff
diff --git a/tests/unit/dataIntegrity.test.ts b/tests/unit/dataIntegrity.test.ts
index 57ca5ae..b216e71 100644
--- a/tests/unit/dataIntegrity.test.ts
+++ b/tests/unit/dataIntegrity.test.ts
@@ -79,8 +79,8 @@ async function runUnitTests() {
 
   // Test 4: IssueClusterRepository operations
   console.log('Test 4: IssueClusterRepository getById & list');
-  const cluster = await issueClusterRepository.getById('CLU-001');
-  assert(cluster !== null, 'Should find CLU-001');
+  const cluster = await issueClusterRepository.getById('CLU-0001');
+  assert(cluster !== null, 'Should find CLU-0001');
   assert.strictEqual(cluster.category_id, 'WATER');
```

### `tests/integration/clustersEndpoints.test.ts`

```diff
diff --git a/tests/integration/clustersEndpoints.test.ts b/tests/integration/clustersEndpoints.test.ts
index ee66af1..fc0505e 100644
--- a/tests/integration/clustersEndpoints.test.ts
+++ b/tests/integration/clustersEndpoints.test.ts
@@ -84,6 +84,13 @@ async function runTests() {
   );
   console.log('✔ Project Investment context returns matching investment projects when present');
 
+  // Test 4b: Verify non-canonical 3-digit ID (CLU-001) returns 404 (CP-039)
+  console.log('Test 4b: GET /api/v1/clusters/CLU-001 returns 404 (strictly canonical Doc 04 §3 CLU-XXXX)...');
+  const nonCanonRes = await request(app).get('/api/v1/clusters/CLU-001');
+  assert.strictEqual(nonCanonRes.status, 404, '3-digit ID CLU-001 must return 404 NOT_FOUND');
+  assert.strictEqual(nonCanonRes.body.error.code, 'NOT_FOUND');
+  console.log('✔ 3-digit non-canonical ID correctly rejected with 404');
+
   // Test 5: 404 for non-existent cluster
   console.log('Test 5: GET /api/v1/clusters/NON_EXISTENT_ID...');
   const notFoundRes = await request(app).get('/api/v1/clusters/CLU-9999').expect(404);
```

---

## Complete `computeGapFactorsForCluster` (post-fix)

Joins called:

- `demographicProfileRepository.getByGeoId(geo_id)`
- `infrastructureProfileRepository.getByGeoAndCategory(geo_id, category_id)`
- `projectInvestmentRepository.listByGeoAndCategory(geo_id, category_id)`

Those joins run for every cluster. For the two hero IDs the return value discards most of that result and substitutes literals.

```typescript
export async function computeGapFactorsForCluster(
  cluster: IssueCluster
): Promise<FactorComputationResult> {
  const geo_id = cluster.geo_id;
  const category_id = cluster.category_id;

  // 1. Demographic Profile Join
  const demoProfile = await demographicProfileRepository.getByGeoId(geo_id);
  const population = demoProfile?.population || cluster.affected_population || 50000;
  const vulnerabilityIndex = demoProfile?.vulnerability_index ?? 0.45;

  // 2. Infrastructure Profile Join
  const infraProfile = await infrastructureProfileRepository.getByGeoAndCategory(
    geo_id,
    category_id
  );
  let infraDeficiencyRaw = 75; // Default percentage if no audit row
  if (infraProfile) {
    const scores = [
      infraProfile.coverage_score,
      infraProfile.quality_score,
      infraProfile.service_reliability,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    infraDeficiencyRaw = Math.max(0, Math.min(100, Math.round(100 - avgScore)));
  }

  // 3. Project Investment Join (Doc 06 §14, Doc 13 §14)
  // Missing investment data must be represented as UNKNOWN, never zero.
  const investments = await projectInvestmentRepository.listByGeoAndCategory(
    geo_id,
    category_id
  );
  let investment_status: 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'UNKNOWN' = 'UNKNOWN';
  let investment_project_name: string | null = null;
  let investmentGapNormalized = 1.0; // Total gap if no investment (UNKNOWN)

  if (investments && investments.length > 0) {
    const primary = investments[0];
    investment_status = primary.status;
    investment_project_name = primary.project_name;

    if (primary.status === 'ACTIVE') {
      // Strong active investment moderates the gap substantially (Doc 15 §11)
      investmentGapNormalized = 0.20;
    } else if (primary.status === 'PLANNED') {
      investmentGapNormalized = 0.50;
    } else if (primary.status === 'COMPLETED') {
      investmentGapNormalized = 0.70; // May need follow-up
    }
  } else {
    investment_status = 'UNKNOWN';
    investmentGapNormalized = 1.00; // No capital works in registry
  }

  // 4. Citizen Demand Factor
  // Raw: request count. Hero scenario has 20 requests
  const demandRaw = cluster.request_count;
  // Normalized: 20+ requests -> 0.96 for hero cluster, otherwise ratio
  const demandNorm = Math.min(1.0, Math.max(0.1, demandRaw >= 20 ? 0.96 : demandRaw / 20));

  // 5. Population Affected Factor
  // Normalized against 100,000 ward population ceiling
  const popNorm = Math.min(1.0, Math.max(0.1, Math.round((population / 100000) * 1000) / 1000));

  // 6. Infrastructure Gap Factor
  const infraNorm = Math.min(1.0, Math.max(0.0, infraDeficiencyRaw / 100));

  // 7. Urgency / Severity Factor
  // Aggregated from cluster severity (1-5) and urgency (1-5)
  const urgencyRaw = Math.round(((cluster.severity + cluster.urgency) / 10) * 100);
  const urgencyNorm = urgencyRaw / 100;

  // 8. Equity Need Factor
  const equityRaw = Math.round(vulnerabilityIndex * 100);
  const equityNorm = vulnerabilityIndex;

  // CP-040: Frozen hero factors are SPECIAL-CASED by cluster_id, not derived from the
  // generic joins above. A generic join against current seed does not reproduce the
  // locked 92.1 / 56.6 scores. This is not floating-point drift — the pinned literals
  // differ from the joined seed on multiple factors:
  //
  // CLU-0001 / GAP-0001 (pinned → 92.1):
  //   generic from seed: demand 0.96, pop 0.842, infra ~0.53 (100-avg(48.5,52,42)=53),
  //   urgency 0.80 ((4+4)/10), investment 1.00 (no ProjectInvestment row),
  //   equity 0.45 (DemographicProfile.vulnerability_index for GEO-LOC-BLR-01).
  //   generic weighted sum → 80.5, not 92.1.
  //   pinned overrides: infra 0.94, urgency 0.92, equity 0.77.
  //
  // CLU-0002 / GAP-0002 (pinned → 56.6):
  //   generic from seed: demand 0.96 (request_count 20), pop 0.725,
  //   infra ~0.28 (100-avg(82,65,70)=28), urgency 0.70 ((3+4)/10),
  //   investment 0.20 (ACTIVE INV-BLR-001), equity 0.35.
  //   generic weighted sum → 63.2, not 56.6.
  //   pinned overrides: demand 0.65, infra 0.48, urgency 0.60, equity 0.40.
  //
  // Replacing this with the generic path would break the frozen hero scores.
  // Changing DemographicProfile / InfrastructureProfile / cluster seed fields to
  // make a generic path land on 92.1/56.6 is out of scope for this pass.
  // Gemini is still never invoked for the numeric score — only these pinned
  // normalized inputs are fed to computeDeterministicPriorityScore.
  if (cluster.cluster_id === 'CLU-0001') {
    return {
      raw: {
        citizen_demand: 20,
        population_affected: population, // 84,200 from DemographicProfile
        infrastructure_gap: 94,
        urgency_severity: 92,
        investment_gap: 100,
        equity_need: 77,
      },
      normalized: {
        citizen_demand: 0.96, // 0.30 * 0.96 = 0.288
        population_affected: 0.842, // 0.20 * 0.842 = 0.1684
        infrastructure_gap: 0.94, // 0.20 * 0.94 = 0.188
        urgency_severity: 0.92, // 0.15 * 0.92 = 0.138
        investment_gap: 1.00, // 0.10 * 1.00 = 0.100
        equity_need: 0.77, // 0.05 * 0.77 = 0.0385 → sum 0.9209 → 92.1
      },
      investment_status: 'UNKNOWN',
      investment_project_name: null,
    };
  }

  if (cluster.cluster_id === 'CLU-0002') {
    return {
      raw: {
        citizen_demand: 20,
        population_affected: population, // 72,500 from DemographicProfile
        infrastructure_gap: 48,
        urgency_severity: 65,
        investment_gap: 20, // ACTIVE INV-BLR-001
        equity_need: 40,
      },
      normalized: {
        citizen_demand: 0.65,
        population_affected: 0.725,
        infrastructure_gap: 0.48,
        urgency_severity: 0.60,
        investment_gap: 0.20,
        equity_need: 0.40,
      },
      investment_status: 'ACTIVE',
      investment_project_name: 'HSR 27th Main Asphalting & Pedestrian Pathway Project',
    };
  }

  return {
    raw: {
      citizen_demand: demandRaw,
      population_affected: population,
      infrastructure_gap: infraDeficiencyRaw,
      urgency_severity: urgencyRaw,
      investment_gap: Math.round(investmentGapNormalized * 100),
      equity_need: equityRaw,
    },
    normalized: {
      citizen_demand: demandNorm,
      population_affected: popNorm,
      infrastructure_gap: infraNorm,
      urgency_severity: urgencyNorm,
      investment_gap: investmentGapNormalized,
      equity_need: equityNorm,
    },
    investment_status,
    investment_project_name,
  };
}
```

### Seed records the generic path actually reads

`data/seed/demographic_profiles.json` (`GEO-LOC-BLR-01`):

```json
{
  "geo_id": "GEO-LOC-BLR-01",
  "population": 84200,
  "vulnerability_index": 0.45
}
```

`data/seed/infrastructure_profiles.json` (`GEO-LOC-BLR-01` / `WATER`):

```json
{
  "geo_id": "GEO-LOC-BLR-01",
  "category_id": "WATER",
  "coverage_score": 48.5,
  "quality_score": 52.0,
  "service_reliability": 42.0
}
```

No `ProjectInvestment` row exists for `(GEO-LOC-BLR-01, WATER)`.

---

## Raw `npm test` output

Command: `npm test`  
**Exit code: 0.** All 11 suites passed.

Gemini calls in this run returned 403 (`SERVICE_DISABLED` / `API_KEY_SERVICE_BLOCKED`) and fell back to deterministic paths. No suite failed.

```
> civicpulse-ai@0.1.0 test
> tsx tests/unit/dataIntegrity.test.ts && tsx tests/unit/requestUnderstanding.test.ts && tsx tests/integration/requestsEndpoints.test.ts && tsx tests/unit/aiEvaluation.test.ts && tsx tests/integration/rice05Multimodal.test.ts && tsx tests/unit/clustering.test.ts && tsx tests/integration/clustersEndpoints.test.ts && tsx tests/ai_eval/clusteringEvaluation.ts && tsx tests/unit/priorityEngine.test.ts && tsx tests/integration/gapsEndpoints.test.ts && tsx tests/ai_eval/decisionIntelligenceEvaluation.ts

Running unit tests for RICE-03 Data Model & Repositories...

Test 1: validateDataIntegrity()
PASS — All integrity constraints and specification rules validated with 0 errors.
✔ Test 1 passed
✔ Test 2 passed
✔ Test 3 passed
✔ Test 4 passed
✔ Test 5 passed
All unit tests passed successfully!

=== Running AI Contract A (Request Understanding) Unit Tests ===
All AI Contract A unit tests PASSED successfully!

=== Running CivicPulse AI RICE-04 Requests Endpoint Integration Tests ===
All RICE-04 integration tests PASSED successfully!

=== Running CivicPulse AI RICE-05 AI Evaluation Test Set (Doc 06 §19, Doc 07 §10) ===
Summary: 13/13 passed (0 failed).
✔ All AI Evaluation and Contract B verification tests passed successfully!

=== Running CivicPulse AI RICE-05 Voice & Multimodal Integration Tests ===
All RICE-05 integration tests PASSED successfully!

=== Starting CivicPulse AI Clustering Unit Tests ===
All clustering unit tests PASSED successfully!

=== Starting CivicPulse AI Clusters API Integration Tests (Doc 14 §7 & §8) ===
✔ GET /api/v1/clusters returned 2 clusters with execution-tracking metadata
✔ Filtered cluster query returned 1 WATER clusters
✔ Physical Infrastructure context populated directly from seed audit data
✔ Project Investment context correctly returns {"status": "UNKNOWN"} when no row exists
✔ Execution tracking verified: is_live_ai=true, source=LIVE_GEMINI
✔ Project Investment context returns matching investment projects when present
Test 4b: GET /api/v1/clusters/CLU-001 returns 404 (strictly canonical Doc 04 §3 CLU-XXXX)...
{"method":"GET","path":"/api/v1/clusters/CLU-001","status_code":404,...}
✔ 3-digit non-canonical ID correctly rejected with 404
✔ Returns 404 with standard ErrorResponse envelope for non-existent cluster
All Cluster API integration tests PASSED successfully!

=== Running CivicPulse AI Clustering Evaluation Suite (Doc 15 §10) ===
[PASS] CLU-EVAL-01: Direct vs Passive English phrasing of pipeline rupture in Ward 150 Bellandur
[PASS] CLU-EVAL-02: Multilingual reports (English, Kannada, Hindi) of drinking water crisis in same ward
[PASS] CLU-EVAL-03: Identical text complaint in Bellandur (BLR) vs distant Mysuru (MYS) district (Guardrails prevented false merge)
[PASS] CLU-EVAL-04: Roads pothole vs Water pipeline failure in the same ward (GEO-LOC-BLR-01) (Guardrails prevented false merge)
[PASS] CLU-EVAL-05: Vague complaint missing geo_id remains unclustered candidate (Correctly left unclustered)
Positive Grouping Recall / Precision : 100.0% (2/2)
False-Merge Rate on Negative Pairs    : 0.0% (Must be 0.0%)
Unclustered Handling Accuracy         : 100.0% (1/1)

=== Starting CivicPulse AI Priority Engine Unit Tests (Doc 15 §5) ===
✔ Worked example arithmetic strictly matches 30/20/20/15/10/5 formula (Score: 89.2, Band: HIGH)
  Hero Score: 92.1
✔ Frozen hero priority_score 92.1 and rank 1 confirmed (with equity_need = 0.77)
All Priority Engine unit tests PASSED successfully!

=== Starting CivicPulse AI Gaps & Priority API Integration Tests (Doc 14 §9 & §10) ===
  ✔ Returned 2 gaps correctly sorted priority-descending
  ✔ Category filtering works correctly
  ✔ Hand-computed formula recomputed from stored factors equals exactly 92.1
  ✔ Hero gap response conforms completely to Doc 13 §9 and Doc 14 §10
  ✔ Rank #2 Gap (GAP-0002) returned with correct priority (56.6, MEDIUM)
  ✔ 3-digit non-canonical ID correctly rejected with 404
All Gaps API integration tests PASSED successfully!

=== Starting CivicPulse AI Decision Intelligence Scenarios (Doc 15 §11) ===
  ✔ Scenario A passed: Score = 92.1 (CRITICAL)
  ✔ Scenario B passed: Score = 56.6 (MEDIUM)
  ✔ Scenario C passed: Missing investment handled as UNKNOWN with 1.00 gap, strictly avoiding false zero
All Doc 15 §11 Decision Intelligence scenarios PASSED successfully!

===== EXIT CODE: 0 =====
```

---

## Fresh GET evidence

Captured via `supertest` against `backend/app.ts` after the fix (25 Sep 2026).

### `GET /api/v1/clusters/CLU-001` — HTTP 404

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "IssueCluster with id 'CLU-001' not found. IDs must conform to canonical CLU-XXXX format (Doc 04 §3).",
    "details": [],
    "correlation_id": "system"
  }
}
```

### `GET /api/v1/clusters/CLU-0001` — HTTP 200

```json
{
  "cluster_id": "CLU-0001",
  "canonical_issue": "Drinking water shortage and distribution feeder line disruption in Bellandur",
  "category_id": "WATER",
  "issue_type_id": "DRINKING_WATER_SHORTAGE",
  "geo_id": "GEO-LOC-BLR-01",
  "request_count": 20,
  "unique_local_units": 1,
  "affected_population": 84200,
  "severity": 4,
  "severity_score": 4,
  "urgency": 4,
  "urgency_score": 4,
  "trend": "RISING",
  "trend_score": 0.78,
  "investment_alignment_score": 0.15,
  "representative_request_ids": [
    "REQ-TS-000101",
    "REQ-KA-0001",
    "REQ-KA-0002"
  ],
  "cluster_confidence": 0.93,
  "geographies": [
    "GEO-LOC-BLR-01"
  ],
  "representative_requests": [
    {
      "request_id": "REQ-TS-000101",
      "created_at": "2024-03-04T08:00:00Z",
      "input_modality": "TEXT",
      "channel": "mobile",
      "language": "en",
      "raw_text": "Drinking water pipeline ruptured on main road Bellandur Ward 150, no water supply for 4 days for 500 houses.",
      "audio_uri": null,
      "photo_uri": null,
      "transcript": null,
      "category_id": "WATER",
      "issue_type_id": "PIPELINE_FAILURE",
      "issue_summary": "Drinking water pipeline ruptured in Bellandur Ward 150 causing severe drinking water shortage.",
      "severity": 4,
      "urgency": 5,
      "affected_service": "Municipal Potable Water Supply",
      "geo_id": "GEO-LOC-BLR-01",
      "latitude": 12.9304,
      "longitude": 77.6784,
      "ai_confidence": {
        "intent": 0.95,
        "location": 0.93,
        "category": 0.97,
        "issue_type": 0.95
      },
      "verification_status": "PENDING",
      "cluster_id": "CLU-0001",
      "status": "PROCESSED",
      "synthetic_flag": true
    },
    {
      "request_id": "REQ-KA-0001",
      "created_at": "2024-03-04T08:15:00Z",
      "input_modality": "PHOTO",
      "channel": "mobile",
      "language": "en",
      "raw_text": "Taps have been completely dry in Bellandur Green Glen Layout for the past 48 hours. Families are struggling to procure drinking water.",
      "audio_uri": null,
      "photo_uri": "gs://civicpulse-bucket/photos/REQ-KA-0001.jpg",
      "transcript": null,
      "category_id": "WATER",
      "issue_type_id": "DRINKING_WATER_SHORTAGE",
      "issue_summary": "Severe potable water supply outage in Bellandur Green Glen Layout lasting over 48 hours.",
      "severity": 4,
      "urgency": 4,
      "affected_service": "Municipal Potable Water Supply",
      "geo_id": "GEO-LOC-BLR-01",
      "latitude": 12.9,
      "longitude": 77.5,
      "ai_confidence": {
        "intent": 0.94,
        "location": 0.91,
        "category": 0.96,
        "issue_type": 0.93
      },
      "verification_status": "PENDING",
      "cluster_id": "CLU-0001",
      "status": "PROCESSED",
      "synthetic_flag": true
    },
    {
      "request_id": "REQ-KA-0002",
      "created_at": "2024-03-05T09:30:00Z",
      "input_modality": "PHOTO",
      "channel": "mobile",
      "language": "en",
      "raw_text": "A major municipal underground water pipe has cracked near Bellandur Central Junction. Clean water is gushing onto the road and flooding the walkway.",
      "audio_uri": null,
      "photo_uri": "gs://civicpulse-bucket/photos/REQ-KA-0002.jpg",
      "transcript": null,
      "category_id": "WATER",
      "issue_type_id": "PIPELINE_FAILURE",
      "issue_summary": "Major drinking water trunk line fracture causing high-volume water loss and road flooding at Bellandur Central Junction.",
      "severity": 4,
      "urgency": 5,
      "affected_service": "Water Distribution Trunk Line",
      "geo_id": "GEO-LOC-BLR-01",
      "latitude": 12.935,
      "longitude": 77.555,
      "ai_confidence": {
        "intent": 0.94,
        "location": 0.91,
        "category": 0.96,
        "issue_type": 0.93
      },
      "verification_status": "PENDING",
      "cluster_id": "CLU-0001",
      "status": "PROCESSED",
      "synthetic_flag": true
    }
  ],
  "evidence_refs": [
    {
      "media_id": "MED-001",
      "request_id": "REQ-KA-0001",
      "media_type": "PHOTO",
      "storage_uri": "gs://civicpulse-bucket/photos/REQ-KA-0001.jpg"
    },
    {
      "media_id": "MED-REF-REQ-KA-0002",
      "request_id": "REQ-KA-0002",
      "media_type": "PHOTO",
      "storage_uri": "gs://civicpulse-bucket/photos/REQ-KA-0002.jpg",
      "observable_tags": [
        "PHOTO_EVIDENCE"
      ]
    }
  ],
  "infrastructure_context": {
    "geo_id": "GEO-LOC-BLR-01",
    "category_id": "WATER",
    "coverage_score": 48.5,
    "quality_score": 52,
    "capacity_score": 45,
    "facility_count": 2,
    "service_reliability": 42,
    "data_source": "Urban Water Board Audit 2023",
    "as_of_date": "2024-01-01",
    "synthetic_flag": true
  },
  "investment_context": {
    "status": "UNKNOWN"
  },
  "created_at": "2024-03-10T08:00:00Z",
  "updated_at": "2024-03-20T14:30:00Z",
  "is_live_ai": true,
  "execution_source": "LIVE_GEMINI",
  "clustering_version": "v1.0"
}
```

### `GET /api/v1/gaps/GAP-0001` — HTTP 200

Confirmed after the factor-computation change:

```
priority_score: 92.1
priority_band: CRITICAL
rank: 1
gap_id: GAP-0001
cluster_id: CLU-0001
factors.normalized: {
  "citizen_demand": 0.96,
  "population_affected": 0.842,
  "infrastructure_gap": 0.94,
  "urgency_severity": 0.92,
  "investment_gap": 1,
  "equity_need": 0.77
}
```

---

## Out of scope (not done)

- Path (a): rewriting seed so a generic join yields 92.1 / 56.6.
- RICE-08 / AI Contract E.
- README updates.
- Other orientation findings (request ID format, dual `/api/clusters` mount, `GAP-001` seed aliases, etc.).
