# RICE-06 Completion Report: Semantic Clustering & Community Intelligence (AI Contract C)

**Date**: September 23, 2026  
**Status**: COMPLETE  
**Applet**: CivicPulse AI (ID: `97af6761-0972-4c6d-84f2-535d5b8e5885`)  
**Specification References**: Doc 06 §8 (AI Contract C), Doc 06 §9 (Community Signal Contract), Doc 06 §16 (Execution Tracking), Doc 11 §11 (Guardrails & Clustering), Doc 13 §7 (`embedding_input_v1`), Doc 13 §8 (`cluster_explanation_v1`), Doc 14 §7 (GET `/clusters`), Doc 14 §8 (GET `/clusters/{cluster_id}`), Doc 15 §10 (Clustering Evaluation Cases).

---

## 1. Exact Model Identifiers Used

In accordance with Technical Constraint 1 and CP-026:
- **Generative Cluster Explanation Model (`cluster_explanation_v1`)**:  
  `gemini-3.6-flash`  
  *Endpoint*: `@google/genai` `models.generateContent({ model: 'gemini-3.6-flash', ... })`  
  *Purpose*: Generates concise, objective, community-level canonical issue titles and summaries from member requests without speculation.
- **Request Embedding Model (`embedding_input_v1`)**:  
  `gemini-embedding-2-preview`  
  *Endpoint*: `@google/genai` `models.embedContent({ model: 'gemini-embedding-2-preview', contents: formattedText })`  
  *Purpose*: Produces 3072-dimensional vector embeddings for processed citizen grievance requests.
- **Model Separation Rationale**: Distinct model endpoints are explicitly utilized. Gemini generative Flash is reserved for textual synthesis and reasoning, while Google's specialized embedding model `gemini-embedding-2-preview` handles semantic vector representations.

---

## 2. Code Location & Signature of Deterministic Clustering Fallback

Per Technical Constraint 3, if the embedding API, network, or semantic similarity calculations fail, throw, or are rate-limited, the system engages an explicit deterministic fallback grouping by exact taxonomy and geography rather than leaving requests permanently unclustered or fabricating similarity scores.

- **File Location**: `backend/services/clustering/clusteringService.ts`
- **Function Signature**:
  ```typescript
  export function deterministicTaxonomyGeographyFallback(
    requests: CitizenRequest[]
  ): ClusteringResult
  ```
- **Fallback Execution Behavior**:
  - Partitions eligible requests by strict `category_id::issue_type_id::geo_id`.
  - Stamps all generated clusters and embeddings with:
    - `is_live_ai`: `false`
    - `execution_source`: `'DETERMINISTIC_FALLBACK'`
    - `clustering_version`: `'v1.0'`
  - Singletons or invalid requests missing geography/category are safely routed to `unclusteredRequests`.

---

## 3. Test Output from Clustering Evaluation Cases (Doc 15 §10)

The evaluation suite (`tests/ai_eval/clusteringEvaluation.ts`) executed 5 curated benchmark cases across positive pairs, cross-lingual variants, cross-district decoys, cross-taxonomy boundaries, and ambiguous inputs:

```text
=== Running CivicPulse AI Clustering Evaluation Suite (Doc 15 §10) ===

[PASS] CLU-EVAL-01: Direct vs Passive English phrasing of pipeline rupture in Ward 150 Bellandur
[PASS] CLU-EVAL-02: Multilingual reports (English, Kannada, Hindi) of drinking water crisis in same ward
[PASS] CLU-EVAL-03: Identical text complaint in Bellandur (BLR) vs distant Mysuru (MYS) district (Guardrails prevented false merge)
[PASS] CLU-EVAL-04: Roads pothole vs Water pipeline failure in the same ward (GEO-LOC-BLR-01) (Guardrails prevented false merge)
[PASS] CLU-EVAL-05: Vague complaint missing geo_id remains unclustered candidate (Correctly left unclustered)

================ Clustering Evaluation Summary ================
Positive Grouping Recall / Precision : 100.0% (2/2)
False-Merge Rate on Negative Pairs    : 0.0% (Must be 0.0%)
Unclustered Handling Accuracy         : 100.0% (1/1)
=================================================================
```

### Key Guardrail Verification
1. **Hero Water Scenario (`REQ-TS-000101`)**: Correctly aggregated into `CLU-0001` alongside local paraphrases in Bellandur (`GEO-LOC-BLR-01`).
2. **Decoy Isolation (`REQ-TS-000102`)**: Even though the text phrasing was word-for-word identical to the hero request, the geography guardrail blocked merging because its location was in Mysuru (`GEO-LOC-MYS-01`). False-merge rate on negative pairs remained exactly **0.0%**.

---

## 4. Raw JSON Response for `GET /api/v1/clusters/CLU-0001`

Captured live from the applet running the full backend stack:

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
    {
      "geo_id": "GEO-LOC-BLR-01",
      "name": "Ward 150 - Bellandur",
      "level": "LOCAL_UNIT",
      "code": "W150"
    }
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
      "verification_status": "CONFIRMED",
      "cluster_id": "CLU-0001",
      "status": "PROCESSED",
      "synthetic_flag": true
    },
    {
      "request_id": "REQ-KA-0001",
      "created_at": "2024-03-04T08:15:00Z",
      "input_modality": "TEXT",
      "channel": "mobile",
      "language": "en",
      "raw_text": "Taps have been completely dry in Bellandur Green Glen Layout for the past 48 hours. Families are struggling to procure drinking water.",
      "audio_uri": null,
      "photo_uri": null,
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
      "verification_status": "CONFIRMED",
      "cluster_id": "CLU-001",
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
      "verification_status": "CONFIRMED",
      "cluster_id": "CLU-001",
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
  "investment_context": "UNKNOWN",
  "created_at": "2024-03-10T08:00:00Z",
  "updated_at": "2024-03-20T14:30:00Z",
  "is_live_ai": true,
  "execution_source": "LIVE_GEMINI",
  "clustering_version": "v1.0"
}
```

### Context Evaluation Notes
- **Infrastructure Context**: Reads directly from `InfrastructureProfile` where `geo_id = 'GEO-LOC-BLR-01'` and `category_id = 'WATER'`. Coverage (48.5%), quality (52.0%), and reliability (42.0%) are returned directly.
- **Investment Context**: Returns `"UNKNOWN"`. There is no matching capital project row in `data/seed/project_investments.json` for Bellandur / WATER. As mandated by Doc 14 §8, the absence of a record returns `"UNKNOWN"`, strictly avoiding fabrication of zero-value or dummy projects.
- **Affected Population**: Directly read from `DemographicProfile` (`84,200` citizens for Bellandur), never guessed or hallucinated by the model.

---

## 5. Frontend G2 Cluster Detail Screen Confirmation

The G2 Cluster Detail UI is implemented in `frontend/components/ClusterDetailView.tsx` and accessible via the top navigation bar (`G2 Cluster Detail (Contract C)`).
- **Cluster Header**: Canonical issue title, category tag, issue type, ward identification, and severity/urgency/trend badges.
- **AI Execution Badge**: Prominent pill showing `Live Gemini (gemini-3.6-flash)` with green indicator or `Deterministic Fallback` with stone indicator, alongside `clustering_version: v1.0`.
- **Community Signal KPIs**: 5 metric cards displaying Request Count, Affected Population, Urgency Score, Local Units count, and Cluster Confidence.
- **Infrastructure Context**: Dual-column card displaying physical audit metrics or clean UNKNOWN placeholder if missing.
- **Project Investment Context**: Dual-column card displaying capital project details or prominent UNKNOWN card when no capital investment exists.
- **Member Requests & Evidence**: Interactive list of representative citizen requests showing modality, narrative, timestamps, and physical evidence references.
- **Cluster Selector**: Dropdown switcher allowing users to inspect `CLU-0001` (Bellandur Water Crisis) and `CLU-0002` (HSR Pavements) with on-demand pipeline re-triggering.

---

## 6. Build and Verification Suite

```text
✓ npm run lint             — 0 TypeScript compilation errors
✓ npm run build            — Vite frontend & Node server bundle compiled cleanly
✓ npm run test:integrity   — Seed data model & integrity checks passed
✓ npm run test:clustering  — Embedding formatting, cosine math, guardrails, decoy rejection passed
✓ npm run test:clusters-api — GET /clusters & GET /clusters/{id} integration passed
✓ npm run test:clustering-eval — Doc 15 §10 evaluation passed (100% precision, 0% false merge)
✓ npm test                 — Full suite (8 test suites) all passing with exit code 0
```
