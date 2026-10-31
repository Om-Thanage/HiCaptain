# HiCaptain security and completion audit

Date: 31 October 2026. Audited branch: `work`. Audited application commit: `e9d78bb`.

**Release recommendation: block production deployment of this checkout until the critical and high findings are addressed.**

## Scope and evidence limits

Reviewed backend controllers, services, authentication, OAuth, persistence models, frontend authentication/settings/integration paths, dependency declarations/lockfile, tests, and Docker configuration. Source findings below describe reachable code paths; they were not exploited against a running server. No production system, real account, or provider credential was used. Credential values are deliberately omitted.

This checkout differs substantially from the `revamped` implementation discussed in the conversation. Only local branch `work` is available. No organization/membership implementation, email invitation flow, social sign-in implementation, agent worker, project memory, agent RBAC, or provider configuration is present here. Findings and completion claims apply to this checkout only; they do not establish the state of another branch or the deployed application.

The diff-oriented code-review skill was inspected but does not fit this whole-repository audit; no branch comparison or speculative spec baseline was substituted for reviewing the checked-out source.

## Release blockers

### A01 — Critical: public registration can create admins and overwrite existing accounts

Evidence: `backend/src/main/java/com/HiCaptain/demo/controller/AuthController.java:28`, `service/UserService.java:29`, `model/User.java:22` (the latter paths are relative to `backend/src/main/java/com/HiCaptain/demo/`).

`POST /auth/register` accepts the persistence `User` model. The submitted `role` and `id` survive validation and are passed to `userRepository.save`. A caller can choose `Admin`; a supplied existing ID causes an update instead of a new-account insertion, including replacement of the password. Login subsequently creates a JWT from the saved role. The frontend also submits a user-selected role (`frontend/src/app/auth/components/Register.tsx:45`).

Remediation: use a dedicated registration DTO, reject caller-supplied IDs/roles/membership fields, use insertion semantics, enforce a unique normalized email, and assign admin privileges only within a newly created organization on the server. Verify that anonymous registration cannot modify any existing account or create a global admin.

### A02 — Critical: normal startup deletes application data and creates known demo accounts

Evidence: `backend/src/main/java/com/HiCaptain/demo/config/DataInitializer.java:34`; `backend/docker-compose.yml:35`.

The initializer is enabled by `@Profile("!prod")`, then calls `deleteAll` for tasks, projects, and users and inserts sample accounts with fixed passwords. Compose defaults to the `docker` profile, which satisfies `!prod`. Both ordinary local startup and the supplied default Docker deployment therefore run destructive initialization. Other records are left referencing deleted IDs. The sole context-loading test also has no profile or database isolation.

Remediation: require an explicit `demo` opt-in and a dedicated disposable database. Normal startup must never clear collections or create demonstration credentials. Back up an existing database before starting this checkout.

### A03 — Critical dependency exposure: npm reports affected Next.js and other packages

Evidence: `frontend/package-lock.json`; machine-readable results in `2026-10-31-npm-audit.json` beside this report.

`npm audit --package-lock-only --json` reports **25 affected package entries: 1 critical, 9 high, 15 moderate**. These are affected-package counts, not 25 independently proven exploits. Locked Next.js is `16.2.12`, Axios is `1.18.1`, and eslint-config-next is `16.0.0`.

The Next.js entry includes critical advisory ranges affecting this version, including:

- Windows-hosted server RCE: <https://github.com/advisories/GHSA-p293-qw3h-jr36>
- AVIF image optimization RCE: <https://github.com/advisories/GHSA-2xp9-vwfh-vxw4>
- `next/og` ImageResponse RCE: <https://github.com/advisories/GHSA-vcvr-r3jv-pc5j>
- SVG image optimization RCE: <https://github.com/advisories/GHSA-2464-fhr4-w9xw>
- `use cache` typed-array RCE: <https://github.com/advisories/GHSA-673q-mjm6-r5xr>

Reachability depends on hosting and enabled features. Running development tools on Windows alone does not establish that the Windows server advisory is exploitable. Axios advisories also include Node-adapter paths; the observed application API client is primarily browser-side. Those distinctions affect exploitability, but do not make the affected dependencies acceptable to leave unreviewed.

Remediation: update to versions outside **all** reported affected ranges, align Next's ESLint configuration, migrate affected major versions deliberately, and repeat audit/build/regression checks. Do not use an indiscriminate forced dependency upgrade. Java dependency advisories were not successfully scanned, so the npm results are not a full-stack vulnerability count.

## High-priority security findings

### A04 — High: Google OAuth client secret is committed and packaged

Evidence: `backend/src/main/resources/credentials.json`; `backend/src/main/java/com/HiCaptain/demo/config/GoogleCalendarConfig.java:78`; `backend/Dockerfile:16`.

The tracked credential file contains a non-placeholder, Google-shaped client ID and client secret. The config loads it from the classpath and the Docker build copies application resources into the artifact. The credential's current validity was not tested. Treat it as exposed; possession of this secret alone is not proof of access to users' Google data.

Remediation: rotate the secret at Google, replace bundled credentials with environment/secret-manager configuration, remove the sensitive file from tracked resources, and assess repository history and distributed artifacts. Deleting the current file alone does not revoke the old secret.

### A05 — High: password hashes are returned through user APIs; admin creation bypasses hashing

Evidence: `backend/src/main/java/com/HiCaptain/demo/model/User.java:33`, `controller/AuthController.java:33`, `controller/UserController.java:23`, `service/UserService.java:53`.

`User.password` has ordinary Lombok getters and no serialization exclusion. Registration and user endpoints return `User` objects; `/users` permits Clients and ProjectManagers and returns all users. This exposes BCrypt hashes for offline cracking. Separately, `POST /users` calls `UserService.create`, which directly saves the submitted password without hashing. Accounts created that way can have plaintext passwords at rest and fail normal BCrypt login.

Remediation: return explicit safe response DTOs, mark password write-only as defense in depth, and route every account-creation path through the same hashing/validation policy. Add serialization and login regression tests.

### A06 — High: widespread missing object ownership checks

Evidence: `controller/TaskController.java:35` and `:59`, `service/TaskService.java:43` and `:99`, `controller/ProjectController.java:129`, `service/ProjectService.java:98`, `controller/InvoiceController.java:20`, `service/InvoiceService.java:28`, `controller/MeetingController.java:20`. Paths are under `backend/src/main/java/com/HiCaptain/demo/`.

Role checks are frequently present, but object membership checks are absent. Developers can retrieve/update tasks identified by arbitrary IDs, and Clients can enumerate another project's tasks. ProjectManagers can update/delete projects or add developers to projects they do not manage. Invoices and meetings have similar unscoped reads, and invoice updates permit Clients without checking invoice ownership. Feedback, time-log, and repository-access mutation paths show the same pattern. The ownership check on `GET /projects/{id}` does not protect these sibling routes.

Remediation: centralize organization/project/resource authorization and apply it to every read and mutation, including nested IDs, assignments, and repository access schedules. Test cross-user, cross-project, and cross-organization access for every role.

### A07 — High: OAuth callbacks trust attacker-controlled account identifiers

Evidence: `service/GitHubOAuthService.java:44` and `:56`; `controller/GitHubOAuthController.java:42`; `service/GoogleCalendarService.java:43`; `controller/GoogleCalendarController.java:45`.

GitHub's generated nonce is not stored and checked. Its callback takes the target user from the second portion of an arbitrary `state` string. Google's state is directly the user ID. Neither callback binds the response to the browser/account that initiated authorization. A valid authorization code can therefore be associated with a caller-chosen HiCaptain user instead of the initiating user. The GitHub connection path persists that association. Google's separate storage defect below currently prevents a reliable normal connection flow; its missing state validation must still be fixed.

Remediation: use expiring, single-use state bound to the initiating user and browser, verify it before token exchange, and reject altered/replayed callbacks. Include denial/cancellation handling and verify provider identity before replacing an existing connection.

### A08 — High: Google Calendar operations trust a request-supplied `userId`

Evidence: `controller/GoogleCalendarController.java:58`, `:96`, `:142`; `service/MeetingService.java:43`.

The calendar endpoints use an arbitrary `userId` without matching it to the authenticated principal. The meeting service similarly uses the submitted organizer ID to choose Google credentials. Once usable credentials exist, another authenticated member can request someone else's calendar data or cause actions under their connection. The current revoke method is also a no-op, so it does not presently revoke another user's token; this does not make the identity selection safe.

Remediation: derive connection ownership from the principal; authorize delegated organizer actions explicitly. Restrict public OAuth paths to the callback, rather than broadly permitting `/api/google-calendar/auth/**`.

### A09 — High: repository endpoints act through a deployment-wide GitHub token

Evidence: `config/GitHubConfig.java:33`; `controller/GitHubController.java:62` and `:120`; `service/GitHubService.java:137`.

The shared WebClient attaches `GITHUB_TOKEN` to requests. Repository read APIs accept arbitrary owner/repository names from Developers, and webhook creation permits any ProjectManager without enforcing the project's repository grant. A user can therefore access private repository information within the server token's scope or configure webhooks for repositories beyond their HiCaptain project authority. Separate repository-access records do not constrain these API paths.

Remediation: authorize the project/repository association and use a least-privilege connection authorized for that action. Build webhook bodies with a JSON serializer, validate destination URLs, and scope webhook administration to authorized repositories.

### A10 — High: GitHub OAuth tokens are stored without encryption

Evidence: `service/GitHubOAuthService.java:155`; `model/GitHubConnection.java:32`.

The access token is saved verbatim despite the model comment describing encryption. The scopes include repository access and webhook administration. A database/backup disclosure can therefore disclose usable provider credentials.

Remediation: encrypt credential fields using an externally managed stable key; keep them out of API response models and logs; plan rotation and disconnect behavior.

### A11 — High: deleted users and demoted roles retain JWT authority

Evidence: `security/JwtAuthFilter.java:45`; `service/JwtService.java:30`.

The filter trusts token role/user claims without checking the current user record or role. `UserService` is injected but unused. JWTs last ten hours; deletion, a password change, or demotion does not invalidate an already-issued token.

Remediation: verify current membership and account status on requests, use a session/security version or revocation mechanism for sensitive changes, and test removal/demotion with previously issued tokens.

### A12 — High: database is published with default administrator credentials

Evidence: `backend/docker-compose.yml:8`, `:11`, `:38`.

Compose publishes MongoDB on all host interfaces, defaults to a known administrator/password combination, and uses the root account for the application. Actual external reachability depends on host/network firewall rules.

Remediation: remove the public database port or bind it to loopback for local development, require non-default secrets, and provision a database-scoped application user. Keep production database access on a private network.

### A13 — High: clients can submit completed payment records without payment verification

Evidence: `controller/PaymentController.java:32`; `service/PaymentService.java:32`; `frontend/src/services/payment.ts:31`; `model/Payment.java:20`.

A Client can submit a payment status and an arbitrary invoice ID, and the service saves and associates it without verifying ownership, amount, or a payment provider result. The frontend announces payment success after creating this record. It also submits `amount` while the backend field is `amountPaid`, so the intended amount can be lost.

Remediation: since invoices/payments were requested to be removed, remove their full surface after confirming the intended branch. If retained, only trusted server-side payment confirmation may establish a completed payment; use decimal money, correct DTOs, invoice ownership checks, and idempotent provider verification.

## Additional hardening and reliability findings

### A14 — Medium: account uniqueness and login abuse controls are missing

Evidence: `model/User.java:29`; `repository/UserRepository.java:12`; `controller/AuthController.java:28`.

There is no unique normalized email constraint or duplicate-registration policy. Multiple accounts with the same email can make `Optional<User>` lookups ambiguous and break login. Registration also permits a missing role, which later causes `getRole().name()` to fail. No application login throttling or brute-force protection was found; an external gateway may provide controls that are not visible here.

Remediation: normalize and uniquely index identity fields, validate required registration semantics, return controlled duplicate responses, and add appropriately scoped rate limits.

### A15 — Medium: browser session lifecycle and token storage need correction

Evidence: `frontend/src/services/auth.ts:16`; `frontend/src/proxy.ts:8`; `frontend/src/lib/api.ts:32`.

JWTs are duplicated into localStorage and a JavaScript-readable cookie without an explicit Secure/SameSite policy. This increases the impact of a future XSS; no working XSS exploit was established. The route proxy checks only cookie presence, and the cookie outlives the backend's ten-hour JWT. The 401 handler redirects to `/login`, which has no matching page, while the proxy redirects an existing token away from `/auth` even when expired.

Remediation: prefer server-managed HttpOnly/Secure/SameSite sessions where feasible, align expiry with the server, use consistent auth routes, and retain backend signature/permission validation as the actual security boundary. A cookie-presence route check alone does not bypass protected backend APIs.

## Unfinished features and acceptance gaps

| Priority | Gap | Evidence | Completion condition |
| --- | --- | --- | --- |
| P0 | Previously discussed organization/invitation/social-auth/agent implementation is absent from this checkout | No corresponding models/controllers or `agent-worker/` directory; only `work` branch available | Locate the intended implementation branch and repeat this audit on its exact commit before release |
| P0 | Password change reports success without changing a password | `frontend/src/app/settings/page.tsx:210` | Call an authenticated password-change endpoint with current-password verification and session revocation; never announce success for a no-op |
| P1 | Profile, notification preferences, and appearance saves are no-ops | `frontend/src/app/settings/page.tsx:186`, `:198`, `:942` | Persist changes and verify reload behavior |
| P1 | Integration failures are presented as successful demo connections | `frontend/src/app/settings/page.tsx:228`, `:317` | Show real connection state and actionable errors; remove production fake-success fallbacks |
| P1 | Google authorization lacks durable credential storage; disconnect does not revoke anything | `config/GoogleCalendarConfig.java:91`; `service/GoogleCalendarService.java:55`, `:230` | Configure durable protected storage, support restart/refresh, and actually revoke/remove credentials. Calling `getRefreshToken()` is only a getter |
| P1 | GitHub webhooks cannot work as advertised | `config/SecurityConfig.java:48`; `controller/GitHubController.java:131` | Authenticate public callbacks with the GitHub signature, reject replays/duplicates, and implement event persistence. Currently the route requires a HiCaptain JWT, no webhook signature check is present, and handlers only log TODOs |
| P1 | Cloud callback and Docker environment configuration disagree | `service/GoogleCalendarService.java:42`; `controller/GitHubOAuthController.java:87`; `backend/docker-compose.yml:44`; `backend/src/main/resources/application.properties:15`; `config/CorsConfig.java:19` | Use the public origins and exact registered callbacks; supply the actual `GITHUB_OAUTH_*` variables; use Google env credentials; honor configured CORS origins and explicitly wire CORS into the security chain. Verify authenticated cross-origin preflight requests |
| P1 | API errors produce fabricated schedules, feedback, and notifications | `frontend/src/app/schedule/page.tsx:119`; `frontend/src/app/feedback/page.tsx:43`; `frontend/src/app/notifications/page.tsx:76` | Render explicit error/retry states and clearly labeled stale caches |
| P1 | Requested analytics/invoice removal and project GitHub relocation are absent | Analytics/invoice pages, services and backend routes remain; `/git` remains a separate page | Validate against the intended branch and remove the entire unwanted feature surface |
| P2 | Notification-channel claims exceed implementation | `README.md` advertises email/SMS/push; notification service only persists application notifications | Implement delivery, consent/preferences, retries and delivery status, or narrow documentation |
| P1 | Automated quality gates are incomplete | Only `BackendApplicationTests.contextLoads` exists; no auth/ownership/OAuth regression tests; `frontend/package.json:9` invokes removed `next lint` | Add security boundary tests and an actual ESLint CLI command/CI gate |
| P2 | Open-source license declaration is incomplete | Root README advertises MIT and links to `LICENSE`, but no tracked license file exists | Add the chosen license text with correct copyright attribution and verify dependency notices |

## Verification performed

- Repository/route/service review: completed for the checkout stated above. High-impact findings were traced through controllers, services, persistence and applicable configuration.
- Tracked Google credential review: confirmed non-placeholder, provider-shaped material without displaying or testing it. No broad historical secret scan or provider-side rotation was performed.
- npm lockfile vulnerability scan: completed; raw JSON saved alongside this report. Advisory findings are distinguished from proven application-level exploitability.
- Frontend dependency installation: completed using `npm ci --ignore-scripts --no-audit`; lifecycle scripts were not executed.
- Frontend lint: failed because Next.js 16 treats `next lint` as an invalid project-directory invocation. The existing lint script does not provide a quality gate.
- Frontend build: blocked while fetching Inter from Google Fonts (`next/font` in `frontend/src/app/layout.tsx`). This is an external build dependency failure, not a passing build or proof of an application compilation defect. Consider self-hosted fonts for reproducible offline builds.
- TypeScript: the initial standalone check reported two PNG import declaration errors because `next-env.d.ts` had not been generated after the interrupted build. A supplementary check with explicit standard Next/React/Node/image declarations (`tsc --noEmit --types node,react,next,next/image-types/global`) passed. The referenced logo file exists; this is not a confirmed missing-asset defect.
- Backend packaging attempt: blocked resolving the Spring Boot parent from Maven Central (`Temporary failure in name resolution`). Backend compilation, tests, and Java vulnerability scanning are therefore unverified. Java 21 was available with Java 17 configured as the project target; no JDK 17 runtime verification was performed.
- Runtime application tests: not run against a real database. In particular, the destructive initializer makes an unisolated context test unsafe.
- No application source fixes, credential changes, deployments, commits, or pushes were performed as part of this audit. This report and the npm result are the intended repository changes.

## Recommended remediation order

1. Establish the exact branch/commit intended for deployment and preserve existing data. Disable destructive initialization on normal startup and rotate the tracked Google secret.
2. Close public registration privilege/ID injection and password exposure. Establish safe credential creation and unique identities.
3. Enforce project/resource ownership consistently, then repair OAuth state, calendar identity selection, and repository token authority.
4. Upgrade affected dependencies, address session revocation and database deployment defaults, and rerun advisory checks for both ecosystems.
5. Complete or remove no-op/demo surfaces, finish integration persistence and callbacks, and add isolated regression tests before production rollout.
