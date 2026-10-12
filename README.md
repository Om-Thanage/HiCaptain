# HiCaptain

HiCaptain is a project workspace for teams. The current interface follows a light, TaskHub inspired design and brings projects, people, tasks, meetings, files, and development activity together.

## What you can do

- **Organizations and access:** Create an account with email and password, Google, or GitHub and become the admin of a new organization. New accounts receive a generated display name that can be edited in Settings. Invite teammates by email; people with existing accounts can join directly, while new teammates create an account from the invitation link. A person can belong to multiple organizations and hold multiple roles in each one. Admins manage organization roles, and project access can be scoped to selected projects.
- **Projects:** Create projects with a start date that defaults to today, a tentative end date, a description, and a team. Project details show the timeline, team, Kanban board, and GitHub activity. Admins and project managers can manage the permitted project team.
- **Tasks and team progress:** Create, assign, edit, and move tasks across the Kanban board. Track priorities, deadlines, and status from the project and workspace overview. Copy individual tasks to your Google Tasks list.
- **Schedule and meetings:** See project deadlines, meetings, and Google Calendar events together. Connect Google Workspace to create calendar meetings with Google Meet links.
- **Project files:** Choose a folder from a connected Google Drive for each project, share that folder with the project team, and manage files from HiCaptain. This works with a personal Google account; a Workspace shared drive is not required.
- **GitHub:** Connect your GitHub account from a project details page, link repositories to that project, and review recent commits and open pull requests there. GitHub activity is no longer a separate sidebar destination.
- **Team communication:** Use feedback and notifications alongside project work. The profile menu contains account settings and sign out.

Analytics and invoicing are not part of the current product.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, CSS modules, Lucide icons |
| Backend | Java 17, Spring Boot, Spring Security, JWT, Maven |
| Data | MongoDB |
| Integrations | Google OAuth, Calendar, Meet, Drive, Tasks; GitHub OAuth and API; SMTP invitations |

## Local development

Requirements: Java 17, Node.js compatible with Next.js 16, npm, and MongoDB. External integrations need credentials only when you use them.

1. Configure the backend environment:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set `MONGODB_URI` and a strong `JWT_SECRET`. Keep `.env` out of Git. For invitation emails, set the `SMTP_*` fields and `FRONTEND_URL`. Set `BACKEND_URL` to the public backend origin for OAuth callbacks. Google sign-in and Workspace share `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; Workspace also needs a stable `GOOGLE_TOKEN_ENCRYPTION_KEY`. GitHub sign-in and repository access share `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`. See [backend/.env.example](backend/.env.example) for the complete list.

2. Start the backend:

   ```bash
   cd backend
   bash ./mvnw spring-boot:run
   ```

3. In another terminal, start the frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   The frontend opens at `http://localhost:3000` and calls `http://localhost:8080` by default. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the backend runs elsewhere.

4. Open `http://localhost:3000`, create an organization, and invite your team from **Team members**.

## OAuth setup

Register these backend callback URLs with the providers for local development:

- GitHub sign-in and repository integration: `http://localhost:8080/api/auth/github/callback`
- Google sign-in: `http://localhost:8080/auth/oauth/google/callback`
- Google Workspace integration: `http://localhost:8080/api/google-calendar/auth/callback`

### Create the credentials

1. In **GitHub → Settings → Developer settings → OAuth Apps**, create **one OAuth App**. Set its homepage URL to `http://localhost:3000` and its authorization callback URL to the GitHub callback above. Put its client ID and secret in `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`. Sign-in requests only identity scopes; clicking **Connect** in Settings requests repository and webhook access. Existing installations should point the app used for repository access at this shared callback and remove the old `GITHUB_LOGIN_*` variables. Set `GITHUB_TOKEN` only if you use token based repository syncing.
2. In **Google Cloud Console → Google Auth Platform**, configure the consent screen and add your test accounts while the app is in testing. Under **Clients**, create an OAuth client of type **Web application**. Add **both** Google callback URLs above to its **Authorized redirect URIs**. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google sign-in requests `openid`, `email`, and `profile`. Clicking **Connect** in Settings separately asks for Calendar, Drive, and Tasks access.
3. For local development, set `BACKEND_URL=http://localhost:8080`, `FRONTEND_URL=http://localhost:3000`, and `NEXT_PUBLIC_API_URL=http://localhost:8080`. For production, use the public HTTPS backend origin for `BACKEND_URL`, the public frontend origin for `FRONTEND_URL`, and the same backend origin for `NEXT_PUBLIC_API_URL`. If you override a callback with `GITHUB_OAUTH_REDIRECT_URI`, `GOOGLE_LOGIN_REDIRECT_URI`, or `GOOGLE_OAUTH_REDIRECT_URI`, register that exact URL with its provider. Scheme, host, port, path, and trailing slash must match exactly. Docker Compose exposes the backend at port 8081 locally, so its default `BACKEND_URL` is `http://localhost:8081`.

If Google shows `Error 400: redirect_uri_mismatch`, inspect the `redirect_uri` in the authorization URL and add that **exact** URL under the same Google OAuth client's **Authorized redirect URIs**. Both sign-in and Workspace use the same client ID but have different callback paths. The backend cannot change the Google Cloud Console setting for you.

Use HTTPS frontend and backend URLs in production, register those exact backend callbacks with GitHub and Google, and set `FRONTEND_URL` to the public frontend origin. Keep client secrets in `backend/.env` or your deployment secret manager; never put them in `NEXT_PUBLIC_*` variables. Connect Google Workspace from **Settings** and GitHub repositories from a project's **GitHub** section. Social sign-in links an existing account only when the provider returns a verified email. New accounts choose an organization name after the provider returns and become its Admin; teammates using an invitation link join that invitation's organization after their verified email is checked.

## Repository layout

- [`frontend/`](frontend/) — Next.js app and user interface
- [`backend/`](backend/) — Spring Boot API, integrations, and persistence
- [Frontend setup](frontend/README.md) and [backend documentation](backend/README.md) — more component details

Run `npm run build` in `frontend/` and `bash ./mvnw test` in `backend/` to validate changes.
