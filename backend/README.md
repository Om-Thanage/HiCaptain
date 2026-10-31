# HiCaptain backend

Java 17 and Spring Boot 3.5.16. The API uses MongoDB, organization-scoped memberships, project access checks, expiring JWT sessions, SMTP invitations, and optional Google Workspace/GitHub OAuth integrations.

## Development

Copy `.env.example` to `.env`, set `MONGODB_URI`, `MONGODB_DATABASE`, and a strong base64 `JWT_SECRET`, then run:

```bash
bash ./mvnw spring-boot:run
```

On Windows PowerShell, set `JAVA_HOME` to the JDK directory without its `bin` suffix and use `./mvnw.cmd spring-boot:run`.

Normal startup preserves application data. Demo seeding requires the explicit `demo` profile and a dedicated database whose name ends in `_demo`.

## Access and account behavior

New public registrations create a new organization and an Admin membership in that organization. Callers cannot submit an existing user ID or a global role. Invite existing users or send SMTP invitation links from Team members. Only admins change organization roles; assigned project managers can manage permitted project developer access. Task assignment never grants project membership.

Account profile changes and password changes are available in Settings. Password changes verify the current password and revoke previous sessions. Passwords are BCrypt hashes, are never serialized, and must fit within 8–72 UTF-8 bytes.

## Configuration and deployment

- [Main setup and OAuth callbacks](../README.md)
- [Existing Docker database migration](docker/README.md)
- [Google credential rotation](../docs/audits/credential-rotation.md)
- [Backend dependency/index compatibility](../docs/audits/backend-upgrade.md)
- [Audit remediation tracker](../docs/audits/remediation-status.md)

Provider secrets belong in `.env` or a deployment secret manager. Use stable encryption keys for connected accounts. Existing GitHub plaintext tokens are encrypted during startup when the key is configured. OAuth callbacks require expiring single-use state bound to the initiating browser; allow backend cookies and use HTTPS in production.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, and `FRONTEND_URL` before inviting users. Failed email delivery is reported; the application does not pretend an invitation was sent. Notification-center messages are in-app records. SMS, push delivery, and notification-preference controls are not advertised as implemented features.

Analytics, invoicing, and payments were removed from the product. This guide supersedes the older README that described those features and demo configuration as production setup.

## Checks

```bash
bash ./mvnw test
python docker/test-compose.py
```

Context tests use `hicaptain_automated_tests` with the `test` profile. Run them against isolated MongoDB; do not point tests at production. CI runs the Java suite and frontend lint, types, tests, build, and npm advisory checks.
