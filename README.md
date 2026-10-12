# HiCaptain

HiCaptain is a project workspace for teams. The current interface follows a light, TaskHub inspired design and brings projects, people, tasks, meetings, files, and development activity together.

## What you can do

- **Organizations and access:** Create an account and become the admin of a new organization. Invite teammates by email; people with existing accounts can join directly, while new teammates create an account from the invitation link. A person can belong to multiple organizations and hold multiple roles in each one. Admins manage organization roles, and project access can be scoped to selected projects.
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

   Set `MONGODB_URI` and a strong `JWT_SECRET`. Keep `.env` out of Git. For invitation emails, set the `SMTP_*` fields and `FRONTEND_URL`. For Google Workspace, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and a stable `GOOGLE_TOKEN_ENCRYPTION_KEY`. For GitHub, set `GITHUB_TOKEN`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, and `GITHUB_OAUTH_REDIRECT_URI`. See [backend/.env.example](backend/.env.example) for the complete list.

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

- GitHub: `http://localhost:8080/api/auth/github/callback`
- Google: `http://localhost:8080/api/google-calendar/auth/callback`

Use your deployed backend URLs in production. Set `FRONTEND_URL` to the public frontend origin so OAuth returns to the right app. Connect Google Workspace from **Settings**; connect GitHub from a project's **GitHub** section.

## Repository layout

- [`frontend/`](frontend/) — Next.js app and user interface
- [`backend/`](backend/) — Spring Boot API, integrations, and persistence
- [Frontend setup](frontend/README.md) and [backend documentation](backend/README.md) — more component details

Run `npm run build` in `frontend/` and `bash ./mvnw test` in `backend/` to validate changes.
