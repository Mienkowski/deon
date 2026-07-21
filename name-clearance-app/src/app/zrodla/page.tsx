"use client";

import { useEffect, useState } from "react";

interface Source {
  id: string;
  name: string;
  accessMode: string;
  license: string;
  note: string;
}

interface Health {
  features: { llm: boolean; domainsRdap: boolean };
  missingOptionalEnv: string[];
}

function modeBadge(mode: string): string {
  if (mode === "rdap" || mode === "api") return "badge ok";
  if (mode === "manual") return "badge warn";
  return "badge muted";
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/data-sources").then((r) => r.json()).then((d) => setSources(d.sources ?? []));
    fetch("/api/health").then((r) => r.json()).then(setHealth);
  }, []);

  return (
    <div className="container">
      <header className="app-header">
        <h1>Źródła danych</h1>
        <span className="small muted">tryb dostępu i warunki korzystania</span>
      </header>
      <p className="subtitle">
        Każde źródło deklaruje tryb dostępu i licencję. Źródła bez otwartego API działają w trybie „manual verification required" — aplikacja generuje legalne linki, nie pobiera danych automatycznie i nie obchodzi zabezpieczeń.
      </p>

      {health && (
        <section className="card">
          <h2>Konfiguracja</h2>
          <div className="btn-row">
            <span className={health.features.domainsRdap ? "badge ok" : "badge warn"}>RDAP domen: {health.features.domainsRdap ? "włączony" : "wyłączony"}</span>
            <span className={health.features.llm ? "badge ok" : "badge muted"}>Warstwa LLM: {health.features.llm ? "aktywna" : "nieaktywna (algorytmy lokalne)"}</span>
          </div>
          {health.missingOptionalEnv.length > 0 && (
            <p className="small muted" style={{ marginTop: 8 }}>
              Niezdefiniowane opcjonalne zmienne (aplikacja działa bez nich): {health.missingOptionalEnv.join(", ")}
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2>Skonfigurowane źródła ({sources.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>Źródło</th><th>Tryb</th><th>Warunki / licencja</th></tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong><div className="small muted">{s.note}</div></td>
                  <td><span className={modeBadge(s.accessMode)}>{s.accessMode}</span></td>
                  <td className="small muted">{s.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
