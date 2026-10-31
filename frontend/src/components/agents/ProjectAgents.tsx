"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bot, Brain } from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "@/services/auth";
import {
  agentsApi,
  agentError,
  type Agent,
  type Choice,
  type Run,
  type Memory,
} from "@/services/agents";
import styles from "./agents.module.css";
const initial = {
  name: "",
  specialty: "planner",
  instructions:
    "Plan practical next steps. Preserve project decisions, explain uncertainties, and propose tasks with clear acceptance criteria.",
  providerId: "",
  allowedRoles: ["Admin", "ProjectManager", "Developer"],
  enabled: true,
  maxInputTokens: 10000,
  maxOutputTokens: 2000,
};
export default function ProjectAgents({
  projectId,
  canManage,
  taskSelection,
  onApproved,
}: {
  projectId: string;
  canManage: boolean;
  taskSelection?: { id: string };
  onApproved: () => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [memory, setMemory] = useState<Memory[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(initial);
  const [assignment, setAssignment] = useState({
    agentId: "",
    instruction: "",
    taskId: "",
    parentId: "",
  });
  const [note, setNote] = useState("");
  const user = authService.getUserFromToken();
  const reload = useCallback(async () => {
    const [a, r, m, c] = await Promise.all([
      agentsApi.agents(projectId),
      agentsApi.runs(projectId),
      agentsApi.memory(projectId),
      agentsApi.choices(projectId),
    ]);
    setAgents(a);
    setRuns(r);
    setMemory(m);
    setChoices(c);
    setError("");
  }, [projectId]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active)
        reload().catch((error) => {
          if (active) setError(agentError(error));
        });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [reload]);
  useEffect(() => {
    if (taskSelection)
      setAssignment((current) => ({
        ...current,
        taskId: taskSelection.id,
        parentId: "",
      }));
  }, [taskSelection]);
  async function act(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload();
      toast.success(message);
    } catch (error) {
      setError(agentError(error));
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void act(async () => {
      await agentsApi.saveAgent(projectId, form, editing?.id);
      setOpen(false);
    }, "AI teammate saved");
  }
  function assign(event: FormEvent) {
    event.preventDefault();
    void act(async () => {
      await agentsApi.assign(projectId, assignment);
      setAssignment((current) => ({
        ...current,
        instruction: "",
        parentId: "",
        taskId: "",
      }));
    }, "Assignment queued");
  }
  const executable = agents.filter(
    (agent) =>
      agent.enabled &&
      agent.allowedRoles.some((role) =>
        user?.roles?.includes(
          role as "Admin" | "ProjectManager" | "Developer" | "Client",
        ),
      ),
  );
  return (
    <section id="project-agents" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>HUMANS + AI, ONE TEAM</span>
          <h2>
            Project teammates <Bot size={23} />
          </h2>
          <p>
            Delegate planning and research with shared project context. A
            manager reviews every proposed change.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setForm({ ...initial, providerId: choices[0]?.id || "" });
              setOpen(true);
            }}
          >
            Add AI teammate
          </button>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            onClick={() =>
              void reload().catch((error) => setError(agentError(error)))
            }
          >
            Retry
          </button>
        </p>
      )}
      <div className={styles.grid}>
        {agents.map((agent) => (
          <div className={styles.card} key={agent.id}>
            <span className={styles.icon}>
              <Bot size={20} />
            </span>
            <h3>{agent.name}</h3>
            <p>
              {agent.specialty} · {agent.enabled ? "Available" : "Paused"}
            </p>
            <p>{agent.instructions}</p>
            <p className={styles.muted}>
              Can assign: {agent.allowedRoles.join(", ")} ·{" "}
              {agent.maxInputTokens.toLocaleString()} input /{" "}
              {agent.maxOutputTokens.toLocaleString()} output tokens
            </p>
            {canManage && (
              <button
                className={styles.secondary}
                onClick={() => {
                  setEditing(agent);
                  setForm(agent);
                  setOpen(true);
                }}
              >
                Configure
              </button>
            )}
          </div>
        ))}
      </div>
      {!agents.length && (
        <p className={styles.empty}>
          {canManage
            ? "Connect a provider in Settings, then add a planning or research teammate here."
            : "Your project manager can add AI teammates here."}
        </p>
      )}
      {open && (
        <form className={styles.form} onSubmit={save}>
          <h3>{editing ? "Configure teammate" : "Add AI teammate"}</h3>
          <div className={styles.grid}>
            <label>
              Name
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Specialty
              <select
                value={form.specialty}
                onChange={(e) =>
                  setForm({ ...form, specialty: e.target.value })
                }
              >
                <option value="planner">Planner</option>
                <option value="researcher">Researcher</option>
              </select>
            </label>
            <label>
              Provider
              <select
                required
                value={form.providerId}
                onChange={(e) =>
                  setForm({ ...form, providerId: e.target.value })
                }
              >
                <option value="">Select a provider</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.model}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Instructions
            <textarea
              required
              maxLength={6000}
              value={form.instructions}
              onChange={(e) =>
                setForm({ ...form, instructions: e.target.value })
              }
            />
          </label>
          <div className={styles.row}>
            {["Admin", "ProjectManager", "Developer"].map((role) => (
              <label className={styles.check} key={role}>
                <input
                  type="checkbox"
                  checked={form.allowedRoles.includes(role)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      allowedRoles: e.target.checked
                        ? [...form.allowedRoles, role]
                        : form.allowedRoles.filter((r) => r !== role),
                    })
                  }
                />
                {role === "ProjectManager" ? "Project manager" : role}
              </label>
            ))}
          </div>
          <div className={styles.grid}>
            <label>
              Input token limit
              <input
                type="number"
                required
                min={8192}
                max={32000}
                value={form.maxInputTokens}
                onChange={(e) =>
                  setForm({ ...form, maxInputTokens: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Output token limit
              <input
                type="number"
                required
                min={256}
                max={8000}
                value={form.maxOutputTokens}
                onChange={(e) =>
                  setForm({ ...form, maxOutputTokens: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>
          <div className={styles.row}>
            <button disabled={busy || !form.allowedRoles.length}>
              Save teammate
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {executable.length > 0 && (
        <form className={styles.form} onSubmit={assign}>
          <h3>
            {assignment.parentId
              ? "Continue the conversation"
              : "Give your teammate an assignment"}
          </h3>
          <label>
            AI teammate
            <select
              required
              value={assignment.agentId}
              onChange={(e) =>
                setAssignment({ ...assignment, agentId: e.target.value })
              }
            >
              <option value="">Select a teammate</option>
              {executable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            What needs doing?
            <textarea
              required
              maxLength={10000}
              placeholder="Break the launch work into reviewable tasks…"
              value={assignment.instruction}
              onChange={(e) =>
                setAssignment({ ...assignment, instruction: e.target.value })
              }
            />
          </label>
          {assignment.taskId && (
            <p>
              Using the selected Kanban task as context.{" "}
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setAssignment({ ...assignment, taskId: "" })}
              >
                Clear selection
              </button>
            </p>
          )}
          {assignment.parentId && (
            <p>
              Includes the previous output and original goal.{" "}
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setAssignment({ ...assignment, parentId: "" })}
              >
                Start a new conversation
              </button>
            </p>
          )}
          <p>
            Project data is sent to the selected model provider. AI output
            remains a proposal until approved.
          </p>
          <div>
            <button disabled={busy}>Assign work</button>
          </div>
        </form>
      )}
      <h3>Recent work</h3>
      <p className={styles.muted}>
        Latest 50 runs · usage and review history stay with the project
      </p>
      <div className={styles.grid}>
        {runs.map((run) => (
          <article className={styles.card} key={run.id}>
            <div className={styles.row}>
              <h3>{run.agentName}</h3>
              <span className={styles.badge}>{run.status.toLowerCase()}</span>
            </div>
            <p>{run.instruction}</p>
            <p className={styles.muted}>
              {run.ownerName} · {new Date(run.createdAt).toLocaleString()}
            </p>
            {run.error && <p className={styles.error}>{run.error}</p>}
            {run.output && (
              <div className={styles.output}>
                <p>{run.output.summary}</p>
                {run.output.tasks.map((task, index) => (
                  <div key={index}>
                    <strong>
                      {task.title} · {task.priority}
                    </strong>
                    <p>{task.description}</p>
                    <p>Acceptance: {task.acceptanceCriteria}</p>
                  </div>
                ))}
                {run.output.decisions.length > 0 && (
                  <>
                    <strong>Proposed project memory</strong>
                    <ul>
                      {run.output.decisions.map((decision, index) => (
                        <li key={index}>{decision}</li>
                      ))}
                    </ul>
                  </>
                )}
                {run.output.questions.length > 0 && (
                  <>
                    <strong>Questions for the team</strong>
                    <ul>
                      {run.output.questions.map((question, index) => (
                        <li key={index}>{question}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            <p className={styles.muted}>
              {run.inputTokens + run.outputTokens || run.accountedTokens || 0}{" "}
              tokens{run.usageEstimated ? " (estimated)" : ""}
              {run.costAvailable
                ? ` · ~$${run.estimatedCost.toFixed(5)}`
                : " · cost unavailable"}
            </p>
            <div className={styles.row}>
              {canManage && ["READY", "APPLYING"].includes(run.status) && (
                <>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await agentsApi.review(projectId, run.id, true);
                        onApproved();
                      }, "Proposal applied")
                    }
                  >
                    {run.status === "APPLYING"
                      ? "Resume approval"
                      : "Approve changes"}
                  </button>
                  {run.status === "READY" && (
                    <button
                      className={styles.danger}
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () => agentsApi.review(projectId, run.id, false),
                          "Proposal rejected",
                        )
                      }
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
              {run.output &&
                ["READY", "APPROVED", "REJECTED"].includes(run.status) &&
                executable.some((a) => a.id === run.agentId) && (
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setAssignment({
                        agentId: run.agentId,
                        instruction: "",
                        taskId: "",
                        parentId: run.id,
                      });
                      document
                        .getElementById("project-agents")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Follow up
                  </button>
                )}
              {["QUEUED", "RUNNING"].includes(run.status) &&
                (canManage || run.initiatedBy === user?.id) && (
                  <button
                    className={styles.danger}
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => agentsApi.cancel(projectId, run.id),
                        "Run stopped",
                      )
                    }
                  >
                    Stop run
                  </button>
                )}
            </div>
            <details>
              <summary>Activity history</summary>
              <ul>
                {run.events.map((event, index) => (
                  <li key={index}>
                    {new Date(event.at).toLocaleString()} · {event.message}
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
      {!runs.length && (
        <p className={styles.empty}>
          Assignments and review history will appear here.
        </p>
      )}
      <h3>
        <Brain size={18} /> Shared project memory
      </h3>
      <p>
        Approved decisions are available to future assignments. Draft output
        stays within its conversation.
      </p>
      {memory.map((item) => (
        <div className={styles.memory} key={item.id}>
          <p>{item.content}</p>
          <span className={styles.muted}>
            {item.sourceRunId
              ? "From an approved agent proposal"
              : "Added by a project manager"}
          </span>
          {canManage && (
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() =>
                void act(
                  () => agentsApi.forget(projectId, item.id),
                  "Memory removed",
                )
              }
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {canManage && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              await agentsApi.remember(projectId, note);
              setNote("");
            }, "Project memory saved");
          }}
        >
          <label>
            Add a project decision
            <textarea
              required
              maxLength={3000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div>
            <button disabled={busy}>Save decision</button>
          </div>
        </form>
      )}
    </section>
  );
}
