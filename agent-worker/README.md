# Project AI teammates

HiCaptain uses a small LangGraph worker for planning and research. Each assignment produces structured task proposals, decisions, and questions. Claude (Anthropic), OpenAI and local Ollama are supported; users supply their own API keys or hardware. The worker has no shell, repository-write, browsing, messaging, or role-management tools. A research teammate reasons over supplied project sources; it does not perform web research.

## Orchestrator and specialists

A teammate with the **orchestrator** specialty runs on a strong model and delegates to up to four specialists (frontend, backend, testing, deployment, planner, researcher) on a second, usually cheaper provider:

```
context ─► plan (orchestrator) ─► work (specialists in parallel) ─► merge (orchestrator) ─► publish
```

The orchestrator splits the assignment, chooses retrieval for each specialist, and merges their proposals into one. Specialists never plan their own lookups: in the underlying research, small models planned retrieval poorly (a 17.9-point drop at 8B), while engine-assembled context came within 5 points of gold evidence. The merged result is still a proposal that a manager approves or rejects.

A run reserves two calls on the orchestrator provider and one call per allowed specialist on the specialist provider. Each provider is settled with its own confirmed usage, and run cost uses each provider's prices. Specialists produce proposals only; they do not write code or deploy.

## Context engine

`context_engine.py` decides what goes into every prompt, within the agent's input limit:

| Layer | What it does |
| --- | --- |
| Event log | Tasks, approved decisions, commits, pull requests, meetings, client feedback and earlier reviewed proposals become immutable records. |
| Indexes | BM25 keyword index and a vector index side by side. The default vector index is a dependency-free hashed n-gram embedding; pass `embed=` to use a dense embedding model. |
| Retrieval | Reciprocal Rank Fusion merges both lists, then reranks at 0.9 relevance + 0.1 importance, with no recency bias. |
| Assembly | Budget split of 10% system, 5% rules, 10% facts, 40% recent, 35% retrieved, with unused room passed on. Decisions appear as dated notes. Retrieved records use edge ordering: rank 1 sits just before the question and rank 2 opens the block, so the weakest sit in the middle. Stable content comes first and the question last, which helps prompt caching. |

Each teammate uses one **context method**, so methods can be compared under the same budget:

- `truncation`: the most recent records that fit (baseline).
- `engine`: hybrid retrieval with the budget split and edge ordering (default).
- `planned`: orchestrator only. The orchestrator picks up to three fixed operations per specialist (`search`, `keyword`, `filter_by_time`, `get_event`, `get_facts`, `count`) and the engine runs them. `count` returns an exact computed answer, because counting questions fail even with perfect evidence.

The assignment, original goal, selected task and previous output are always included. Sizes are measured in UTF-8 bytes, which never undercount tokens. Activity records are read for retrieval but excluded from the context fingerprint, so a new commit does not invalidate a proposal awaiting review. Project text, decisions and outputs do change the fingerprint.

Every completed run records a context trace: the method, candidate and selected record counts, prompt size, selected record IDs and specialists. **Context method comparison** in the project page, backed by `GET /api/agents/projects/{project}/evaluation`, reports each method's approval rate, tokens, records used and cost. Human approval is the feedback signal that offline benchmarks lack.

## Connecting Claude, OpenAI and OpenAI-compatible services

These providers connect with an organization API key created in the provider's developer console (Claude Console or OpenAI platform), entered by an organization admin in **Settings → Agent providers**. HiCaptain does not accept personal chat-subscription sign-ins: every model call is billed to the organization's key, within its token allowance. One key serves every member, so people with only Claude Pro or ChatGPT Plus need nothing extra. Those subscriptions don't include API access. Anthropic's Claude Code terms also say third-party developers should use API keys and may not route requests through Pro/Max plan credentials, so HiCaptain does not drive subscription logins.

**OpenAI-compatible** providers cover services with a chat-completions API, such as Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai`), Groq (`https://api.groq.com/openai/v1`) and OpenRouter (`https://openrouter.ai/api/v1`). Some offer free usage, such as OpenRouter's `:free` models and the Gemini and Groq free tiers; check their current limits. The address must be HTTPS on a host listed in `AGENT_COMPATIBLE_ALLOWED_ORIGINS`, because the worker sends the decrypted key there. Changing a saved provider's address requires entering the key again. JSON mode differs between these services, so the worker asks for the schema in the prompt, takes the JSON object from the reply (code fences are allowed) and validates it like any other output. Keys are encrypted at rest and decrypted only for the worker's run.

Claude calls use the official `anthropic` SDK with structured outputs validated against the same schemas. Retries are disabled, so an uncertain request is failed rather than billed twice. On models that support it, the request opts into server-side refusal fallbacks (`fallbacks: "default"`); a final refusal fails the run. Claude Opus 5.5 is the suggested orchestrator model. The output token limit also covers the model's thinking, so allow enough room.

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
- Context candidates are the current project timeline, task descriptions/status/deadlines/assignees, approved decisions, the latest 100 commits, pull requests, meetings, feedback items and reviewed proposals, the selected task, latest instruction, original goal, and optional previous output. The context engine selects from them within a conservative UTF-8 byte allowance. Task descriptions are clipped to 3,000 characters; up to 200 tasks plus the selected task and 200 memory records are considered. The prompt reports omitted records. This is bounded context retrieval, not a guarantee that the entire project fits in every model request.
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

The backend suite includes real MongoDB/HTTP-controller coverage for isolation, key encryption, current access, stale context, approval idempotency, memory continuity, token accounting, leases and duplicate-call prevention. Worker tests cover all three provider protocols (Claude through a fake SDK client), structured output validation, the context engine (hybrid retrieval, edge ordering, budgets, planned operations, pinned content), orchestrator planning, the specialist cap, usage splitting, and refusal to repeat interrupted specialist calls. They also cover checkpoint recovery without credential persistence. No test makes a paid model call.

For an optional live integration check, start a separate backend on port 8082 using a local database ending in `_tests`, with the matching synthetic worker secret. Do not point this at a production backend. Set `HICAPTAIN_SMOKE_TEST=1`, `HICAPTAIN_API_URL=http://localhost:8082`, `MONGODB_URI`, `MONGODB_DATABASE`, and `AGENT_WORKER_SECRET`, then run `python smoke_test.py`. Port 11434 must be free. This starts a local Ollama-compatible fixture, creates test data, executes real LangGraph/Mongo checkpoints, approves a task, and checks follow-up context. It makes no paid model calls and leaves test records in the dedicated database for inspection.
