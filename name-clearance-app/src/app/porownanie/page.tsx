"use client";

import { useState } from "react";
import type { MarkType } from "@/lib/types";
import type { ComparisonResult } from "@/lib/compare";

const TERRITORIES = [
  { code: "PL", label: "Polska" },
  { code: "EU", label: "Unia Europejska" },
  { code: "WO", label: "Świat" },
  { code: "DE", label: "Niemcy" },
  { code: "US", label: "USA" },
];

function riskColor(score: number): string {
  if (score <= 20) return "var(--ok)";
  if (score <= 40) return "#8fce6b";
  if (score <= 60) return "var(--warn)";
  if (score <= 80) return "#ff9f45";
  return "var(--danger)";
}

export default function ComparePage() {
  const [names, setNames] = useState<string[]>(["", ""]);
  const [markType, setMarkType] = useState<MarkType>("product");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [territories, setTerritories] = useState<string[]>(["PL", "EU"]);
  const [accepted, setAccepted] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  function setName(i: number, v: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }
  function addName() {
    if (names.length < 10) setNames((prev) => [...prev, ""]);
  }
  function removeName(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }
  function toggleTerritory(code: string) {
    setTerritories((prev) => (prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]));
  }

  async function run() {
    setError(null);
    setResult(null);
    const valid = names.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 2) {
      setError("Podaj co najmniej 2 nazwy.");
      return;
    }
    setRunning(true);
    try {
      const candidates = valid.map((name) => ({
        name,
        markType,
        description,
        industry,
        territories,
      }));
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidates, requestedBy: "web-user" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.formErrors?.join(", ") || JSON.stringify(data?.error) || "Błąd porównania.");
        return;
      }
      setResult(data.comparison);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1>Porównanie nazw</h1>
        <span className="small muted">do 10 kandydatów · wspólna branża i terytorium</span>
      </header>
      <p className="subtitle">
        Zestaw kilka nazw dla tego samego produktu i porównaj ich ryzyko, kolizje i dostępność domen. System wskaże rekomendowaną kolejność — ale żadna nazwa nie jest „w pełni bezpieczna".
      </p>

      <section className="card no-print">
        <h2>Kandydaci ({names.length})</h2>
        {names.map((n, i) => (
          <div key={i} className="btn-row" style={{ marginBottom: 8 }}>
            <input type="text" value={n} onChange={(e) => setName(i, e.target.value)} placeholder={`Nazwa #${i + 1}`} style={{ flex: 1 }} />
            {names.length > 2 && <button className="btn small" onClick={() => removeName(i)} aria-label="usuń">✕</button>}
          </div>
        ))}
        {names.length < 10 && <button className="btn small" onClick={addName}>+ dodaj nazwę</button>}

        <div className="grid cols-3" style={{ marginTop: 16 }}>
          <div>
            <label htmlFor="type">Typ oznaczenia</label>
            <select id="type" value={markType} onChange={(e) => setMarkType(e.target.value as MarkType)}>
              <option value="product">Produkt</option>
              <option value="service">Usługa</option>
              <option value="company">Firma</option>
              <option value="application">Aplikacja</option>
              <option value="technology">Technologia</option>
            </select>
          </div>
          <div>
            <label htmlFor="industry">Branża</label>
            <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="np. edukacja, oprogramowanie" />
          </div>
          <div>
            <label htmlFor="desc">Krótki opis</label>
            <input id="desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <h3>Terytoria</h3>
        <div className="chips">
          {TERRITORIES.map((t) => (
            <label key={t.code} className={`chip ${territories.includes(t.code) ? "active" : ""}`}>
              <input type="checkbox" checked={territories.includes(t.code)} onChange={() => toggleTerritory(t.code)} />
              {t.label}
            </label>
          ))}
        </div>

        <label className="chip" style={{ margin: "16px 0 12px" }}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          Akceptuję zastrzeżenie prawne (wynik nie jest gwarancją dostępności).
        </label>
        <div className="btn-row">
          <button className="btn primary" onClick={run} disabled={!accepted || running}>
            {running ? <span className="spinner" /> : null} Porównaj nazwy
          </button>
        </div>
        {error && <p className="small" style={{ color: "var(--danger)" }}>⚠ {error}</p>}
      </section>

      {result && (
        <>
          <section className="card">
            <h2>Wynik porównania</h2>
            <p className="small muted">
              Najwyższe ryzyko: <strong style={{ color: riskColor(result.highestRisk) }}>{result.highestRisk}</strong> ·
              średnie ryzyko: <strong>{result.averageRisk}</strong> ·
              rekomendowana (najniższe ryzyko): <strong>{result.recommendedName}</strong>
            </p>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Nazwa</th><th>Ryzyko</th><th>Status</th>
                    <th>Identyczne</th><th>Podobne</th><th>Domeny wolne</th>
                    <th>Aktywne podmioty</th><th>Kompletność</th>
                  </tr>
                </thead>
                <tbody>
                  {result.candidates.map((c) => (
                    <tr key={c.runId}>
                      <td><strong>{c.rank}</strong></td>
                      <td>{c.name}</td>
                      <td><span className="badge" style={{ color: riskColor(c.riskScore), borderColor: riskColor(c.riskScore) }}>{c.riskScore}</span></td>
                      <td>{c.riskStatus}</td>
                      <td>{c.identicalCount}</td>
                      <td>{c.similarCount}</td>
                      <td>{c.domainsAvailable}/{c.domainsChecked}</td>
                      <td>{c.activeEntities}</td>
                      <td>{(c.completeness * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="disclaimer">{result.disclaimer}</div>
        </>
      )}
    </div>
  );
}
