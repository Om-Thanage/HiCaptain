import axios from "axios";
import api from "@/lib/api";
export type Provider = {
  id: string;
  name: string;
  kind: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  remainingTokens: number;
  usedTokens: number;
  revision: number;
  inputPrice: number;
  outputPrice: number;
};
export type Agent = {
  id: string;
  name: string;
  specialty: string;
  instructions: string;
  providerId: string;
  allowedRoles: string[];
  enabled: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
};
export type Proposal = {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
};
export type Run = {
  id: string;
  agentId: string;
  agentName: string;
  ownerName: string;
  initiatedBy: string;
  status: string;
  instruction: string;
  createdAt: string;
  parentId?: string;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  accountedTokens: number;
  usageEstimated: boolean;
  costAvailable: boolean;
  estimatedCost: number;
  events: { at: string; actor: string; message: string }[];
  output?: {
    summary: string;
    tasks: Proposal[];
    decisions: string[];
    questions: string[];
  };
};
export type Memory = {
  id: string;
  content: string;
  approvedBy: string;
  sourceRunId?: string;
};
export type Choice = { id: string; name: string; kind: string; model: string };
const base = (project: string) =>
  `/api/agents/projects/${encodeURIComponent(project)}`;
export const agentsApi = {
  providers: async (): Promise<Provider[]> =>
    (await api.get("/api/agents/providers")).data,
  saveProvider: async (data: unknown, id?: string): Promise<Provider> =>
    (
      await (id
        ? api.put(`/api/agents/providers/${id}`, data)
        : api.post("/api/agents/providers", data))
    ).data,
  choices: async (project: string): Promise<Choice[]> =>
    (await api.get(`${base(project)}/choices`)).data,
  agents: async (project: string): Promise<Agent[]> =>
    (await api.get(base(project))).data,
  saveAgent: async (project: string, data: unknown, id?: string) =>
    (
      await (id
        ? api.put(`${base(project)}/${id}`, data)
        : api.post(base(project), data))
    ).data,
  runs: async (project: string): Promise<Run[]> =>
    (await api.get(`${base(project)}/runs`)).data,
  assign: async (project: string, data: unknown) =>
    (await api.post(`${base(project)}/runs`, data)).data,
  review: async (project: string, id: string, accept: boolean) =>
    (await api.post(`${base(project)}/runs/${id}/review`, { accept })).data,
  cancel: async (project: string, id: string) =>
    (await api.post(`${base(project)}/runs/${id}/cancel`)).data,
  memory: async (project: string): Promise<Memory[]> =>
    (await api.get(`${base(project)}/memory`)).data,
  remember: async (project: string, content: string) =>
    (await api.post(`${base(project)}/memory`, { content })).data,
  forget: async (project: string, id: string) =>
    api.delete(`${base(project)}/memory/${id}`),
};
export function agentError(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Could not complete this action. Check your access and try again.";
}
