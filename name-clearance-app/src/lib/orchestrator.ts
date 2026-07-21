// Orkiestracja przebiegu wyszukiwania (SearchRun). Łączy: generator wariantów,
// generator zapytań, konektory (RDAP + deep-linki), silnik podobieństwa, model
// ryzyka i rekomendacje. Zapisuje wynik w store z pełnym audytem.

import type {
  NameCandidate,
  SearchRun,
  SourceResult,
} from "@/lib/types";
import { store, newId } from "@/lib/store";
import { generateVariants } from "@/lib/variants";
import { generateQueries } from "@/lib/queries";
import { runConnectors } from "@/lib/connectors";
import { assessSimilarity } from "@/lib/similarity";
import { assessRisk } from "@/lib/risk";
import { generateRecommendations } from "@/lib/recommendations";

/** Nadaje wynikom znaków/firm/web ocenę podobieństwa względem wariantów. */
function scoreResults(candidate: NameCandidate, variants: string[], results: SourceResult[]): SourceResult[] {
  return results.map((r) => {
    if (!["trademark", "company", "web"].includes(r.kind)) return r;
    const target = r.matchedValue ?? r.title;
    let best = assessSimilarity(candidate.name, target);
    for (const v of variants) {
      const s = assessSimilarity(v, target);
      if (s.overall > best.overall) best = s;
    }
    return { ...r, similarity: best };
  });
}

export async function runSearch(candidate: NameCandidate, requestedBy: string): Promise<SearchRun> {
  const runId = newId("run");
  const now = new Date().toISOString();

  const variants = generateVariants(candidate.name);
  const topVariantValues = variants.slice(0, 8).map((v) => v.value);
  const queries = generateQueries(candidate, topVariantValues);

  // Stan początkowy — natychmiast zapisany (sekcja 23: potwierdzenie startu).
  let run: SearchRun = {
    id: runId,
    candidate,
    createdAt: now,
    status: "running",
    variants,
    queries,
    sources: [],
    results: [],
    recommendations: [],
    requestedBy,
  };
  await store.saveRun(run);
  await store.appendAudit({
    id: newId("audit"),
    timestamp: now,
    actor: requestedBy,
    action: "search_run.start",
    detail: `Nazwa: ${candidate.name}; terytoria: ${candidate.territories.join(", ")}`,
  });

  // Konektory (RDAP realny + deep-linki manualne).
  const { sources, results: rawResults } = await runConnectors(candidate);
  const scored = scoreResults(candidate, topVariantValues, rawResults);

  const unavailable = sources.filter((s) => s.status === "unavailable").length;
  // Czy jakiekolwiek źródło znaków przeszukano automatycznie (status ok/partial).
  const trademarkSources = sources.filter((s) => s.kind === "trademark");
  const automatedTrademarkSearch = trademarkSources.some((s) => s.status === "ok" || s.status === "partial");

  const risk = assessRisk({
    candidate,
    results: scored,
    sourcesUnavailable: unavailable,
    automatedTrademarkSearch,
  });
  const recommendations = generateRecommendations(candidate, risk, scored);

  const finishedAt = new Date().toISOString();
  const anyPartial = sources.some((s) => s.status === "partial" || s.status === "manual");
  run = {
    ...run,
    status: unavailable > 0 || anyPartial ? "partial" : "completed",
    finishedAt,
    sources,
    results: scored,
    risk,
    recommendations,
  };
  await store.saveRun(run);
  await store.appendAudit({
    id: newId("audit"),
    timestamp: finishedAt,
    actor: requestedBy,
    action: "search_run.complete",
    detail: `Ryzyko: ${risk.score} (${risk.status}); wyników: ${scored.length}`,
  });

  return run;
}
