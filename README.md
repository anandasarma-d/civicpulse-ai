# CivicPulse AI

> "From Citizen Voice to Government Action"

This is a hackathon prototype for the **"Build with AI: Code for Communities 2.0"** challenge.

This repository implements **RICE-01** (Project Bootstrap & Implementation Setup) — a clean scaffolding architecture separating frontend, backend, prompts, tests, and data pipelines without product features or unprompted mock services.

---

## Project Structure

```
civicpulse-ai/
├── backend/
│   ├── api/
│   │   ├── routes/              # API route definitions
│   │   └── middleware/          # Express middlewares
│   ├── services/
│   │   ├── request_ai/          # Citizen request understanding service
│   │   ├── clustering/          # Semantic clustering service
│   │   ├── decision_intelligence/ # Prioritization & decision engine
│   │   ├── recommendations/     # Policy and action recommendation service
│   │   └── copilot/             # Government Policy Copilot assistant
│   ├── repositories/            # Data access layer
│   ├── models/                  # Domain and data models
│   ├── common/                  # Shared utilities and helpers
│   ├── app.ts                   # Express application (GET /health)
│   └── server.ts                # Standalone backend server runner
├── frontend/
│   ├── pages/                   # Application pages (LandingPage)
│   ├── components/              # Reusable UI components
│   ├── services/                # API client services
│   ├── types/                   # Frontend TypeScript interfaces
│   └── App.tsx                  # Root frontend component
├── data/
│   ├── schemas/                 # Data schemas (JSON Schema / BigQuery)
│   ├── synthetic/               # Synthetic datasets for testing
│   └── seed/                    # Initial database seed fixtures
├── prompts/                     # Versioned Gemini / Vertex AI prompt templates
├── tests/
│   ├── unit/                    # Unit test suites
│   ├── integration/             # Integration tests
│   └── ai_eval/                 # AI prompt evaluation benchmarks
├── infra/                       # Cloud Run / Terraform infrastructure definitions
├── docs/                        # Architecture decision records and documentation
├── .env.example                 # Environment variable templates
├── server.ts                    # Unified development server (Vite + Express on :3000)
└── package.json                 # Dependencies and build scripts
```

---

## Installation

Ensure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.

```bash
# Clone the repository and navigate to root
cd civicpulse-ai

# Install dependencies
npm install

# Copy environment variable template
cp .env.example .env
```

---

## Running Locally

### 1. Unified Full-Stack (Default Dev Mode)

Runs both the Express backend API and the Vite React frontend concurrently on port `3000`:

```bash
npm run dev
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
  - Returns `{"status":"ok"}` with HTTP 200.

### 2. Running Frontend and Backend Separately

If you prefer to run services in isolated terminal processes:

#### Standalone Backend:
```bash
npm run dev:backend
```
*Starts Express on port 8080 (or `PORT` defined in `.env`). The health check is available at `http://localhost:8080/health`.*

#### Standalone Frontend:
```bash
npm run dev:frontend
```
*Starts Vite dev server on `http://localhost:3000`.*

---

## Health Check Verification

You can verify the backend health endpoint using curl:

```bash
curl -i http://localhost:3000/health
```

Expected output:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok"}
```

---

## Environment Variables

Refer to `.env.example` for all configurable variables, including:
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_REGION`
- `BIGQUERY_DATASET`
- `GCS_BUCKET`
- `VERTEX_AI_MODEL`
- `PROMPT_VERSION_REQUEST_UNDERSTANDING`
- `PROMPT_VERSION_RECOMMENDATION`
- `PROMPT_VERSION_COPILOT`
- `FIREBASE_PROJECT_ID` (optional)
- `MAPS_API_KEY` (optional)
