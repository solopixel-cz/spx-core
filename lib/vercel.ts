/**
 * Vercel REST API pro nasazení vizitek (spx-dbc v2): domény ve společném
 * projektu vizitek a Global Config s mapou adres. Bez env se nic nevolá
 * a CRM ukládá jen do Firestore.
 */

const API = "https://api.vercel.com";

function env() {
  return {
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_CARDS_PROJECT_ID,
    configId: process.env.VERCEL_GLOBAL_CONFIG_ID,
  };
}

export function vercelConfigured(): boolean {
  const e = env();
  return !!(e.token && e.teamId && e.projectId && e.configId);
}

export class VercelError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { token, teamId } = env();
  if (!token || !teamId) throw new VercelError("Vercel není napojený (chybí env)", 0);
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}teamId=${encodeURIComponent(teamId)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } }).error;
    throw new VercelError(err?.message ?? `Vercel API ${res.status}`, res.status, err?.code);
  }
  return data as T;
}

export interface ProjectDomain {
  name: string;
  verified: boolean;
  redirect?: string | null;
  verification?: { type: string; domain: string; value: string; reason: string }[];
}

export interface DomainConfig {
  misconfigured: boolean;
  configuredBy: "A" | "CNAME" | "dns-01" | "http" | null;
  recommendedIPv4: { rank: number; value: string[] }[];
  recommendedCNAME: { rank: number; value: string }[];
}

const project = () => encodeURIComponent(env().projectId ?? "");

export async function getProjectDomain(name: string): Promise<ProjectDomain | null> {
  try {
    return await call<ProjectDomain>("GET", `/v9/projects/${project()}/domains/${encodeURIComponent(name)}`);
  } catch (e) {
    if (e instanceof VercelError && e.status === 404) return null;
    throw e;
  }
}

/** Přidá doménu do projektu vizitek; `redirect` = 308 na hlavní adresu. */
export async function addProjectDomain(name: string, redirect: string | null): Promise<ProjectDomain> {
  return call<ProjectDomain>("POST", `/v10/projects/${project()}/domains`, {
    name,
    redirect,
    redirectStatusCode: redirect ? 308 : null,
  });
}

export async function updateProjectDomainRedirect(name: string, redirect: string | null): Promise<void> {
  await call("PATCH", `/v9/projects/${project()}/domains/${encodeURIComponent(name)}`, {
    redirect,
    redirectStatusCode: redirect ? 308 : null,
  });
}

export async function removeProjectDomain(name: string): Promise<void> {
  try {
    await call("DELETE", `/v9/projects/${project()}/domains/${encodeURIComponent(name)}`);
  } catch (e) {
    if (e instanceof VercelError && e.status === 404) return;
    throw e;
  }
}

export async function getDomainConfig(name: string): Promise<DomainConfig> {
  return call<DomainConfig>(
    "GET",
    `/v6/domains/${encodeURIComponent(name)}/config?projectIdOrName=${project()}`
  );
}

/** Zapíše (upsert) položky do Global Config společného pro vizitky. */
export async function upsertGlobalConfig(items: Record<string, unknown>): Promise<void> {
  const { configId } = env();
  await call("PATCH", `/v1/global-config/${encodeURIComponent(configId ?? "")}/items`, {
    items: Object.entries(items).map(([key, value]) => ({ operation: "upsert", key, value })),
  });
}
