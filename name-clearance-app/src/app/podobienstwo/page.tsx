"use client";

import { useState } from "react";
import type { SourceResult } from "@/lib/types";

function simColor(score: number): string {
  if (score >= 0.85) return "var(--danger)";
  if (score >= 0.65) return "#ff9f45";
  if (score >= 0.5) return "var(--warn)";
  return "var(--muted)";
}

export default function SimilarityPage() {
  const [name, setName] = useState("");
  const [source, setSource] = useState<"sample" | "custom" | "epo">("sample");
  const [records, setRecords] = useState("");
  const [minScore, setMinScore] = useState(0.45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    query: string;
    source: { label: string; license: string; status: string; message: string };
    corpusSize: number;
    results: SourceResult[];
    disclaimer: string;
  } | null>(null);

  async function run() {
    setError(null);
    setData(null);
    if (!name.trim()) {
      setError("Podaj nazwę do analizy.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/similarity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), source, records: source === "custom" ? records : undefined, minScore }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j?.hint ? `${j.error} ${j.hint}` : j?.error?.formErrors?.join(", ") || j?.error || "Błąd analizy.");
        return;
      }
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1>Analiza podobieństwa nazw</h1>
        <span className="small muted">tekst + fonetyka PL · z wyjaśnieniem każdego wyniku</span>
      </header>
      <p className="subtitle">
        Podstawą oceny są <strong>znaki towarowe</strong> (słowne i słowno-graficzne). Porównaj nazwę z korpusem znaków, firm i — pomocniczo — patentów. Silnik zwraca ranking podobnych oznaczeń wraz z algorytmem, który wykrył podobieństwo (tekst, fonetyka PL, koncepcja). Patenty nie chronią samej nazwy — są jedynie sygnałem wcześniejszego użycia.
      </p>

      <section className="card no-print">
        <div className="grid cols-2">
          <div>
            <label htmlFor="name">Badana nazwa</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Odznaka Plus" />
          </div>
          <div>
            <label htmlFor="src">Źródło korpusu</label>
            <select id="src" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              <option value="sample">Zbiór przykładowy (demonstracyjny)</option>
              <option value="custom">Import własnej listy nazw</option>
              <option value="epo">EPO OPS — realne patenty (wymaga klucza)</option>
            </select>
          </div>
        </div>

        {source === "custom" && (
          <div style={{ marginTop: 12 }}>
            <label htmlFor="rec">Lista nazw — jedna w wierszu (opcjonalnie: <span className="mono">nazwa | właściciel | rodzaj | terytorium</span>)</label>
            <textarea id="rec" value={records} onChange={(e) => setRecords(e.target.value)} rows={6}
              placeholder={"Odznaka Plus | EduCert | trademark | PL\nBadgePro | Credly | trademark | US\nDigital Badge | OpenBadge | trademark | EU"} />
          </div>
        )}
        {source === "epo" && (
          <p className="small muted" style={{ marginTop: 8 }}>
            Uwaga: to środowisko może blokować egress sieciowy — realne EPO OPS zadziała po wdrożeniu z kluczem i dostępem do sieci. W przeciwnym razie zwróci komunikat o niedostępności.
          </p>
        )}

        <div className="grid cols-2" style={{ marginTop: 12, alignItems: "end" }}>
          <div>
            <label htmlFor="min">Próg podobieństwa: {(minScore * 100).toFixed(0)}%</label>
            <input id="min" type="range" min={0} max={0.9} step={0.05} value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={run} disabled={loading}>
              {loading ? <span className="spinner" /> : null} Analizuj podobieństwo
            </button>
          </div>
        </div>
        {error && <p className="small" style={{ color: "var(--danger)" }}>⚠ {error}</p>}
      </section>

      {data && (
        <>
          <section className="card">
            <h2>Wyniki dla „{data.query}"</h2>
            <p className="small muted">
              Źródło: <strong>{data.source.label}</strong> · rozmiar korpusu: {data.corpusSize} · trafień: {data.results.length}
              {data.source.message ? ` · ${data.source.message}` : ""}
            </p>
            <p className="small muted">{data.source.license}</p>

            {data.results.length === 0 ? (
              <p className="muted">Brak trafień powyżej progu. Obniż próg lub zmień źródło korpusu.</p>
            ) : (
              data.results.map((r) => (
                <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span>
                      <strong>{r.title}</strong> <span className="badge muted">{r.kind}</span>
                      {r.similarity?.identical && <span className="badge danger" style={{ marginLeft: 6 }}>identyczne</span>}
                      <div className="small muted">
                        {r.owner ? `${r.owner} · ` : ""}{r.legalStatus}{r.territory ? ` · ${r.territory}` : ""}
                        {r.niceClasses?.length ? ` · kl. ${r.niceClasses.join(", ")}` : ""}
                        {r.provenance.externalId ? ` · ${r.provenance.externalId}` : ""}
                      </div>
                    </span>
                    <span className="mono" style={{ color: simColor(r.similarity?.overall ?? 0), fontWeight: 700, fontSize: 18 }}>
                      {((r.similarity?.overall ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="comp-bar" style={{ marginTop: 6 }}>
                    <div style={{ width: `${(r.similarity?.overall ?? 0) * 100}%` }} />
                  </div>
                  <div className="small muted" style={{ marginTop: 6 }}>{r.similarity?.explanation}</div>
                  <details style={{ marginTop: 6 }}>
                    <summary>Wyjaśnienie algorytmiczne</summary>
                    <table style={{ marginTop: 8 }}>
                      <thead><tr><th>Algorytm</th><th>Warstwa</th><th>Wynik</th><th>Szczegóły</th></tr></thead>
                      <tbody>
                        {r.similarity?.components.map((c, i) => (
                          <tr key={i}>
                            <td>{c.algorithm}</td>
                            <td><span className="badge muted">{c.kind}</span></td>
                            <td className="mono">{(c.score * 100).toFixed(0)}%</td>
                            <td className="small muted">{c.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(r.similarity?.sharedPrefix || r.similarity?.sharedSuffix) && (
                      <p className="small muted" style={{ marginTop: 6 }}>
                        {r.similarity?.sharedPrefix ? `Wspólny prefiks: „${r.similarity.sharedPrefix}". ` : ""}
                        {r.similarity?.sharedSuffix ? `Wspólny sufiks: „${r.similarity.sharedSuffix}".` : ""}
                      </p>
                    )}
                    {r.provenance.link && <a className="small" href={r.provenance.link} target="_blank" rel="noopener noreferrer">rekord źródłowy ↗</a>}
                  </details>
                </div>
              ))
            )}
          </section>
          <div className="disclaimer">{data.disclaimer}</div>
        </>
      )}
    </div>
  );
}
