# RICE-09 Completion Report: BigQuery Persistence Migration

**Date**: 28 September 2026  
**Status**: DATASET LOADED; API SERVING FROM BIGQUERY  
**Spec**: Doc 16 §6 dataset `civicpulse_demo`; Doc 04 table DDL under `data/schemas/*.sql`  
**Project**: `civicpulse-ai-509417`

---

## 1. What landed

- Dataset name is **`civicpulse_demo`** (Doc 16 §6), location `us-central1`.
- Tables match Doc 04 DDL: `citizen_requests`, `issue_clusters`, `gap_assessments`, `recommendations`, `geographies`, `demographic_profiles`, `infrastructure_profiles`, `project_investments`.
- Loader: `npm run bq:load-seed` (`scripts/loadBigQuerySeed.ts`) reads `data/seed/*.json` and loads those columns only via NDJSON `WRITE_TRUNCATE` jobs.
- Repository read/write paths try BigQuery first, then **disclosed** `STATIC_JSON` fallback.
- Additive disclosure: body `data_source` and header `X-CivicPulse-Data-Source`.
- Priority engine / Gemini contracts were not changed.

BigQuery constraints applied during load (not silent API redesign):

- ARRAY columns cannot be `NOT NULL` (`representative_request_ids`, `caveats`, `evidence_refs`). Empty array is BigQuery’s null equivalent.
- Runtime writes use load-job `WRITE_APPEND` rather than `insertAll`, because streaming inserts fail with `Table is truncated` after a truncate load, and nested JSON objects are rejected as RECORDs (`score_breakdown` / `ai_confidence` must be JSON strings).

---

## 2. Required BigQuery row evidence — PRODUCED

```
$ npm run bq:load-seed
Dataset civicpulse-ai-509417.civicpulse_demo already exists
Loaded 15 rows into geographies
Loaded 12 rows into demographic_profiles
Loaded 16 rows into infrastructure_profiles
Loaded 6 rows into project_investments
Loaded 62 rows into citizen_requests
Loaded 2 rows into issue_clusters
Loaded 4 rows into gap_assessments
Loaded 0 rows into recommendations (empty seed)
dataset_version: v1.0.0-demo
generator_version: rice-09-seed-load
seed: data/seed
```

```
$ npm run bq:evidence
```

```json
[
  {
    "request_id": "REQ-TS-000101",
    "geo_id": "GEO-LOC-BLR-01",
    "category_id": "WATER",
    "issue_type_id": "PIPELINE_FAILURE",
    "cluster_id": "CLU-0001",
    "status": "PROCESSED"
  }
]
```

```json
[
  {
    "gap_id": "GAP-0001",
    "cluster_id": "CLU-0001",
    "priority_score": 92.1,
    "citizen_demand": 20,
    "population_affected": 84200,
    "infrastructure_gap": 94,
    "urgency_severity": 92,
    "investment_gap": 100,
    "equity_need": 77,
    "rank": 1
  }
]
```

Seed `gap_assessments` stores **raw** factor units (request count 20, population 84200, percents 94/92/100/77). The API still computes **normalized** 0.96 / 0.842 / 0.94 / 0.92 / 1.00 / 0.77 and score **92.1** in `priorityEngine` (Gemini never calculates the score).

---

## 3. GET `/api/v1/gaps/GAP-0001`

```
HTTP/1.1 200 OK
X-CivicPulse-Data-Source: BIGQUERY
{
  "gap_id": "GAP-0001",
  "priority_score": 92.1,
  "priority_band": "CRITICAL",
  "normalized": {
    "citizen_demand": 0.96,
    "population_affected": 0.842,
    "infrastructure_gap": 0.94,
    "urgency_severity": 0.92,
    "investment_gap": 1,
    "equity_need": 0.77
  },
  "data_source": "BIGQUERY",
  "recommendation_id": "REC-0001"
}
```

---

## 4. `npm test` (actual)

`npm test` **exit 1** on `tests/unit/aiEvaluation.test.ts`:

- `EVAL-COMP-02` (`INFRASTRUCTURE_COMPARISON`) marked FAIL under live Gemini.
- Photo agreement case: issue type `SUPPLY_INTERRUPTION` vs expected `DRINKING_WATER_SHORTAGE`.

That suite is Contract A/B. It was not modified for RICE-09.

Suites re-run after the eval stop, with `data_source: BIGQUERY`:

- Gaps API: **passed** (hero **92.1**, GAP-0002 **56.6**)
- Clusters API: **passed** (2 canonical clusters from BQ; cluster stamps default to `is_live_ai=false` / `DETERMINISTIC_FALLBACK` because those fields are not Doc 04 columns)
- Priority engine, decision-intel, score_breakdown: **passed**
- Requests / RICE-05: **passed** (streaming DELETE warnings on `citizen_requests` are expected while new test rows sit in the buffer)
- Recommendations API: **failed once** when a debug `REC-0001` row was still in the truncated/streamed table (`evidence_refs` lacked `GAP-0001`). Seed was reloaded; recommendations table is empty again; GET GAP-0001 now returns `recommendation_id: REC-0001`.

---

## 5. Dataset metadata

- `dataset_version`: `v1.0.0-demo`
- `generator_version`: `rice-09-seed-load`
- `seed`: `data/seed`

gcloud also warned that the ADC quota project may not match `civicpulse-ai-509417`. Optional:

```
gcloud auth application-default set-quota-project civicpulse-ai-509417
```
