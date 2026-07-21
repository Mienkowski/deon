// Agregacja wielowarstwowego podobieństwa (sekcja 7) z pełną wyjaśnialnością
// (sekcja 20): każdy komponent raportuje algorytm, wynik liczbowy i detal.

import type { SimilarityAssessment, SimilarityComponent } from "@/lib/types";
import {
  jaroWinkler,
  levenshteinRatio,
  damerauLevenshtein,
  diceCoefficient,
  cosineNgram,
  tokenSetRatio,
  tokenSortRatio,
  commonPrefix,
  commonSuffix,
} from "./textual";
import { phoneticSimilarity, stripPolishDiacritics } from "./phonetic";

// Prosty lokalny słownik koncepcyjny/tłumaczeniowy (sygnał pomocniczy, nie
// kolizja sama w sobie — sekcja 7.3/7.5). Rozszerzalny; opcjonalnie LLM.
const CONCEPT_GROUPS: string[][] = [
  ["odznaka", "badge", "znaczek", "plakietka", "emblemat"],
  ["plus", "pro", "premium", "max", "extra"],
  ["szybki", "fast", "speedy", "quick", "rapid"],
  ["lew", "lion", "leo"],
  ["cyfrowy", "digital", "online", "e"],
  ["certyfikat", "certificate", "credential", "poswiadczenie"],
  ["nauka", "edukacja", "education", "learning", "szkolenie", "training"],
  ["sklep", "shop", "store", "market"],
];

function norm(s: string): string {
  return stripPolishDiacritics(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
}

function conceptSimilarity(a: string, b: string): { score: number; detail: string } {
  const ta = new Set(norm(a).split(/\s+/).filter(Boolean));
  const tb = new Set(norm(b).split(/\s+/).filter(Boolean));
  let hits = 0;
  const matched: string[] = [];
  for (const group of CONCEPT_GROUPS) {
    const inA = group.some((w) => ta.has(w));
    const inB = group.some((w) => tb.has(w));
    if (inA && inB) {
      hits++;
      matched.push(group[0]);
    }
  }
  const denom = Math.max(1, Math.min(ta.size, tb.size));
  const score = Math.min(1, hits / denom);
  return {
    score,
    detail: matched.length ? `wspólne pojęcia: ${matched.join(", ")}` : "brak wspólnych pojęć w słowniku",
  };
}

/**
 * Pełna, wyjaśnialna ocena podobieństwa dwóch łańcuchów.
 * `overall` to ważona kombinacja z naciskiem na najsilniejsze sygnały.
 */
export function assessSimilarity(query: string, candidate: string): SimilarityAssessment {
  const a = norm(query);
  const b = norm(candidate);
  const identical = a === b && a.length > 0;

  const jw = jaroWinkler(a, b);
  const lev = levenshteinRatio(a, b);
  const dice = diceCoefficient(a, b);
  const cos = cosineNgram(a, b);
  const tset = tokenSetRatio(query, candidate);
  const tsort = tokenSortRatio(query, candidate);
  const dl = damerauLevenshtein(a, b);
  const phon = phoneticSimilarity(query, candidate);
  const concept = conceptSimilarity(query, candidate);

  const prefix = commonPrefix(a, b);
  const suffix = commonSuffix(a, b);

  const components: SimilarityComponent[] = [
    { algorithm: "Jaro-Winkler", kind: "textual", score: jw, detail: `wynik ${jw.toFixed(3)}` },
    { algorithm: "Levenshtein ratio", kind: "textual", score: lev, detail: `dystans ${damerauLevenshteinLabel(dl)}` },
    { algorithm: "Dice (bigramy)", kind: "textual", score: dice, detail: `wynik ${dice.toFixed(3)}` },
    { algorithm: "Cosine (n-gramy)", kind: "textual", score: cos, detail: `wynik ${cos.toFixed(3)}` },
    { algorithm: "Token set ratio", kind: "textual", score: tset, detail: `wynik ${tset.toFixed(3)}` },
    { algorithm: "Token sort ratio", kind: "textual", score: tsort, detail: `wynik ${tsort.toFixed(3)}` },
    { algorithm: "Fonetyka (Double Metaphone/Soundex/PL)", kind: "phonetic", score: phon.score, detail: phon.detail },
    { algorithm: "Koncepcyjne (słownik lokalny)", kind: "conceptual", score: concept.score, detail: concept.detail },
  ];

  const textualMax = Math.max(jw, lev, dice, cos, tset, tsort);
  // Agregat: dominuje najsilniejszy sygnał tekstowy, fonetyka i koncepcja
  // podnoszą wynik, ale z mniejszą wagą (sygnały pomocnicze).
  const overall = identical
    ? 1
    : Math.min(
        1,
        0.62 * textualMax + 0.28 * phon.score + 0.1 * concept.score,
      );

  const explanation = buildExplanation(identical, textualMax, phon, concept, prefix, suffix);

  return {
    query,
    candidate,
    overall,
    identical,
    components,
    sharedPrefix: prefix || undefined,
    sharedSuffix: suffix || undefined,
    explanation,
  };
}

function damerauLevenshteinLabel(dl: number): string {
  return `${dl} operacji edycyjnych`;
}

function buildExplanation(
  identical: boolean,
  textualMax: number,
  phon: { score: number; detail: string },
  concept: { score: number; detail: string },
  prefix: string,
  suffix: string,
): string {
  if (identical) return "Oznaczenia identyczne po normalizacji.";
  const bits: string[] = [];
  bits.push(`najsilniejsze podobieństwo tekstowe ${(textualMax * 100).toFixed(0)}%`);
  if (phon.score >= 0.6) bits.push(`silne podobieństwo fonetyczne (${phon.detail})`);
  else if (phon.score > 0) bits.push(`częściowe podobieństwo fonetyczne`);
  if (concept.score > 0) bits.push(concept.detail);
  if (prefix.length >= 3) bits.push(`wspólny prefiks „${prefix}"`);
  if (suffix.length >= 3) bits.push(`wspólny sufiks „${suffix}"`);
  return bits.join("; ") + ".";
}
