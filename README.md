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

   Set `MONGODB_URI` and a strong `JWT_SECRET`. Keep `.env` out of Git. For invitation emails, set the `SMTP_*` fields and `FRONTEND_URL`. For Google sign-in and Workspace, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; Workspace also needs `GOOGLE_OAUTH_REDIRECT_URI` and a stable `GOOGLE_TOKEN_ENCRYPTION_KEY`. GitHub sign-in uses `GITHUB_LOGIN_CLIENT_ID` and `GITHUB_LOGIN_CLIENT_SECRET`; repository integration uses `GITHUB_TOKEN` and `GITHUB_OAUTH_*`. See [backend/.env.example](backend/.env.example) for the complete list.

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

- GitHub sign-in app: `http://localhost:8080/auth/oauth/github/callback`
- GitHub repository integration app: `http://localhost:8080/api/auth/github/callback`
- Google sign-in: `http://localhost:8080/auth/oauth/google/callback`
- Google Workspace integration: `http://localhost:8080/api/google-calendar/auth/callback`

### Create the credentials

1. In **GitHub → Settings → Developer settings → OAuth Apps**, create a **New OAuth App** for HiCaptain sign-in. Set the homepage URL to `http://localhost:3000` and the authorization callback URL to the GitHub sign-in callback above. Copy its client ID and generate a client secret for `GITHUB_LOGIN_CLIENT_ID` and `GITHUB_LOGIN_CLIENT_SECRET` in `backend/.env`. This flow requests only `read:user` and `user:email`.
2. Create a **second GitHub OAuth App** for the project repository integration. Set its callback to the GitHub repository integration URL above. Put its client ID and secret in `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`. Keeping the apps separate lets sign-in avoid repository permissions. Set `GITHUB_TOKEN` if you use repository syncing.
3. In **Google Cloud Console → Google Auth Platform**, configure the consent screen and add your test accounts while the app is in testing. Under **Clients**, create an OAuth client of type **Web application**. Add **both** Google callback URLs above to its authorized redirect URIs. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google sign-in requests `openid`, `email`, and `profile`; connecting Workspace later asks for its own Calendar, Drive, and Tasks access.
4. Set `GITHUB_LOGIN_REDIRECT_URI`, `GITHUB_OAUTH_REDIRECT_URI`, `GOOGLE_LOGIN_REDIRECT_URI`, and `GOOGLE_OAUTH_REDIRECT_URI` to the matching registered URLs. Set `FRONTEND_URL=http://localhost:3000` and `NEXT_PUBLIC_API_URL=http://localhost:8080` for local development.

Use HTTPS frontend and backend URLs in production, register those exact backend callbacks with GitHub and Google, and set `FRONTEND_URL` to the public frontend origin. Keep client secrets in `backend/.env` or your deployment secret manager; never put them in `NEXT_PUBLIC_*` variables. Connect Google Workspace from **Settings** and GitHub repositories from a project's **GitHub** section. Social sign-in links an existing account only when the provider returns a verified email. New accounts choose an organization name after the provider returns and become its Admin; teammates using an invitation link join that invitation's organization after their verified email is checked.

## Repository layout

- [`frontend/`](frontend/) — Next.js app and user interface
- [`backend/`](backend/) — Spring Boot API, integrations, and persistence
- [Frontend setup](frontend/README.md) and [backend documentation](backend/README.md) — more component details

Run `npm run build` in `frontend/` and `bash ./mvnw test` in `backend/` to validate changes.
