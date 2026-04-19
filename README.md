# NutriPlanner API (XJCO3011 Coursework 1)

NutriPlanner is a data-driven Web API for recipe and nutrition analytics.  
It is built to satisfy and exceed the coursework baseline: SQL-backed CRUD, authentication, robust error handling, analytics endpoints, testing, documentation, and reproducible setup.

## Core Features
- JWT authentication with refresh-token rotation and token revocation.
- SQL database (SQLite engine via `sql.js`) with full CRUD for ingredients and recipes.
- Analytics endpoints for nutrition quality, cost analysis, leaderboards, and recommendations.
- Validation with Zod, security middleware (`helmet`, `rate-limit`, `cors`), and consistent JSON responses.
- Integration tests with `vitest` + `supertest`.
- Coursework-ready documentation set, including API documentation PDF and technical report template.

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   copy .env.example .env
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. API base URL:
   ```text
   http://localhost:3000/api/v1
   ```
5. 3D insights dashboard:
   ```text
   http://localhost:3000/insights/
   ```

## Useful Scripts
- `npm run dev` - run API in watch mode.
- `npm run build` - compile TypeScript.
- `npm run start` - run compiled API.
- `npm run typecheck` - TypeScript check only.
- `npm test` - run integration tests.
- `npm run db:seed` - create bootstrap admin + starter dataset.
- `npm run docs:pdf` - generate `docs/API_Documentation.pdf`.
- `npm run data:refresh` - download and merge open nutrition-health datasets for dashboard.

## Default Bootstrap Admin
Configured via `.env`:
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

The server creates this admin account automatically if it does not exist.

## Documentation Index
- API Documentation PDF: [docs/API_Documentation.pdf](docs/API_Documentation.pdf)
- API Documentation Markdown: [docs/API_Documentation.md](docs/API_Documentation.md)
- OpenAPI spec: [docs/openapi.yaml](docs/openapi.yaml)
- Dashboard dataset sources: [docs/Dataset_Sources.md](docs/Dataset_Sources.md)
- Technical report template (with GenAI declaration): [docs/Technical_Report_Template.md](docs/Technical_Report_Template.md)
- Presentation slides outline (10-minute oral): [docs/Presentation_Slides_Outline.md](docs/Presentation_Slides_Outline.md)
- Suggested GenAI usage log appendix: [docs/GenAI_Usage_Log_Template.md](docs/GenAI_Usage_Log_Template.md)
- Oral Q&A prep notes: [docs/Oral_QA_Preparation.md](docs/Oral_QA_Preparation.md)
- Submission checklist: [docs/Submission_Checklist.md](docs/Submission_Checklist.md)

## Endpoint Summary
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET|POST /ingredients`
- `GET|PATCH|DELETE /ingredients/:id`
- `GET|POST /recipes`
- `GET|PATCH|DELETE /recipes/:id`
- `GET /analytics/recipes/:id/nutrition`
- `GET /analytics/recipes/:id/cost`
- `GET /analytics/leaderboard`
- `POST /analytics/recommendations`

## Dataset Note
Starter seed nutrition values are based on publicly available USDA FoodData Central style nutrient references and should be cited in the final report.

The dashboard dataset is independently generated from Our World in Data public grapher endpoints via:
```bash
npm run data:refresh
```

## Deployment Options
This project can be demonstrated via:
- local execution (`npm run dev`),
- container deployment (add Dockerfile),
- or cloud deployment (Render/Railway/Fly) with environment variables configured.

## Coursework Submission Checklist
- Public GitHub repo with commit history.
- Runnable code matching presentation demo.
- `README.md` with setup instructions.
- API documentation (PDF linked above).
- Technical report with GenAI declaration.
- Slides for 5-minute demo with version-control, docs, and deliverable coverage.
