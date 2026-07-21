// Porównywanie wielu nazw-kandydatów (sekcja 19). Uruchamia badanie dla każdego
// kandydata i buduje metryki porównawcze. System może wskazać nazwę o najniższym
// ryzyku, ale NIGDY nie określa jej jako „w pełni bezpiecznej" / „gwarantowanie
// dostępnej".

import type { NameCandidate, SearchRun } from "@/lib/types";
import { runSearch } from "@/lib/orchestrator";

export interface CandidateComparison {
  runId: string;
  name: string;
  riskScore: number;
  riskStatus: string;
  identicalCount: number; // liczba identycznych oznaczeń
  similarCount: number; // liczba podobnych (>=60%) niebędących identycznymi
  domainsAvailable: number; // domeny prawdopodobnie wolne (RDAP)
  domainsChecked: number;
  activeEntities: number; // aktywne podmioty/znaki o podobnej nazwie
  socialToVerify: number; // profile social do ręcznej weryfikacji
  completeness: number; // 0–1 kompletność analizy
  rank: number; // rekomendowana kolejność (1 = najniższe ryzyko)
}

export interface ComparisonResult {
  candidates: CandidateComparison[];
  highestRisk: number;
  averageRisk: number;
  recommendedName: string | null;
  disclaimer: string;
}

const COMPARE_DISCLAIMER =
  "Wskazana kolejność odzwierciedla wyłącznie porównanie ryzyka w przeszukanych źródłach. Żadna z nazw nie jest w pełni bezpieczna ani gwarantowanie dostępna — każda wymaga pełnego badania zdolności rejestrowej.";

function metricsFor(run: SearchRun): CandidateComparison {
  const results = run.results;
  const identicalCount = results.filter((r) => r.similarity?.identical).length;
  const similarCount = results.filter(
    (r) => !r.similarity?.identical && (r.similarity?.overall ?? 0) >= 0.6,
  ).length;
  const domains = results.filter((r) => r.kind === "domain");
  const domainsAvailable = domains.filter((d) => (d.note ?? "").includes("wolna")).length;
  const activeEntities = results.filter(
    (r) => ["trademark", "company"].includes(r.kind) &&
      ["registered", "applied", "opposed"].includes(r.legalStatus ?? ""),
  ).length;
  const socialToVerify = results.filter((r) => r.kind === "social").length;
  const completeness = run.risk?.dataCompleteness.automatedTrademarkSearch ? 1 : 0.5;

  return {
    runId: run.id,
    name: run.candidate.name,
    riskScore: run.risk?.score ?? 0,
    riskStatus: run.risk?.status ?? "D",
    identicalCount,
    similarCount,
    domainsAvailable,
    domainsChecked: domains.length,
    activeEntities,
    socialToVerify,
    completeness,
    rank: 0,
  };
}

/** Sortuje po ryzyku rosnąco, remisy po liczbie identycznych i podobnych. */
export function rankComparisons(items: CandidateComparison[]): CandidateComparison[] {
  const sorted = [...items].sort(
    (a, b) =>
      a.riskScore - b.riskScore ||
      a.identicalCount - b.identicalCount ||
      a.similarCount - b.similarCount,
  );
  sorted.forEach((c, i) => (c.rank = i + 1));
  return sorted;
}

export function summarize(items: CandidateComparison[]): ComparisonResult {
  const ranked = rankComparisons(items);
  const scores = ranked.map((c) => c.riskScore);
  const highestRisk = scores.length ? Math.max(...scores) : 0;
  const averageRisk = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
  // Rekomendujemy najniżej sklasyfikowaną nazwę — ale nie jako „bezpieczną".
  const recommendedName = ranked.length ? ranked[0].name : null;
  return { candidates: ranked, highestRisk, averageRisk, recommendedName, disclaimer: COMPARE_DISCLAIMER };
}

export async function runComparison(
  candidates: NameCandidate[],
  requestedBy: string,
): Promise<{ runs: SearchRun[]; comparison: ComparisonResult }> {
  const limited = candidates.slice(0, 10); // maks. 10 kandydatów (sekcja 19)
  const runs: SearchRun[] = [];
  for (const c of limited) {
    runs.push(await runSearch(c, requestedBy));
  }
  const comparison = summarize(runs.map(metricsFor));
  return { runs, comparison };
}

export { COMPARE_DISCLAIMER };
