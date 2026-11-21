"use client";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { agentsApi, agentError, type Provider } from "@/services/agents";
import styles from "./agents.module.css";
const initial = {
  name: "",
  kind: "ollama",
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  apiKey: "",
  enabled: true,
  remainingTokens: 100000,
  inputPrice: 0,
  outputPrice: 0,
};
// Starting points only; any model ID the provider accepts can be entered.
const suggestedModel: Record<string, string> = {
  ollama: "qwen3:8b",
  anthropic: "claude-opus-5-5",
};
// OpenAI-compatible endpoints the default deployment allows (AGENT_COMPATIBLE_ALLOWED_ORIGINS).
const compatibleServices = [
  ["https://generativelanguage.googleapis.com/v1beta/openai", "Google Gemini"],
  ["https://api.groq.com/openai/v1", "Groq"],
  ["https://openrouter.ai/api/v1", "OpenRouter"],
] as const;
// Defaults for a new teammate: 10,000 input and 2,000 output tokens per model call.
const perRun = (provider: { inputPrice: number; outputPrice: number }) =>
  (10000 * provider.inputPrice + 2000 * provider.outputPrice) / 1_000_000;
const money = (value: number) =>
  value === 0 ? "$0" : value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
export default function AgentProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () => agentsApi.providers().then(setProviders);
  useEffect(() => {
    reload().catch((error) => setError(agentError(error)));
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await agentsApi.saveProvider(
        { ...form, revision: editing?.revision },
        editing?.id,
      );
      setOpen(false);
      await reload();
      toast.success("Provider saved");
    } catch (error) {
      setError(agentError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>YOUR MODELS, YOUR KEYS</span>
          <h2>Agent providers</h2>
          <p>
            Connect Claude, OpenAI, an OpenAI-compatible service or a local
            Ollama model. One provider serves the whole organization, so
            members don&apos;t need their own AI subscription or API key. Only
            organization admins can change credentials and allowances.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm(initial);
            setOpen(true);
          }}
        >
          Add provider
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.grid}>
        {providers.map((provider) => (
          <div className={styles.card} key={provider.id}>
            <span className={styles.icon}>
              <KeyRound size={18} />
            </span>
            <h3>{provider.name}</h3>
            <p>
              {provider.kind} · {provider.model} ·{" "}
              {provider.enabled ? "Enabled" : "Paused"}
            </p>
            <p>
              {provider.remainingTokens.toLocaleString()} tokens available ·{" "}
              {provider.usedTokens.toLocaleString()} accounted
            </p>
            <p className={styles.muted}>
              Up to {money(perRun(provider))} per model call at default limits
            </p>
            <button
              className={styles.secondary}
              onClick={() => {
                setEditing(provider);
                setForm({ ...provider, apiKey: "" });
                setOpen(true);
              }}
            >
              Edit provider
            </button>
          </div>
        ))}
      </div>
      {!providers.length && !error && (
        <p className={styles.empty}>
          Add a provider to make AI teammates available to your projects.
        </p>
      )}
      {open && (
        <form className={styles.form} onSubmit={save}>
          <h3>{editing ? "Edit provider" : "Connect a provider"}</h3>
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
              Provider
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value,
                    apiKey: "",
                    model: suggestedModel[e.target.value] ?? form.model,
                    baseUrl:
                      e.target.value === "ollama"
                        ? initial.baseUrl
                        : e.target.value === "compatible"
                          ? compatibleServices[0][0]
                          : form.baseUrl,
                  })
                }
              >
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude (Anthropic)</option>
                <option value="compatible">
                  OpenAI-compatible (Gemini, Groq, OpenRouter)
                </option>
              </select>
            </label>
            <label>
              Model
              <input
                required
                maxLength={120}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            {form.kind === "compatible" && (
              <label>
                Service address
                <input
                  required
                  type="url"
                  list="compatible-services"
                  placeholder="https://…/v1"
                  value={form.baseUrl}
                  onChange={(e) =>
                    setForm({ ...form, baseUrl: e.target.value })
                  }
                />
                <datalist id="compatible-services">
                  {compatibleServices.map(([url, label]) => (
                    <option key={url} value={url}>
                      {label}
                    </option>
                  ))}
                </datalist>
              </label>
            )}
            {form.kind === "ollama" ? (
              <label>
                Ollama origin
                <input
                  required
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) =>
                    setForm({ ...form, baseUrl: e.target.value })
                  }
                />
              </label>
            ) : (
              <label>
                API key
                <input
                  type="password"
                  autoComplete="new-password"
                  required={
                    !editing ||
                    editing.kind !== form.kind ||
                    (form.kind === "compatible" &&
                      editing.baseUrl !== form.baseUrl.replace(/\/+$/, ""))
                  }
                  placeholder={
                    editing
                      ? "Leave blank to keep the saved key"
                      : "Your API key"
                  }
                  maxLength={500}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </label>
            )}
            <label>
              Available token allowance
              <input
                required
                type="number"
                min={0}
                max={1000000000}
                value={form.remainingTokens}
                onChange={(e) =>
                  setForm({ ...form, remainingTokens: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Input price / million tokens (USD)
              <input
                required
                type="number"
                min={0}
                max={10000}
                step="any"
                value={form.inputPrice}
                onChange={(e) =>
                  setForm({ ...form, inputPrice: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Output price / million tokens (USD)
              <input
                required
                type="number"
                min={0}
                max={10000}
                step="any"
                value={form.outputPrice}
                onChange={(e) =>
                  setForm({ ...form, outputPrice: Number(e.target.value) })
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
          <p className={styles.muted}>
            At these prices, one model call at the default limits (10,000
            input, 2,000 output tokens) costs at most{" "}
            {money(perRun(form))}. An orchestrator run makes two calls on its
            own provider plus one per specialist.
          </p>
          <p>
            Token allowances reserve the maximum per run. Unknown usage is
            accounted conservatively. Prices are estimates you supply; Ollama
            uses your own hardware. The deployment must allow the selected
            Ollama origin or service address. Claude, OpenAI and
            OpenAI-compatible services use an organization API key from the
            provider&apos;s developer console; chat subscriptions such as Claude
            Pro or ChatGPT Plus don&apos;t include API access. Some
            OpenAI-compatible services offer free usage; check their current
            limits. On Claude models, maximum output tokens also cover the
            model&apos;s thinking.
          </p>
          <div className={styles.row}>
            <button disabled={busy}>Save provider</button>
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
    </section>
  );
}
