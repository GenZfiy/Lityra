# Lityra backend service inventory

Source of truth: `backend/services.txt`, each service's `app/config.py`,
`app/factory.py`, `app/routes.py`, and the gateway routing table. All domain
services expose a Flask WSGI app via `manage.py serve`; the gateway is a Flask
reverse proxy. The registry ports are internal container ports. Only the
gateway is intended to receive public traffic.

| Service | Responsibility / API surface | Entrypoint | DB schema in container | Dependencies and communication | Estimated runtime profile | Deployment group / exposure |
|---|---|---|---|---|---|---|
| `auth` | Login, registration, tokens, roles, permissions, account verification (`/auth/*`) | `services/auth/manage.py` → `app.factory.build_app` | `lare_auth` | PostgreSQL; gateway identity/RBAC context | Medium; bcrypt CPU on auth operations | Identity; gateway-only |
| `institution` | Colleges, branches, training centers, cohorts, schedules, class access (`/lms/v1/colleges`, `/training-centers`, `/training-batches`, `/access`, `/branches`, `/cohorts`, `/schedule`) | `services/institution/manage.py` | `institution` | PostgreSQL; gateway | Low–medium CRUD | Learning administration; gateway-only |
| `learner` | Learner roster, learner records, placement/roster analytics (`/lms/v1/learners`, `/roster`, `/placement`, `/students`) | `services/learner/manage.py` | `learner` | PostgreSQL; gateway | Medium CRUD/reporting | Learning records; gateway-only |
| `curriculum` | Curricula, years, modules, lessons, objectives (`/lms/v1/curricula`, `/years`, `/modules`, `/lessons`, `/objectives`) | `services/curriculum/manage.py` | `curriculum` | PostgreSQL; gateway | Low–medium CRUD | Learning content; gateway-only |
| `content` | Lesson/content resources (`/lms/v1/content`) | `services/content/manage.py` | `content` | PostgreSQL; gateway | Low–medium CRUD | Learning content; gateway-only |
| `progress` | Learner progress, attendance, scorecards (`/lms/v1/progress`, `/attendance`, `/scorecard`) | `services/progress/manage.py` | `progress` | PostgreSQL; gateway | Medium writes/aggregation | Learning outcomes; gateway-only |
| `assessment` | Assessments, attempts, answers and learning features such as careers, reviews, wallet, drills, mesh, micro-lessons, worlds (`/lms/v1/assessments`, `/attempts`, `/answers`, `/careers`, `/reviews`, `/wallet`, `/drill`, `/mesh`, `/micro-lessons`, `/worlds`) | `services/assessment/manage.py` | `assessment` | PostgreSQL; gateway; AI may be used by feature code | Medium; occasional AI work | Learning assessment; gateway-only |
| `gamification` | XP, streaks and leaderboards (`/lms/v1/gamification`) | `services/gamification/manage.py` | `gamification` | PostgreSQL; gateway | Low–medium CRUD | Learning outcomes; gateway-only |
| `certification` | Certificate templates, issue/verify (`/lms/v1/cert-templates`, `/lms/v1/certificates`, `/verify/*`) | `services/certification/manage.py` | `certification` | PostgreSQL; gateway; one-time verification-ID migration | Low–medium | Credentials; gateway-only |
| `candidate` | Candidate identity/profile, attend and application APIs (`/drive/v1/candidate*`, `/drive/v1/candidates`, `/drive/v1/attend`) | `services/candidate/manage.py` | `candidate` | PostgreSQL; gateway; some internal calls use `ServiceClient` | Medium | Hiring candidate; gateway-only |
| `drive` | Recruitment drives, opportunities, access and workflow (`/drive/v1/drives`, `/opportunities`, `/access`) | `services/drive/manage.py` | `drive` | PostgreSQL; gateway; internal signed service calls | Medium | Hiring workflow; gateway-only |
| `questionbank` | Questions and blueprints (`/drive/v1/questions`, `/blueprints`) | `services/questionbank/manage.py` | `questionbank` | PostgreSQL; gateway; Gemini/AI provider for generation | Medium–high during generation | Hiring assessment; gateway-only |
| `exam` | Exams and exam sessions (`/drive/v1/exams`, `/exam-sessions`) | `services/exam/manage.py` | `exam` | PostgreSQL; gateway; internal exam calls | Medium–high during active exams | Hiring assessment; gateway-only |
| `submission` | Exam submission storage/processing (`/drive/v1/submissions`) | `services/submission/manage.py` | `submission` | PostgreSQL; gateway; internal service calls | Medium | Hiring assessment; gateway-only |
| `anticheat` | Proctoring/anti-cheat signals (`/drive/v1/proctor`) | `services/anticheat/manage.py` | `anticheat` | PostgreSQL; gateway; may notify internal exam service | Medium; bursty during exams | Hiring assessment; gateway-only |
| `coding` | Shared coding-practice and hiring code execution (`/lms/v1/practice`, `/drive/v1/coding`) | `services/coding/manage.py` | `coding` | PostgreSQL; gateway; OS sandbox/toolchains required for safe code execution | High/variable; executes untrusted code | Code execution; gateway-only; sandbox required |
| `evaluation` | Candidate evaluations (`/drive/v1/evaluations`) | `services/evaluation/manage.py` | `evaluation` | PostgreSQL; gateway; consumes submission/evidence through service calls | Medium–high | Hiring evaluation; gateway-only |
| `interview` | Interview scheduling and interview records (`/drive/v1/interviews`) | `services/interview/manage.py` | `interview` | PostgreSQL; gateway | Medium | Hiring workflow; gateway-only |
| `result` | Results, offers and public offer verification (`/drive/v1/results`, `/offers`, `/verify/offer/*`) | `services/result/manage.py` | `result` | PostgreSQL; gateway; result compilation can be long-running | Medium–high | Hiring outcomes; gateway-only |
| `notification` | Email/SMS notifications and preferences (`/notify/*`) | `services/notification/manage.py` | `notification` | PostgreSQL; SMTP/Brevo/Twilio are optional providers | Low baseline; network I/O | Shared platform; gateway-only |
| `files` | Upload/download metadata and bytes (`/files/*`) | `services/files/manage.py` | `files` | PostgreSQL; current factory uses local filesystem storage | Medium; storage I/O | Shared platform; gateway-only |
| `analytics` | Analytics endpoints (`/analytics/*`) | `services/analytics/manage.py` | `analytics` | PostgreSQL; HTTP event bus/service clients | Medium; report-dependent | Shared platform; gateway-only |
| `audit` | Audit events (`/audit/*`) | `services/audit/manage.py` | `audit` | PostgreSQL; event/service calls | Low–medium writes | Shared platform; gateway-only |
| `ai_orchestration` | Governed AI completion/provider dispatch (`/ai/*`, excluding tutor prefix) | `services/ai_orchestration/manage.py` | `ai_orchestration` | PostgreSQL; Gemini/Anthropic external APIs | High/variable; network I/O | AI; gateway-only |
| `ai_tutor` | Learner tutor sessions/chat/study plans (`/ai/v1/tutor*`) | `services/ai_tutor/manage.py` | `ai_tutor` | PostgreSQL; AI provider external APIs | High/variable; network I/O | AI; gateway-only |
| `organization` | Organization/tenant resolution and administration (`/org/*`) | `services/organization/manage.py` | `organization` | PostgreSQL; gateway | Low–medium CRUD | Platform administration; gateway-only |
| `evidence` | Candidate evidence records; installs an append-only database trigger | `services/evidence/manage.py` | `evidence` | PostgreSQL; gateway; consumed by evaluation/decision services | Medium writes | Hiring evidence; gateway-only |
| `competency` | Competency/skill records (`/drive/v1/competency`) | `services/competency/manage.py` | `competency` | PostgreSQL; gateway; evidence/evaluation service calls | Medium | Hiring evaluation; gateway-only |
| `decision` | Hiring decision records (`/drive/v1/decisions`) | `services/decision/manage.py` | `decision` | PostgreSQL; gateway; evidence/competency service calls | Medium | Hiring outcomes; gateway-only |
| `action` | Post-decision actions (`/drive/v1/actions`) | `services/action/manage.py` | `action` | PostgreSQL; gateway; decision/evidence service calls | Low–medium | Hiring outcomes; gateway-only |
| `recruit_ai` | Hiring insights and calibration (`/drive/v1/insights`, `/calibration`) | `services/recruit_ai/manage.py` | `recruit_ai` | PostgreSQL; gateway; AI provider may be used | Medium–high | Hiring AI; gateway-only |
| `gateway` | JWT validation, route resolution, trusted-context injection, rate limiting and reverse proxy (`/health`, `/ready`, all public APIs) | `services/gateway/manage.py` → `app.factory.build_app` | None | HTTP to 31 loopback upstreams; optional Redis for shared event/rate-limit state | Medium; all public request traffic | Edge/API gateway; only public backend process |

## Deployment findings

- `services.txt` defines 31 domain processes on ports `8001–8031` plus the gateway on `8000`.
- The Render deployment image contains all 32 processes under Supervisor. Domain services are intended to bind to loopback; the gateway binds publicly.
- Each process uses the shared `lare_common` package and generally creates its own SQLAlchemy engine. The image uses one pool per service; set `DB_POOL_SIZE=1` and `DB_MAX_OVERFLOW=0` for the Supabase shared session pooler.
- The source server default is 16 threads per process. The Render Docker image now sets `WEB_THREADS=1`, `WEB_CONNECTION_LIMIT=100`, and `MALLOC_ARENA_MAX=2` to reduce per-process overhead. This is a memory mitigation only; it does not prove 32 Python processes fit in Free memory.
- All 31 schemas are initialized sequentially at container startup unless `SKIP_INIT=1`. The supplied Render startup log shows these steps took roughly five minutes. Use `SKIP_INIT=1` only after verifying the schemas were initialized; the log in the deployment report showed each init succeeded.
- `files` uses local filesystem storage. Render Free filesystems are ephemeral, so uploads do not have durable storage there.
- `coding` executes untrusted source code and requires a verified OS sandbox in production. The current Dockerfile does not install `bubblewrap` or `nsjail`; disable code execution on this image until a sandbox is available and tested.
- The full 32-process backend cannot be claimed to fit Render Free's `512 MB / 0.1 CPU` allocation without measurements. A safe consolidation would require a separately tested packaging/dispatch refactor; none is made here because preserving authentication, isolation, and all existing routes takes priority.
