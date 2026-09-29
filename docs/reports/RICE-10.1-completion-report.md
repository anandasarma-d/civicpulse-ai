# RICE-10.1 / CP-060 — G-flow shared-secret gate

**Date**: 29 September 2026  
**Revision**: `civicpulse-ai-00003-fz9`  
**Image**: `us-central1-docker.pkg.dev/civicpulse-ai-509417/civicpulse/civicpulse-ai:rice101-20260929151725-govgate`  
**URL**: https://civicpulse-ai-741034792208.us-central1.run.app  
**Secret**: Secret Manager `gov-demo-access-key` → env `GOV_DEMO_ACCESS_KEY` (value is **not** in this repository; supply via `X-Gov-Access-Key` or query `gov_access_key`).

C-flow (`POST`/`GET /api/v1/requests`) and `GET /health` stay public. Local/test skip the gate when the env var is unset.

---

## Code (middleware + frontend)

G-routes only: `/api/v1/clusters`, `/api/v1/gaps`, `/api/v1/recommendations`, plus remounts `/api/clusters` and `/api/gaps`.

```31:41:backend/app.ts
// Shared-secret gate for government G-flow routes (clusters / gaps / recommendations).
// Citizen C-flow (/requests) stays public.

const v1Router = Router();
v1Router.use('/requests', requestsRouter);
v1Router.use('/clusters', govAccessGate, clustersRouter);
v1Router.use('/gaps', govAccessGate, gapsRouter);
v1Router.use('/recommendations', govAccessGate, recommendationsRouter);
app.use('/api/v1', v1Router);
app.use('/api/clusters', govAccessGate, clustersRouter);
app.use('/api/gaps', govAccessGate, gapsRouter);
```

Frontend: one-time overlay on G tabs, `sessionStorage` key `civicpulse_gov_access_key`, attached as `X-Gov-Access-Key` on cluster/gap/recommendation fetches.

Local test: `npm run test:gov-access` → PASSED (401 missing/wrong; 200 with header and query; C-flow GET and `/health` open).

---

## Live evidence

### 1. G-route without secret → 401

```
GET https://civicpulse-ai-741034792208.us-central1.run.app/api/v1/gaps/GAP-0001
HTTP/2 401
{"error":{"code":"UNAUTHORIZED","message":"A valid X-Gov-Access-Key is required to access government routes","details":[{"field":"X-Gov-Access-Key","issue":"Missing or invalid"}],"correlation_id":"50664cbb-4632-49c6-823e-e7c0e2697ad3"}}
```

### 2. Same G-route with secret → 200

```
GET /api/v1/gaps/GAP-0001
Header: X-Gov-Access-Key: <demo key>
HTTP/2 200
x-civicpulse-data-source: BIGQUERY
gap_id=GAP-0001 cluster_id=CLU-0001 recommendation_id=REC-0001
```

### 3. C-flow still open (no secret)

```
GET /api/v1/requests/REQ-TS-000101 → HTTP 200
  request_id=REQ-TS-000101 status=PROCESSED category_id=WATER data_source=BIGQUERY

POST /api/v1/requests (no auth header) → HTTP 202
  {"request_id":"REQ-KA-690229","status":"NEEDS_CLARIFICATION","data_source":"BIGQUERY"}
```

### 4. New revision live

`civicpulse-ai-00003-fz9` serving 100% traffic (previous ready revision was `civicpulse-ai-00002-fl7`).
