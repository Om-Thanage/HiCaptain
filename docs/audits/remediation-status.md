# Audit remediation on revamped

The original audit examined `work` at `e9d78bb`. Remediation targets the existing product branch `revamped`, starting at `02fe2b4`. Findings from the old checkout are rechecked rather than reapplied blindly. Each completed task is committed and pushed separately. Provider-side credential rotation cannot be performed with repository access alone.

| Finding | Status | Evidence / remaining work |
| --- | --- | --- |
| A01 registration privilege / identity injection | Fixed in branch; regression added | Registration DTO excludes identity and role; only a new organization grants Admin membership. HTTP regression attempts to supply a victim ID and global role. |
| A02 destructive initialization | Fixed and regression covered | Explicit demo profile plus database name ending in `_demo`; refusal occurs before any database operation. |
| A03 vulnerable dependencies | Runtime fixed; tooling advisories remain | Next 16.4.3, Axios 1.21, Zod 4.6.7 and patched runtime transitives. Clean install/build pass; production npm audit reports zero. Development-only matcher advisories are tracked separately. |
| A04 tracked Google credential | Code fixed; owner rotation required | Removed bundled secret, ignored local credential resource, added artifact regression and rotation instructions. Only the Google project owner can rotate the secret. |
| A05 password disclosure / plaintext creation | Under verification | Safe model serialization and membership views exist; admin creation route was removed. |
| A06 object authorization | Under verification | Project-scoped services exist; inspect all remaining endpoints. |
| A07 OAuth callback state | Pending verification | Signed state exists; verify expiry, replay and initiation binding. |
| A08 calendar user identity | Under verification | Principal checks and encrypted durable Google credentials exist. |
| A09 deployment-wide GitHub authority | Fixed | Removed global GitHub credential clients. API reads/webhooks require a linked visible project and the caller's OAuth connection; repository sync uses that caller's token. HTTP fixture verifies credential selection. |
| A10 plaintext GitHub credentials | Fixed | AES-GCM credentials, startup/on-use legacy migration, hidden credential serialization, and clearing credentials on disconnect. Configure the stable provider encryption key before restarting existing installations. |
| A11 session revocation | Fixed | Current account and membership checks plus per-user session versions. Password change verifies the old password and atomically invalidates previous sessions; Settings uses the real endpoint. |
| A12 database deployment defaults | Fixed; existing-volume migration documented | No published MongoDB port, required non-default passwords and a separate database-scoped application user. Compose resolution and initializer syntax checks pass. |
| A13 payment trust | Resolved by removal | Billing APIs and UI removed on revamped. |
| A14 identity / abuse controls | Partial | Unique normalized email exists; throttling remains. |
| A15 browser session lifecycle | Under verification | Expiry-aware cookies and auth routes exist. |
| Completion gaps | Pending | Verify settings, integrations, webhooks, notification claims, tests, licensing, and missing agent delivery. |
