"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MarkType,
  NiceClassSuggestion,
  SearchRun,
  SourceResult,
} from "@/lib/types";
import { generateVariants } from "@/lib/variants";
import { categoryLabelPL } from "@/lib/risk";

const MARK_TYPES: { value: MarkType; label: string }[] = [
  { value: "product", label: "Produkt" },
  { value: "service", label: "Usługa" },
  { value: "company", label: "Firma" },
  { value: "project", label: "Projekt" },
  { value: "application", label: "Aplikacja" },
  { value: "technology", label: "Technologia" },
  { value: "event", label: "Wydarzenie" },
  { value: "organization", label: "Organizacja" },
  { value: "personal_brand", label: "Marka osobista" },
];

const TERRITORIES = [
  { code: "PL", label: "Polska" },
  { code: "EU", label: "Unia Europejska" },
  { code: "WO", label: "Świat" },
  { code: "DE", label: "Niemcy" },
  { code: "FR", label: "Francja" },
  { code: "GB", label: "Wlk. Brytania" },
  { code: "US", label: "USA" },
];

const DISCLAIMER =
  "Aplikacja służy do wstępnego wyszukiwania i oceny ryzyka. Nie świadczy usług prawnych, nie zastępuje profesjonalnego badania zdolności rejestrowej ani opinii rzecznika patentowego lub adwokata. Wynik zależy od kompletności i aktualności zewnętrznych baz danych. Brak wykrytego wyniku nie oznacza, że oznaczenie jest prawnie dostępne ani że jego używanie nie narusza praw osób trzecich.";

function riskColor(score: number): string {
  if (score <= 20) return "var(--ok)";
  if (score <= 40) return "#8fce6b";
  if (score <= 60) return "var(--warn)";
  if (score <= 80) return "#ff9f45";
  return "var(--danger)";
}

function statusBadgeClass(status?: string): string {
  if (status === "ok") return "badge ok";
  if (status === "partial" || status === "manual") return "badge warn";
  if (status === "unavailable") return "badge danger";
  return "badge muted";
}

export default function Page() {
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState("");
  const [markType, setMarkType] = useState<MarkType>("product");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [territories, setTerritories] = useState<string[]>(["PL", "EU"]);
  const [goodsServices, setGoodsServices] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [plannedDomain, setPlannedDomain] = useState("");
  const [slogan, setSlogan] = useState("");
  const [competitors, setCompetitors] = useState("");

  const [niceClasses, setNiceClasses] = useState<NiceClassSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  const [run, setRun] = useState<SearchRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string; status: string; risk: { score: number; status: string } | null }[]>([]);
  const [filterKind, setFilterKind] = useState<string>("all");

  const variants = useMemo(() => (name.trim() ? generateVariants(name).slice(0, 24) : []), [name]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/search-runs");
      const data = await res.json();
      setHistory(data.runs ?? []);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    loadHistory();
  }, []);

  function toggleTerritory(code: string) {
    setTerritories((prev) => (prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]));
  }

  async function suggestClasses() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/nice-classes/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, industry, goodsServices }),
      });
      const data = await res.json();
      setNiceClasses(data.suggestions ?? []);
    } finally {
      setSuggesting(false);
    }
  }

  function toggleClass(idx: number) {
    setNiceClasses((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected, source: "user" } : c)));
  }

  async function startSearch() {
    setError(null);
    setRun(null);
    setRunning(true);
    try {
      const candidate = {
        name: name.trim(),
        markType,
        description,
        industry,
        territories,
        goodsServices,
        plannedDomain: plannedDomain || undefined,
        slogan: slogan || undefined,
        competitors: competitors ? competitors.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        niceClasses: niceClasses.length ? niceClasses : undefined,
      };
      const res = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate, requestedBy: "web-user" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.formErrors?.join(", ") || data?.error || "Błąd walidacji formularza.");
        return;
      }
      setRun(data.run);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd.");
    } finally {
      setRunning(false);
    }
  }

  async function loadRun(id: string) {
    const res = await fetch(`/api/search-runs/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRun(data.run);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  function exportReport(format: "json" | "csv") {
    if (!run) return;
    window.open(`/api/reports/${run.id}/export?format=${format}`, "_blank");
  }

  const canRun = accepted && name.trim().length > 0 && territories.length > 0 && !running;
  const filteredResults = run?.results.filter((r) => filterKind === "all" || r.kind === filterKind) ?? [];

  return (
    <div className="container">
      <header className="app-header">
        <h1>
          Name Clearance <span className="brand-dot">Assistant</span>
        </h1>
        <span className="small muted">Wstępna ocena ryzyka nazwy · nie jest poradą prawną</span>
      </header>
      <p className="subtitle">
        Badanie kolizji nazwy w znakach towarowych, rejestrach firm, domenach, patentach i sieci — z jawnym modelem ryzyka i audytowalnym raportem.
      </p>

      <div className="disclaimer">
        <strong>Zastrzeżenie prawne.</strong> {DISCLAIMER}
      </div>

      {/* ── FORMULARZ ─────────────────────────────────────────────── */}
      <section className="card no-print">
        <h2>1 · Dane badanej nazwy</h2>
        <div className="grid cols-2">
          <div>
            <label htmlFor="name">Proponowana nazwa *</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Odznaka Plus" />
          </div>
          <div>
            <label htmlFor="type">Typ oznaczenia *</label>
            <select id="type" value={markType} onChange={(e) => setMarkType(e.target.value as MarkType)}>
              {MARK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid cols-2" style={{ marginTop: 14 }}>
          <div>
            <label htmlFor="industry">Branża *</label>
            <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="np. edukacja, certyfikacja cyfrowa, oprogramowanie" />
          </div>
          <div>
            <label htmlFor="goods">Planowane towary i usługi</label>
            <input id="goods" type="text" value={goodsServices} onChange={(e) => setGoodsServices(e.target.value)} placeholder="np. aplikacja, cyfrowe poświadczenia, szkolenia" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label htmlFor="desc">Krótki opis produktu/usługi *</label>
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Do czego służy nazwa, jak będzie używana." />
        </div>

        <h3>Terytoria planowanego użycia *</h3>
        <div className="chips">
          {TERRITORIES.map((t) => (
            <label key={t.code} className={`chip ${territories.includes(t.code) ? "active" : ""}`}>
              <input type="checkbox" checked={territories.includes(t.code)} onChange={() => toggleTerritory(t.code)} />
              {t.label} <span className="muted small">{t.code}</span>
            </label>
          ))}
        </div>

        <details style={{ marginTop: 16 }} open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
          <summary>Pola dodatkowe (domena, slogan, konkurenci)</summary>
          <div className="grid cols-3" style={{ marginTop: 12 }}>
            <div>
              <label htmlFor="domain">Planowana domena</label>
              <input id="domain" type="text" value={plannedDomain} onChange={(e) => setPlannedDomain(e.target.value)} placeholder="odznakaplus.pl" />
            </div>
            <div>
              <label htmlFor="slogan">Slogan</label>
              <input id="slogan" type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
            </div>
            <div>
              <label htmlFor="comp">Konkurenci (po przecinku)</label>
              <input id="comp" type="text" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
            </div>
          </div>
        </details>
      </section>

      {/* ── KLASY NICEJSKIE ───────────────────────────────────────── */}
      <section className="card no-print">
        <h2>2 · Sugerowane klasy nicejskie</h2>
        <div className="btn-row">
          <button className="btn" onClick={suggestClasses} disabled={suggesting}>
            {suggesting ? <span className="spinner" /> : null} Zaproponuj klasy z opisu
          </button>
          <span className="small muted">Reguły słów kluczowych; każdą klasę możesz włączyć/wyłączyć.</span>
        </div>
        {niceClasses.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {niceClasses.map((c, i) => (
              <label key={c.classNumber} className="comp-row" style={{ cursor: "pointer" }}>
                <span>
                  <input type="checkbox" checked={c.selected} onChange={() => toggleClass(i)} style={{ marginRight: 8 }} />
                  <strong>Kl. {c.classNumber}</strong> — {c.title}
                  <div className="small muted">{c.rationale}</div>
                </span>
                <span className="badge muted">pewność {(c.confidence * 100).toFixed(0)}%</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ── WARIANTY ──────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <section className="card no-print">
          <h2>3 · Warianty nazwy objęte badaniem <span className="badge muted">{variants.length}</span></h2>
          <div className="chips">
            {variants.map((v, i) => (
              <span key={i} className="variant-tag" title={`${v.type}${v.note ? " · " + v.note : ""}`}>
                {v.value}<span className="w">{(v.weight * 100).toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── URUCHOMIENIE ──────────────────────────────────────────── */}
      <section className="card no-print">
        <label className="chip" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          Akceptuję zastrzeżenie prawne i rozumiem, że wynik nie jest gwarancją dostępności.
        </label>
        <div className="btn-row">
          <button className="btn primary" onClick={startSearch} disabled={!canRun}>
            {running ? <span className="spinner" /> : null} Uruchom badanie
          </button>
          {!accepted && <span className="small muted">Zaznacz akceptację zastrzeżenia, aby uruchomić.</span>}
        </div>
        {error && <p className="small" style={{ color: "var(--danger)" }}>⚠ {error}</p>}
      </section>

      {/* ── WYNIKI ────────────────────────────────────────────────── */}
      {run && <Report run={run} filterKind={filterKind} setFilterKind={setFilterKind} filteredResults={filteredResults} exportReport={exportReport} />}

      {/* ── HISTORIA ──────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section className="card no-print">
          <h2>Historia badań</h2>
          {history.map((h) => (
            <div key={h.id} className="source-item">
              <span>
                <strong>{h.name}</strong> <span className="small muted mono">{h.id}</span>
              </span>
              <span className="btn-row">
                {h.risk && (
                  <span className="badge" style={{ color: riskColor(h.risk.score), borderColor: riskColor(h.risk.score) }}>
                    ryzyko {h.risk.score} · {h.risk.status}
                  </span>
                )}
                <button className="btn small" onClick={() => loadRun(h.id)}>Otwórz</button>
              </span>
            </div>
          ))}
        </section>
      )}

      <footer className="small muted" style={{ marginTop: 30, textAlign: "center" }}>
        Name Clearance Assistant · źródła: UPRP, EUIPO TMview, WIPO, EPO, KRS, CEIDG, RDAP · wynik wstępny, nie prawny.
      </footer>
    </div>
  );
}

// ── Komponent raportu wyników ────────────────────────────────────────────────
function Report({
  run,
  filterKind,
  setFilterKind,
  filteredResults,
  exportReport,
}: {
  run: SearchRun;
  filterKind: string;
  setFilterKind: (k: string) => void;
  filteredResults: SourceResult[];
  exportReport: (f: "json" | "csv") => void;
}) {
  const risk = run.risk;
  const kinds = ["all", "trademark", "company", "domain", "web", "social", "patent"];
  return (
    <>
      <section className="card">
        <div className="btn-row no-print" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Wynik badania: {run.candidate.name}</h2>
          <span className="btn-row">
            <button className="btn small" onClick={() => exportReport("json")}>Eksport JSON</button>
            <button className="btn small" onClick={() => exportReport("csv")}>Eksport CSV</button>
            <button className="btn small" onClick={() => window.print()}>PDF / Drukuj</button>
          </span>
        </div>
        <p className="small muted" style={{ marginTop: 6 }}>
          Badanie: {new Date(run.createdAt).toLocaleString("pl-PL")} · zlecający: {run.requestedBy} · terytoria: {run.candidate.territories.join(", ")} · status przebiegu: <span className={statusBadgeClass(run.status)}>{run.status}</span>
        </p>

        {risk && (
          <>
            <div className="gauge" style={{ marginTop: 16 }}>
              <div className="score" style={{ color: riskColor(risk.score) }}>{risk.score}<span className="small muted" style={{ fontSize: 16 }}>/100</span></div>
              <div className="riskbar"><div style={{ width: `${risk.score}%`, background: riskColor(risk.score) }} /></div>
              <span className="badge" style={{ color: riskColor(risk.score), borderColor: riskColor(risk.score) }}>
                {categoryLabelPL(risk.category)} · status {risk.status}
              </span>
            </div>
            <p style={{ marginTop: 12 }}>{risk.statusMessage}</p>
            <div className="disclaimer" style={{ marginTop: 12, marginBottom: 0 }}>
              <strong>Kompletność danych.</strong> {risk.dataCompleteness.note}
              {risk.dataCompleteness.unavailableSources > 0 &&
                ` Niedostępne źródła: ${risk.dataCompleteness.unavailableSources}.`}
            </div>
          </>
        )}
      </section>

      {risk && (
        <section className="card">
          <h2>Składowe oceny ryzyka</h2>
          {risk.components.map((c) => (
            <div key={c.key} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{c.label}</span>
                <span className="mono">{c.value} / {c.max}</span>
              </div>
              <div className="comp-bar"><div style={{ width: `${(c.value / c.max) * 100}%` }} /></div>
              <div className="small muted">{c.rationale}</div>
            </div>
          ))}
          {risk.overrideRulesApplied.length > 0 && (
            <>
              <h3>Zastosowane reguły nadrzędne</h3>
              <ul className="small">{risk.overrideRulesApplied.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}

          <h3>Fakty vs ocena algorytmu vs wnioski LLM</h3>
          <div className="facts-grid">
            <div className="facts-col">
              <h4 style={{ color: "var(--ok)" }}>Fakty ze źródeł</h4>
              <ul>{risk.factsVsAssessment.facts.length ? risk.factsVsAssessment.facts.map((f, i) => <li key={i}>{f}</li>) : <li>Brak zweryfikowanych rekordów.</li>}</ul>
            </div>
            <div className="facts-col">
              <h4 style={{ color: "var(--accent)" }}>Ocena algorytmu</h4>
              <ul>{risk.factsVsAssessment.algorithmicAssessments.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div className="facts-col">
              <h4 style={{ color: "var(--accent-2)" }}>Wnioski LLM</h4>
              <ul>{risk.factsVsAssessment.llmInferences.length ? risk.factsVsAssessment.llmInferences.map((f, i) => <li key={i}>{f}</li>) : <li>LLM nieaktywny — wynik w pełni algorytmiczny.</li>}</ul>
            </div>
          </div>
        </section>
      )}

      {/* Statusy źródeł */}
      <section className="card">
        <h2>Przeszukane źródła i ich status</h2>
        {run.sources.map((s) => (
          <div key={s.id} className="source-item">
            <span>
              <strong>{s.name}</strong> <span className={statusBadgeClass(s.status)}>{s.status}</span> <span className="badge muted">{s.accessMode}</span>
              <div className="small muted">{s.message}</div>
              <div className="source-links">
                {s.queryUrls.slice(0, 3).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer">otwórz zapytanie {i + 1} ↗</a>
                ))}
              </div>
            </span>
          </div>
        ))}
      </section>

      {/* Rekomendacje */}
      <section className="card">
        <h2>Rekomendowane działania</h2>
        <ul>
          {run.recommendations.map((r) => (
            <li key={r.id} style={{ marginBottom: 6 }}>
              <span className={`badge ${r.priority === "important" ? "danger" : r.priority === "suggested" ? "warn" : "muted"}`}>{r.priority}</span>{" "}
              {r.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Wyniki */}
      <section className="card">
        <div className="btn-row no-print" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Znalezione oznaczenia i rekordy <span className="badge muted">{run.results.length}</span></h2>
          <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} style={{ width: "auto" }}>
            {kinds.map((k) => <option key={k} value={k}>{k === "all" ? "wszystkie typy" : k}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Typ</th><th>Wynik</th><th>Podobieństwo</th><th>Status</th><th>Źródło</th><th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => (
                <tr key={r.id}>
                  <td><span className="badge muted">{r.kind}</span></td>
                  <td>
                    {r.title}
                    {r.note && <div className="small muted">{r.note}</div>}
                    {r.similarity && <div className="small muted">{r.similarity.explanation}</div>}
                  </td>
                  <td className="mono">{r.similarity ? `${(r.similarity.overall * 100).toFixed(0)}%${r.similarity.identical ? " (identyczne)" : ""}` : "—"}</td>
                  <td>
                    <span className={r.provenance.verificationStatus === "verified" ? "badge ok" : "badge warn"}>{r.provenance.verificationStatus}</span>
                  </td>
                  <td className="small">{r.provenance.source}</td>
                  <td>{r.provenance.link ? <a href={r.provenance.link} target="_blank" rel="noopener noreferrer">↗</a> : "—"}</td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr><td colSpan={6} className="muted small">Brak rekordów dla wybranego filtra.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
