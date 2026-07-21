// Generowanie raportu końcowego (sekcja 11). Formaty maszynowe: JSON, CSV.
// PDF/DOCX generowane po stronie klienta przez druk przeglądarki (ekran raportu
// ma dedykowany layout do druku). Każdy wiersz zawiera źródło, link, prowenancję
// i rozróżnienie faktu od oceny.

import type { SearchRun } from "@/lib/types";
import { categoryLabelPL } from "@/lib/risk";

const DISCLAIMER =
  "Aplikacja służy do wstępnego wyszukiwania i oceny ryzyka. Nie świadczy usług prawnych, nie zastępuje profesjonalnego badania zdolności rejestrowej ani opinii rzecznika patentowego lub adwokata. Wynik zależy od kompletności i aktualności zewnętrznych baz danych. Brak wykrytego wyniku nie oznacza, że oznaczenie jest prawnie dostępne ani że jego używanie nie narusza praw osób trzecich.";

export function buildReportJson(run: SearchRun): object {
  return {
    meta: {
      reportId: `report_${run.id}`,
      generatedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    },
    name: run.candidate.name,
    searchedAt: run.createdAt,
    finishedAt: run.finishedAt,
    requestedBy: run.requestedBy,
    territories: run.candidate.territories,
    markType: run.candidate.markType,
    description: run.candidate.description,
    industry: run.candidate.industry,
    niceClasses: run.candidate.niceClasses,
    variants: run.variants,
    queries: run.queries,
    sources: run.sources,
    results: run.results,
    risk: run.risk
      ? { ...run.risk, categoryLabel: categoryLabelPL(run.risk.category) }
      : undefined,
    recommendations: run.recommendations,
  };
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildResultsCsv(run: SearchRun): string {
  const header = [
    "kind", "title", "matchedValue", "owner", "legalStatus", "territory",
    "niceClasses", "filingDate", "registrationDate", "expiryDate",
    "similarityOverall", "identical", "source", "verificationStatus",
    "retrievedAt", "link", "note",
  ];
  const rows = run.results.map((r) =>
    [
      r.kind,
      r.title,
      r.matchedValue ?? "",
      r.owner ?? "",
      r.legalStatus ?? "",
      r.territory ?? "",
      (r.niceClasses ?? []).join("|"),
      r.filingDate ?? "",
      r.registrationDate ?? "",
      r.expiryDate ?? "",
      r.similarity ? r.similarity.overall.toFixed(3) : "",
      r.similarity ? String(r.similarity.identical) : "",
      r.provenance.source,
      r.provenance.verificationStatus,
      r.provenance.retrievedAt,
      r.provenance.link ?? "",
      r.note ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export { DISCLAIMER };
