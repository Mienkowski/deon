// Model oceny ryzyka 0–100 (sekcja 9) z regułami nadrzędnymi i statusami
// A/B/C/D (sekcja 10). Wynik NIE jest średnią — to max(suma ważona, reguły
// nadrzędne). Rozróżnia fakty ze źródeł od ocen algorytmu (sekcja 20).

import type {
  NameCandidate,
  RiskAssessment,
  RiskComponentScore,
  RiskStatus,
  SourceResult,
} from "@/lib/types";

const STATUS_MESSAGES: Record<RiskStatus, string> = {
  A: "W przeszukanych źródłach nie znaleziono istotnych kolizji. Wynik nie stanowi gwarancji dostępności prawnej. Przed rozpoczęciem inwestycji w markę zalecane jest pełne badanie zdolności rejestrowej i konsultacja z rzecznikiem patentowym.",
  B: "Znaleziono oznaczenia podobne językowo, fonetycznie lub branżowo. Ich znaczenie wymaga oceny zakresu ochrony, klas towarowych, terytorium oraz statusu prawnego.",
  C: "Znaleziono aktywne oznaczenie identyczne lub silnie podobne, odnoszące się do podobnych towarów lub usług na istotnym terytorium. Używanie proponowanej nazwy bez pogłębionej analizy prawnej może wiązać się z istotnym ryzykiem.",
  D: "Nie udało się uzyskać pełnych danych ze wszystkich wymaganych źródeł. Wynik jest niekompletny i nie powinien stanowić podstawy decyzji biznesowej.",
};

function territoryOverlap(candidate: NameCandidate, result: SourceResult): number {
  if (!result.territory) return 0.3; // nieznane terytorium — ostrożnie
  const terr = new Set(candidate.territories.map((t) => t.toUpperCase()));
  if (terr.has("WO")) return 1;
  const rt = result.territory.toUpperCase();
  if (terr.has(rt)) return 1;
  if (terr.has("EU") && ["EU", "PL", "DE", "FR", "ES", "IT"].includes(rt)) return 0.8;
  return 0.2;
}

function niceOverlap(candidate: NameCandidate, result: SourceResult): number {
  const selected = new Set((candidate.niceClasses ?? []).filter((c) => c.selected).map((c) => c.classNumber));
  if (selected.size === 0 || !result.niceClasses?.length) return 0.4; // brak danych — umiarkowanie
  const inter = result.niceClasses.filter((c) => selected.has(c)).length;
  if (inter > 0) return 1;
  // Różne klasy nie oznaczają automatycznie braku konfliktu (sekcja 8).
  return 0.35;
}

function statusActive(result: SourceResult): boolean {
  return result.legalStatus === "registered" || result.legalStatus === "applied" || result.legalStatus === "opposed";
}

export interface RiskInput {
  candidate: NameCandidate;
  results: SourceResult[]; // z policzonym similarity (dla trademark/company/web)
  sourcesUnavailable: number; // liczba źródeł, które FAILOWAŁY (status unavailable)
  automatedTrademarkSearch: boolean; // czy rejestry znaków przeszukano automatycznie
}

export function assessRisk(input: RiskInput): RiskAssessment {
  const { candidate, results } = input;
  const facts: string[] = [];
  const algo: string[] = [];
  const llm: string[] = [];

  // Znajdź najbardziej ryzykowny rekord znaku/firmy.
  const relevant = results.filter((r) => ["trademark", "company", "web"].includes(r.kind));
  let bestSim = 0;
  let bestPhon = 0;
  let identicalActiveSameField = false;
  let identicalReputable = false;
  let expiredButUsed = false;
  let top: SourceResult | undefined;

  for (const r of relevant) {
    const sim = r.similarity?.overall ?? 0;
    const phon =
      r.similarity?.components.find((c) => c.kind === "phonetic")?.score ?? 0;
    if (sim > bestSim) {
      bestSim = sim;
      top = r;
    }
    bestPhon = Math.max(bestPhon, phon);

    const identical = r.similarity?.identical ?? false;
    const sameField = niceOverlap(candidate, r) >= 0.8 || (r.kind === "web" && (r.actualUse ?? false));
    const sameTerr = territoryOverlap(candidate, r) >= 0.8;
    if (identical && statusActive(r) && sameField && sameTerr) {
      identicalActiveSameField = true;
      facts.push(`Identyczny aktywny znak w zbliżonej branży/terytorium: „${r.title}" (${r.provenance.source}).`);
    }
    if (identical && r.reputation) identicalReputable = true;
    if (r.legalStatus === "expired" && r.actualUse) expiredButUsed = true;
  }

  // ── Składowe punktowe ────────────────────────────────────────────────────
  const identityScore = bestSim >= 0.99 ? 30 : bestSim >= 0.9 ? 22 : bestSim >= 0.8 ? 14 : bestSim >= 0.65 ? 7 : 0;
  const textualScore = Math.round(Math.min(15, bestSim * 15));
  const phoneticScore = Math.round(Math.min(10, bestPhon * 10));
  const conceptScore = top?.similarity?.components.find((c) => c.kind === "conceptual")?.score
    ? Math.round(Math.min(5, (top.similarity!.components.find((c) => c.kind === "conceptual")!.score) * 5))
    : 0;
  const gsScore = top ? Math.round(niceOverlap(candidate, top) * 20) : 0;
  const territoryScore = top ? Math.round(territoryOverlap(candidate, top) * 8) : 0;
  const legalScore = top && statusActive(top) ? 7 : top?.legalStatus === "expired" ? 3 : 0;
  const reputationScore = identicalReputable ? 5 : top?.reputation ? 4 : 0;

  const components: RiskComponentScore[] = [
    { key: "identity", label: "Identyczność oznaczenia", value: identityScore, max: 30, rationale: `Najwyższe podobieństwo ${(bestSim * 100).toFixed(0)}%.` },
    { key: "textual", label: "Podobieństwo słowne", value: textualScore, max: 15, rationale: "Zagregowane algorytmy tekstowe." },
    { key: "phonetic", label: "Podobieństwo fonetyczne", value: phoneticScore, max: 10, rationale: `Najwyższe dopasowanie fonetyczne ${(bestPhon * 100).toFixed(0)}%.` },
    { key: "conceptual", label: "Podobieństwo koncepcyjne", value: conceptScore, max: 5, rationale: "Wspólne pojęcia/tłumaczenia (sygnał pomocniczy)." },
    { key: "goods", label: "Podobieństwo towarów i usług", value: gsScore, max: 20, rationale: "Nakładanie klas nicejskich / rynku." },
    { key: "territory", label: "Zgodność terytorium", value: territoryScore, max: 8, rationale: "Pokrycie terytorialne ochrony vs planowane rynki." },
    { key: "legal", label: "Aktywny status prawny", value: legalScore, max: 7, rationale: "Status wcześniejszego oznaczenia." },
    { key: "reputation", label: "Renoma / intensywność używania", value: reputationScore, max: 5, rationale: "Renoma lub wykryte faktyczne używanie." },
  ];

  algo.push(`Zagregowane podobieństwo najsilniejszego trafienia: ${(bestSim * 100).toFixed(0)}%.`);
  if (bestPhon > 0) algo.push(`Podobieństwo fonetyczne: ${(bestPhon * 100).toFixed(0)}%.`);

  const weighted = components.reduce((s, c) => s + c.value, 0);

  // ── Reguły nadrzędne ─────────────────────────────────────────────────────
  const overrides: string[] = [];
  let floor = 0;
  if (identicalActiveSameField) {
    floor = Math.max(floor, 61);
    overrides.push("Identyczny aktywny znak w tej samej branży i terytorium ⇒ co najmniej wysokie ryzyko.");
  }
  if (identicalReputable) {
    floor = Math.max(floor, 61);
    overrides.push("Identyczny znak renomowany ⇒ wysokie ryzyko także poza podobnymi klasami.");
  }
  if (expiredButUsed) {
    floor = Math.max(floor, 41);
    overrides.push("Znak wygasły, ale nadal używany ⇒ ryzyko nie jest zerowe.");
  }

  let score = Math.max(weighted, floor);
  score = Math.min(100, Math.max(0, Math.round(score)));

  const category = categoryFor(score);

  // ── Kompletność danych ────────────────────────────────────────────────────
  const completenessNote = !input.automatedTrademarkSearch
    ? "Rejestry znaków towarowych nie zostały przeszukane automatycznie (brak otwartego API) — wymagana ręczna weryfikacja przez przygotowane linki. Brak wyniku nie oznacza dostępności nazwy."
    : "Rejestry znaków przeszukane automatycznie.";
  if (!input.automatedTrademarkSearch) {
    overrides.push("Brak automatycznego przeszukania rejestrów znaków — status nie może wskazywać braku kolizji bez weryfikacji ręcznej (sekcja 9, reguła 4).");
  }

  // ── Status A/B/C/D ───────────────────────────────────────────────────────
  // D wyłącznie przy realnych awariach źródeł. Tryb manualny to stan oczekiwany,
  // ale uniemożliwia status A ("brak istotnych kolizji") — bez przeszukania
  // rejestrów podnosimy co najmniej do B (wymaga weryfikacji).
  let status: RiskStatus;
  if (input.sourcesUnavailable >= 2) status = "D";
  else if (score >= 61 || identicalActiveSameField) status = "C";
  else if (score >= 21 || relevant.some((r) => (r.similarity?.overall ?? 0) >= 0.6)) status = "B";
  else if (!input.automatedTrademarkSearch) status = "B";
  else status = "A";

  facts.push(...results.filter((r) => r.provenance.verificationStatus === "verified").slice(0, 5).map((r) => `Zweryfikowany rekord ze źródła ${r.provenance.source}: ${r.title}.`));

  return {
    score,
    category,
    status,
    statusMessage: STATUS_MESSAGES[status],
    components,
    overrideRulesApplied: overrides,
    dataCompleteness: {
      automatedTrademarkSearch: input.automatedTrademarkSearch,
      unavailableSources: input.sourcesUnavailable,
      note: completenessNote,
    },
    factsVsAssessment: { facts, algorithmicAssessments: algo, llmInferences: llm },
  };
}

function categoryFor(score: number): RiskAssessment["category"] {
  if (score <= 20) return "low";
  if (score <= 40) return "moderate_low";
  if (score <= 60) return "needs_review";
  if (score <= 80) return "high";
  return "very_high";
}

export function categoryLabelPL(c: RiskAssessment["category"]): string {
  return {
    low: "Niskie ryzyko",
    moderate_low: "Umiarkowanie niskie ryzyko",
    needs_review: "Ryzyko wymagające pogłębionej analizy",
    high: "Wysokie ryzyko",
    very_high: "Bardzo wysokie ryzyko",
  }[c];
}
