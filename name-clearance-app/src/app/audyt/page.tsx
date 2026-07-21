"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/lib/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="container">
      <header className="app-header">
        <h1>Dziennik audytu</h1>
        <button className="btn small no-print" onClick={load}>Odśwież</button>
      </header>
      <p className="subtitle">
        Każde uruchomienie badania i eksport raportu jest rejestrowane z czasem, aktorem i szczegółami — na potrzeby audytowalności wyników.
      </p>

      <section className="card">
        {loading ? (
          <p className="muted small"><span className="spinner" /> Wczytywanie…</p>
        ) : logs.length === 0 ? (
          <p className="muted small">Brak wpisów — uruchom badanie, aby wypełnić dziennik.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr><th>Czas</th><th>Aktor</th><th>Akcja</th><th>Szczegóły</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono small">{new Date(l.timestamp).toLocaleString("pl-PL")}</td>
                    <td className="small">{l.actor}</td>
                    <td><span className="badge muted">{l.action}</span></td>
                    <td className="small muted">{l.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
