// Warstwa trwałości. Interfejs `Store` oddziela domenę od implementacji.
// MVP: in-memory (proces Next.js). Etap 3: PostgreSQL/pgvector — wystarczy
// dostarczyć nową implementację tego interfejsu.

import type { AuditLogEntry, SearchProject, SearchRun } from "@/lib/types";

export interface Store {
  createProject(p: SearchProject): Promise<SearchProject>;
  getProject(id: string): Promise<SearchProject | undefined>;
  listProjects(): Promise<SearchProject[]>;
  saveRun(run: SearchRun): Promise<SearchRun>;
  getRun(id: string): Promise<SearchRun | undefined>;
  listRuns(): Promise<SearchRun[]>;
  appendAudit(entry: AuditLogEntry): Promise<void>;
  listAudit(): Promise<AuditLogEntry[]>;
}

class InMemoryStore implements Store {
  private projects = new Map<string, SearchProject>();
  private runs = new Map<string, SearchRun>();
  private audit: AuditLogEntry[] = [];

  async createProject(p: SearchProject) {
    this.projects.set(p.id, p);
    return p;
  }
  async getProject(id: string) {
    return this.projects.get(id);
  }
  async listProjects() {
    return [...this.projects.values()];
  }
  async saveRun(run: SearchRun) {
    this.runs.set(run.id, run);
    return run;
  }
  async getRun(id: string) {
    return this.runs.get(id);
  }
  async listRuns() {
    return [...this.runs.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async appendAudit(entry: AuditLogEntry) {
    this.audit.push(entry);
  }
  async listAudit() {
    return [...this.audit].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }
}

// Singleton przetrwa hot-reload w dev dzięki globalThis.
const g = globalThis as unknown as { __ncaStore?: Store };
export const store: Store = g.__ncaStore ?? (g.__ncaStore = new InMemoryStore());

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  // Deterministyczny w obrębie procesu; wystarczający dla MVP/in-memory.
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
