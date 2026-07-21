// Generator wariantów badanej nazwy (sekcja 5 prompta). 20 klas transformacji.
// Warianty NIE są równoważne — każdy dostaje typ i wagę.

import type { NameVariant, VariantType } from "@/lib/types";
import { stripPolishDiacritics } from "@/lib/similarity/phonetic";

const INDUSTRY_PREFIXES = ["e", "i", "my", "get", "go", "the"];
const INDUSTRY_SUFFIXES = ["pro", "plus", "app", "hub", "lab", "ai", "io", "now", "go"];

// Prosty słownik tłumaczeń PL↔EN dla członów spotykanych w nazwach.
const TRANSLATIONS: Record<string, string> = {
  odznaka: "badge",
  plus: "plus",
  cyfrowy: "digital",
  cyfrowa: "digital",
  szybki: "fast",
  lew: "lion",
  sklep: "shop",
  nauka: "learning",
  certyfikat: "certificate",
  zdrowie: "health",
  dom: "home",
};

function unique(variants: NameVariant[]): NameVariant[] {
  const seen = new Map<string, NameVariant>();
  for (const v of variants) {
    const key = v.value.trim();
    if (!key) continue;
    const existing = seen.get(key.toLowerCase());
    // Zachowaj wariant o wyższej wadze przy kolizji wartości.
    if (!existing || v.weight > existing.weight) seen.set(key.toLowerCase(), { ...v, value: key });
  }
  return [...seen.values()];
}

function words(name: string): string[] {
  return name.split(/\s+/).filter(Boolean);
}

/** Heurystyczna liczba mnoga PL (dla członów rzeczownikowych). */
function naivePluralPL(word: string): string {
  if (/a$/i.test(word)) return word.replace(/a$/i, "i");
  if (/[^aeiouyąęó]$/i.test(word)) return word + "y";
  return word;
}

/** Warianty literówek na dystansie edycyjnym 1 (ograniczona liczba). */
function typos(name: string): string[] {
  const base = name.toLowerCase();
  const out = new Set<string>();
  const neighbors: Record<string, string> = { s: "ss", o: "0", l: "1", e: "3", a: "aa" };
  // Podwojenia i częste zamiany.
  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    if (neighbors[c]) out.add(base.slice(0, i) + neighbors[c] + base.slice(i + 1));
    if (i < base.length - 1) out.add(base.slice(0, i) + base[i + 1] + c + base.slice(i + 2)); // transpozycja
  }
  return [...out].slice(0, 8);
}

export function generateVariants(name: string): NameVariant[] {
  const trimmed = name.trim();
  const ws = words(trimmed);
  const out: NameVariant[] = [];
  const add = (value: string, type: VariantType, weight: number, note?: string) =>
    out.push({ value, type, weight, note });

  add(trimmed, "original", 1.0, "zapis oryginalny");
  add(trimmed.toLowerCase(), "case", 0.95);
  add(trimmed.toUpperCase(), "case", 0.9);

  const noDia = stripPolishDiacritics(trimmed);
  if (noDia !== trimmed) add(noDia, "no_diacritics", 0.9, "bez polskich znaków");

  add(trimmed.replace(/\s+/g, ""), "spacing", 0.85, "bez spacji");
  add(trimmed.replace(/\s+/g, "-"), "hyphen", 0.8, "z łącznikiem");
  add(stripPolishDiacritics(trimmed).replace(/\s+/g, ""), "spacing", 0.8);

  // Liczba mnoga / pojedyncza pierwszego członu.
  if (ws.length > 0) {
    const plural = [naivePluralPL(ws[0]), ...ws.slice(1)].join(" ");
    if (plural !== trimmed) add(plural, "plural", 0.6, "forma mnoga (heurystyka PL)");
  }

  // Odwrócona kolejność członów.
  if (ws.length > 1) add([...ws].reverse().join(" "), "reorder", 0.7, "odwrócona kolejność słów");

  // Tłumaczenia członów PL→EN.
  const translated = ws
    .map((w) => TRANSLATIONS[stripPolishDiacritics(w.toLowerCase())] ?? w)
    .join(" ");
  if (translated.toLowerCase() !== trimmed.toLowerCase())
    add(translated, "translation", 0.7, "tłumaczenie członów PL→EN");
  add(translated.replace(/\s+/g, ""), "translation", 0.65);

  // Akronim.
  if (ws.length > 1) {
    const acr = ws.map((w) => w[0]?.toUpperCase() ?? "").join("");
    if (acr.length >= 2) add(acr, "acronym", 0.4, "akronim");
  }

  // Prefiksy/sufiksy branżowe (ograniczona liczba, niska waga).
  const compact = stripPolishDiacritics(trimmed).replace(/\s+/g, "");
  for (const p of INDUSTRY_PREFIXES.slice(0, 3)) add(p + compact, "affix", 0.35, `prefiks „${p}"`);
  for (const s of INDUSTRY_SUFFIXES.slice(0, 4)) add(`${trimmed} ${s}`, "affix", 0.35, `sufiks „${s}"`);

  // Literówki / formy podobnie brzmiące.
  for (const t of typos(compact)) add(t, "typo", 0.3, "potencjalna literówka");

  // Wariant fonetyczny (uproszczony zapis „jak brzmi").
  const phon = stripPolishDiacritics(trimmed.toLowerCase())
    .replace(/sz/g, "sh")
    .replace(/cz/g, "ch")
    .replace(/w/g, "v");
  if (phon !== trimmed.toLowerCase()) add(phon, "phonetic", 0.45, "zapis fonetyczny");

  return unique(out).sort((a, b) => b.weight - a.weight);
}
