# Project AI teammates

HiCaptain uses a small LangGraph worker for planning and research. Each assignment produces structured task proposals, decisions, and questions. OpenAI and local Ollama are supported; users supply their own keys or hardware. The worker has no shell, repository-write, browsing, messaging, or role-management tools. A research teammate reasons over supplied project sources; it does not perform web research.

## Run locally

Requires Python 3.12+, the Java backend, and MongoDB. Use the same database as the backend for checkpoints.

1. Set a stable `PROVIDER_TOKEN_ENCRYPTION_KEY` in `backend/.env` (`openssl rand -base64 32`). Existing installations must preserve their existing token encryption key. Generate `AGENT_WORKER_SECRET` with `openssl rand -hex 32` and put the same value in the backend and worker environments. Restart the backend.
2. Install and configure the worker:

   ```bash
   cd agent-worker
   python -m venv .venv
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   # Linux/macOS: source .venv/bin/activate
   python -m pip install -r requirements.lock
   cp .env.example .env
   ```

   Set `AGENT_WORKER_SECRET`, `HICAPTAIN_API_URL`, `MONGODB_URI`, and `MONGODB_DATABASE` in this `.env`. Use the database-scoped application account when MongoDB authentication is enabled.
3. Run `python worker.py`. An absent/short secret disables worker access. The worker polls the durable backend queue; multiple workers can claim separate assignments safely.
4. As an organization admin, open **Settings → Agent providers**. Add OpenAI with an API key, model ID, token allowance, and current USD prices per million tokens, or select an Ollama model you have already downloaded (`ollama pull <model>`). The model must support JSON output. No silent model fallback or paid retry occurs.
5. Open a project, add an AI teammate, select the provider, instructions, specialty, allowed roles and token limits. Assign work there or choose **Ask AI teammate** on a Kanban task.
6. Review the proposal. Organization admins or that project's assigned manager can approve/reject it. Approval creates pending Kanban tasks and saves proposed decisions to project memory. A task retains the initiating human as its primary owner; developer assignment is left for the project team. Follow up to refine an output while retaining the original goal.

Ollama origins must exactly match the deployment's comma-separated `AGENT_OLLAMA_ALLOWED_ORIGINS`. Only HTTP(S) origins without paths, query strings or user information are accepted. Do not expose Ollama to the public internet. In Docker, `localhost` means the worker container: use `http://host.docker.internal:11434` for a host model or `http://ollama:11434` for a service on the same network, and ensure Ollama listens on that interface.

## Docker

Configure the backend `.env`, including strong MongoDB passwords, the provider encryption key, and worker secret, then:

```bash
cd backend
docker compose --profile agents up --build -d
```

The optional worker uses the same private database and application account. Its filesystem is read-only, capabilities are dropped, and no port is published. Existing MongoDB volumes need the application-user migration described in [the backend guide](../backend/README.md). Omitting the `agents` profile starts the existing product without a worker.

## Permissions and context

- Credentials and allowances: organization admins only. The API returns safe provider choices to project members and never serializes encrypted keys.
- Agent configuration and shared memory: organization admins or the assigned project manager. An agent's role allowlist further restricts which project members may assign it; clients cannot execute agents.
- Each worker operation checks the initiating user's current account, membership, project access, agent permissions and configuration. Removing access or disabling/changing the configuration stops publication and approval. Worker authentication uses the deployment secret plus an expiring per-run lease. Treat the worker and database as trusted backend components.
- Before inference and approval, the backend fingerprints current project/task/memory context. A changed source invalidates the proposal; ask for a fresh run. Review application is resumable with deterministic task/memory IDs, preventing duplicates after interruption.
- Context contains the current project timeline, task descriptions/status/deadlines/assignees, approved decisions, selected task, latest instruction, original goal, and optional previous output. Retrieval uses deterministic relevance ranking within a conservative UTF-8 byte allowance. Task descriptions are clipped to 3,000 characters; up to 200 tasks plus the selected task and 200 memory records are retrieved. The prompt reports omitted records. This is bounded context retrieval, not a guarantee that the entire project fits in every model request.
- Only manager-approved decisions enter shared memory. Draft outputs remain available as explicit conversation context. Managers can add/remove memory. Project members can read project proposals and memory.
- LangGraph stores workflow state in `agent_checkpoints` and `agent_checkpoint_writes` with a 30-day TTL. Provider credentials and worker/run authentication tokens stay out of checkpoints. Project text and outputs are stored there; normal database access controls and backups apply. LangSmith tracing defaults to disabled.

## Usage, failure and recovery

A run atomically reserves its input + output token limits before queuing. Confirmed usage returns the remainder to the provider's organization allowance. Cancellation before inference refunds the reservation. After a model request starts, missing/uncertain usage is accounted at the full reservation: it may have been billed by the provider. Allowances are application controls; provider billing limits remain useful, and changing an allowance does not cancel a request already in flight.

Usage and configured USD price estimates appear on each run. Prices are supplied by the admin; these are not provider invoices. Ollama's default zero token price excludes electricity/hardware costs. Missing model usage is marked estimated. Updating provider settings requires its current revision so concurrent usage cannot be overwritten accidentally.

Leases expire after 180 seconds and heartbeat every 20 seconds; claims are bounded to three recovery attempts. Saved generation results resume at publication without a second model call. A crash after a model request starts but before its output is checkpointed fails conservatively; start a new assignment explicitly. Cancellation or revocation cannot guarantee that an already-running external model stops charging. Failed runs return a generic diagnostic and never log credential-bearing provider responses.

## Verification

```bash
python -m unittest -v
```

The backend suite includes real MongoDB/HTTP-controller coverage for isolation, key encryption, current access, stale context, approval idempotency, memory continuity, token accounting, leases and duplicate-call prevention. Worker tests cover both provider protocols, structured output validation, context limits and checkpoint recovery without credential persistence.

For an optional live integration check, start a separate backend on port 8082 using a local database ending in `_tests`, with the matching synthetic worker secret. Do not point this at a production backend. Set `HICAPTAIN_SMOKE_TEST=1`, `HICAPTAIN_API_URL=http://localhost:8082`, `MONGODB_URI`, `MONGODB_DATABASE`, and `AGENT_WORKER_SECRET`, then run `python smoke_test.py`. Port 11434 must be free. This starts a local Ollama-compatible fixture, creates test data, executes real LangGraph/Mongo checkpoints, approves a task, and checks follow-up context. It makes no paid model calls and leaves test records in the dedicated database for inspection.
