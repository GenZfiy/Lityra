# Lityra frontend UI replacement coverage

This checklist inventories route patterns from `frontend/src/App.jsx` and tracks the current UI pass. Checked route entries indicate their routed page now composes a task-family layout; they do not claim every authenticated page was individually visually inspected or every control was exercised.

## Route inventory

### Public, authentication, and verification (12 routes)

- [x] `/` — landing / product overview
- [x] `/about` — Lityra product story and GenZify company overview/team (Dr. Rayudu Peyyala's profile omitted per request)
- [x] `/login`, `/learn/login` — Learn sign-in and OTP mode
- [x] `/register`, `/learn/register` — Learn registration
- [x] `/hire/login` — Hire sign-in and OTP mode
- [x] `/hire/register` — Hire registration
- [x] `/forgot-password` — password recovery
- [x] `/drive/attend` — drive registration / resume registration
- [x] `/verify/wallet/:verifyId` — wallet verification
- [x] `/verify/:verifyId` — certificate verification

### Lityra Learn (32 protected routes)

All retain the existing authentication guard and now compose a learning, institution, evidence, or shared account family wrapper. Unauthenticated direct access redirects to `/learn/login`.

- [x] `/lms/access-gate`
- [x] `/lms` — learner dashboard
- [x] `/lms/roadmap`
- [x] `/lms/learning`
- [x] `/lms/assessments`
- [x] `/lms/skill-map`
- [x] `/lms/practice`
- [x] `/lms/careers`
- [x] `/lms/keep-sharp`
- [x] `/lms/wallet`
- [x] `/lms/drill`
- [x] `/lms/mesh`
- [x] `/lms/lessons`
- [x] `/lms/lesson/:lid`
- [x] `/lms/worlds`
- [x] `/lms/achievements`
- [x] `/lms/tutor`
- [x] `/lms/certificates`
- [x] `/lms/admin` — institution administration
- [x] `/lms/curriculum`
- [x] `/lms/trainer`
- [x] `/lms/access-codes`
- [x] `/lms/roles`
- [x] `/lms/users`
- [x] `/lms/institution-analytics`
- [x] `/lms/placement`
- [x] `/lms/audit`
- [x] `/lms/course-builder`
- [x] `/lms/content-studio`
- [x] `/lms/notifications`
- [x] `/lms/profile`
- [x] `/lms/settings`

### Lityra Hire (11 protected routes)

All retain the existing authentication guard and now compose a candidate, recruiter, assessment, or shared account family wrapper. Unauthenticated direct access redirects to `/hire/login`.

- [x] `/drive/access-gate`
- [x] `/drive`
- [x] `/drive/opportunities`
- [x] `/drive/test/:examId`
- [x] `/drive/recruiter/drives`
- [x] `/drive/recruiter/drives/:id`
- [x] `/drive/recruiter/questions`
- [x] `/drive/recruiter/access-codes`
- [x] `/drive/notifications`
- [x] `/drive/profile`
- [x] `/drive/settings`

### Compatibility and fallback routes (3)

- [x] `/apps` redirects to `/`
- [x] `/app/*` redirects to `/`
- [x] `*` redirects to `/`

## Code coverage in this implementation pass

- [x] Shared application shell restructured with a midnight Learn workspace and a warm operational Hire workspace; each retains its own role-filtered navigation.
- [x] Route-family path navigation added for learner, institution, candidate, and recruiter tasks. Links are filtered with the app's role sets; page and API guards remain authoritative.
- [x] Page headings now identify route families: learning journey, progress/evidence, institution studio, opportunity, recruiter operations, and assessment.
- [x] Landing page content uses product capabilities and the actual Learn-to-Hire path. Removed invented partner logos, fabricated testimonials, unsupported scale/outcome claims, and sample dashboard metrics.
- [x] Landing page now presents a semantic Learn-to-Hire journey with a responsive, animated 3D scene; product copy remains real HTML outside the canvas.
- [x] Public About page explains why, what, when, and for whom Lityra is being built; includes GenZify's mission, vision, values, origin, team portraits and advisor profiles, founder acknowledgment, tagline and website link. Dr. Rayudu Peyyala's profile is excluded per request.
- [x] Low-contrast slate text tokens were darkened for light surfaces; landing footer text was adjusted for its dark background.
- [x] Learner curriculum page now uses a year/module spine with an adjacent playlist; student roadmap uses API-backed progress signals beside the current roadmap and recommended actions.
- [x] Recruiter drive overview now uses horizontal mission rows and actual funnel counts for candidates, shortlisted, in-round, and selected stages.
- [x] Responsive visual treatment added for pathway navigation, learner/hiring shells, data tables, forms, tabs, loading/empty states, and dialogs.
- [x] Existing React route modules remain lazy-loaded; Three.js and Lucide are separated into vendor chunks.
- [x] Existing route declarations, login destinations, access gates, role guards, data fetches, and workflow handlers were retained in this pass. The route-family path strips are supplemental navigation; they reuse existing route destinations and avoid links a role cannot access.
- [x] Task-family compositions are applied across the routed modules: public/authentication and verification, learning and assessment, institution administration, candidate Hire, recruiter operations, account/settings, gates, and drive registration. The active exam runner and its instruction/submission states use the assessment/candidate composition.
- [x] Selected high-traffic pages also received deeper JSX hierarchy changes: Landing, MyLearning, StudentHome, RecruiterDrives, AdminConsole, and ExamPortal. Other domain pages retain their existing data/action components inside their task-family composition.
- [ ] Individual visual review and bespoke inner-page replacement across all 55 concrete page routes are not complete; source composition coverage is not authenticated rendered coverage.

## Verification status

- [x] Production build passed after this code change; `prebuild` isolation check passed.
- [x] Build run after the landing, shell, learner, recruiter, and route-family composition changes: `npm run build` succeeded; isolation prebuild succeeded.
- [x] Browser pass on the landing and public form routes at desktop (1440px), tablet (768px), and mobile (375px): no horizontal overflow or browser page errors were recorded. This pass preceded the final recruiter/admin page-composition changes.
- [x] Learn OTP mode, registration navigation, and drive resume-registration mode were exercised in the browser.
- [x] All 43 protected route URLs redirected to their product-specific login route while unauthenticated. This route pass preceded the final recruiter/admin page-composition changes.
- [x] Reduced-motion browser emulation showed no landing WebGL canvas and retained the static path line and semantic journey stations.
- [ ] Protected route URLs still need per-role browser coverage in a live authenticated session. The path family and shell are shared by route group; this is not proof every page-specific rendering was inspected.
- [ ] Authenticated data-mutating workflows (exam submission, drive actions, admin changes, uploads) were not exercised.
- [ ] No lint, type-check, or test script is configured in the frontend package; production build is its available automated verification. Backend tests were not run as part of this frontend task.
- [ ] Vite still warns that the Three.js vendor chunk is 527.8 KB minified (131.9 KB gzip), above its 500 KB chunk warning threshold.
- [ ] Final browser review of the recruiter/admin page-composition changes and authenticated learner, recruiter, faculty, college-admin, TPO, and super-admin states remains pending. This local run had no authenticated session/API service available. Source composition coverage is broader than the authenticated rendered coverage.

## Reference implementation notes

- Reviewed both supplied reference sources without editing either project.
- Company site: `frontend/components/home/HeroCanvas.tsx` and `DarkBgCanvas.tsx` implement multi-octave vector-field particles, linked/pulsing neural nodes, arcs/pulses, responsive canvas sizing, and RAF cleanup. Its React app uses Framer Motion viewport reveals and a responsive animated navbar. Lityra uses this as guidance for its existing motion/canvas treatment; avoid leaving high-cost backgrounds running without visibility/reduced-motion controls.
- Portfolio: `static/js/scene.js`, `scene-kit.js`, and `scene-stations-{a,b,c}.js` create an intentional scroll-driven camera journey through named 3D stations. It uses theme-aware material palettes/PMREM lighting, capped pixel ratio for coarse pointers, pointer response, idle render stop, visibility pause, ResizeObserver rebuild, cleanup, and WebGL context-loss handling. Semantic text content stays outside the decorative scene.
- Target implementation: existing Three.js/Framer Motion/Lucide stack only; no new package. Current shell uses task-oriented route families and reserved material contrast; actual product content remains HTML and application state remains supplied by existing APIs.
- Audit note: route inventory is checked against `frontend/src/App.jsx` (55 concrete page routes plus 3 compatibility/fallback routes). Route-level styling coverage must not be described as individual page/workflow verification.
