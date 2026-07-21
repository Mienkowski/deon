// Generator zapytań wyszukiwawczych (sekcja 6). Buduje zapytania dokładne,
// kontekstowe, domenowe, branżowe i negatywne oraz gotowe, legalne linki do
// wyszukiwarki (bez automatycznego scrapingu).

import type { NameCandidate, SearchQuery } from "@/lib/types";

let seq = 0;
function id(): string {
  seq += 1;
  return `q_${seq}`;
}

function webSearchUrl(q: string): string {
  // Neutralny, legalny deep-link do wyszukiwarki (użytkownik wykonuje ręcznie).
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
}

export function generateQueries(candidate: NameCandidate, topVariants: string[]): SearchQuery[] {
  const out: SearchQuery[] = [];
  const name = candidate.name;
  const q = (category: SearchQuery["category"], query: string) =>
    out.push({ id: id(), category, query, url: webSearchUrl(query) });

  // 6.1 — zapytania dokładne
  const exactSuffixes = [
    "", "trademark", "brand", "product", "company", "firma", "znak towarowy",
    "patent", "aplikacja", "software", "sklep", "producent", "właściciel",
  ];
  for (const s of exactSuffixes) q("exact", s ? `"${name}" ${s}` : `"${name}"`);

  // 6.2 — zapytania kontekstowe (nazwa + branża/opis/klasa/terytorium)
  if (candidate.industry) q("contextual", `"${name}" ${candidate.industry}`);
  if (candidate.description) q("contextual", `"${name}" ${firstWords(candidate.description, 4)}`);
  for (const cls of candidate.niceClasses?.filter((c) => c.selected).slice(0, 3) ?? [])
    q("contextual", `"${name}" ${cls.title}`);
  for (const t of candidate.territories.slice(0, 3)) q("contextual", `"${name}" ${t}`);

  // 6.3 — zapytania domenowe
  const domainBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  for (const tld of ["pl", "com"]) {
    q("domain", `site:${domainBase}.${tld}`);
    q("domain", `"${domainBase}.${tld}"`);
  }
  q("domain", `inurl:${domainBase}`);
  q("domain", `intitle:"${name}"`);

  // 6.4 — zapytania do serwisów branżowych (jako operatory site:)
  const verticals = [
    "site:github.com", "site:gitlab.com", "site:play.google.com",
    "site:apps.apple.com", "site:linkedin.com/company", "site:crunchbase.com",
    "site:producthunt.com",
  ];
  for (const v of verticals) q("vertical", `${v} "${name}"`);

  // 6.5 — zapytania negatywne/doprecyzowujące (dla nazw ogólnych)
  if (candidate.industry) q("negative", `"${name}" ${candidate.industry} -wikipedia -slownik`);
  q("negative", `"${name}" -definicja -synonim`);

  // Warianty (ograniczone) w zapytaniach dokładnych
  for (const v of topVariants.slice(0, 5)) if (v.toLowerCase() !== name.toLowerCase()) q("exact", `"${v}"`);

  return out;
}

function firstWords(s: string, n: number): string {
  return s.split(/\s+/).slice(0, n).join(" ");
}
