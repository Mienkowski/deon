import { levenshtein } from "./textual";

// Podobieństwo fonetyczne (sekcja 7.2) z regułami dla języka polskiego.
// Implementacje pochodne (Soundex, Metaphone, Double Metaphone) są
// uproszczone, ale wychwytują typowe kolizje PL/EN wymienione w promptcie:
// "Klinig"~"Clinic", "Kling"~"Cling", "Xpert"~"Expert", "Qbit"~"Cubit".

/** Usuwa polskie znaki diakrytyczne. */
export function stripPolishDiacritics(s: string): string {
  const map: Record<string, string> = {
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
    Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  };
  return s.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (c) => map[c] ?? c);
}

/**
 * Normalizacja fonetyczna PL: sprowadza dźwiękowo równoważne zapisy do
 * wspólnej postaci. Kluczowe reguły: sz/rz/cz/ch/dz + dźwięczność końcowa.
 */
export function polishPhoneticKey(input: string): string {
  // ó brzmi jak u — mapujemy PRZED usunięciem diakrytyków (który dałby ó→o).
  let s = input.toLowerCase().replace(/ó/g, "u");
  s = stripPolishDiacritics(s).replace(/[^a-z]/g, "");
  if (!s) return "";
  // Dwuznaki → pojedyncze fonemy (kolejność ma znaczenie).
  s = s
    .replace(/sz/g, "s")
    .replace(/rz/g, "z")
    .replace(/cz/g, "c")
    .replace(/dzi?/g, "j")
    .replace(/ch/g, "h")
    .replace(/qu/g, "kw")
    .replace(/x/g, "ks");
  // Litery o zbliżonej wymowie.
  s = s.replace(/w/g, "v").replace(/q/g, "k");
  // Ubezdźwięcznienie na końcu wyrazu (b→p, d→t, g→k, z→s, v→f).
  s = s.replace(/b$/g, "p").replace(/d$/g, "t").replace(/g$/g, "k").replace(/z$/g, "s").replace(/v$/g, "f");
  // Redukcja podwojeń.
  s = s.replace(/(.)\1+/g, "$1");
  return s;
}

/** Klasyczny Soundex (angielski). */
export function soundex(input: string): string {
  const s = stripPolishDiacritics(input.toUpperCase()).replace(/[^A-Z]/g, "");
  if (!s) return "";
  const codes: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };
  const first = s[0];
  let prev = codes[first] ?? "";
  let result = first;
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] ?? "";
    if (code && code !== prev) result += code;
    // 'H' i 'W' nie resetują poprzedniego kodu; samogłoski resetują.
    if (s[i] !== "H" && s[i] !== "W") prev = code;
  }
  return (result + "000").slice(0, 4);
}

/**
 * Uproszczony Double Metaphone: dwa klucze (primary/alternate) obsługujące
 * kluczowe podstawienia PL/EN (C→K/S, X→KS, PH→F, QU→KW, WH→W, nieme litery).
 */
export function doubleMetaphone(input: string): [string, string] {
  let s = stripPolishDiacritics(input.toUpperCase()).replace(/[^A-Z]/g, "");
  if (!s) return ["", ""];
  // Preprocessing wspólny.
  s = s
    .replace(/PH/g, "F")
    .replace(/WH/g, "W")
    .replace(/QU?/g, "K") // Q/QU → K (Qbit→Kbit)
    .replace(/^KN/, "N")
    .replace(/^GN/, "N")
    .replace(/^WR/, "R")
    .replace(/CK/g, "K")
    .replace(/SCH/g, "SK")
    .replace(/X/g, "KS");
  const primary = metaphoneFold(s, false);
  const alternate = metaphoneFold(s, true);
  return [primary, alternate];
}

function metaphoneFold(s: string, cSoft: boolean): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1] ?? "";
    switch (ch) {
      case "A": case "E": case "I": case "O": case "U": case "Y":
        if (i === 0) out += "A"; // samogłoski liczą się tylko na początku
        break;
      case "C":
        // Przed E/I/Y: warianty K (twarde) i S (miękkie).
        if ("EIY".includes(next)) out += cSoft ? "S" : "K";
        else out += "K";
        break;
      case "G": out += "K"; break;
      case "Z": out += "S"; break;
      case "V": out += "F"; break;
      case "W": out += ""; break; // W często nieme fonetycznie w EN
      case "H":
        if ("AEIOU".includes(s[i - 1] ?? "") && "AEIOU".includes(next)) out += "H";
        break;
      case "B": case "D": case "F": case "J": case "K": case "L":
      case "M": case "N": case "P": case "R": case "S": case "T":
        out += ch; break;
      default: break;
    }
  }
  return out.replace(/(.)\1+/g, "$1");
}

/** Znormalizowane podobieństwo dwóch kluczy fonetycznych (edit-distance). */
function keyRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return a === b ? 1 : 0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * 0–1: podobieństwo fonetyczne. Zamiast binarnego dopasowania kluczy używamy
 * gradientu (edit-distance na kluczach Double Metaphone i kluczu PL) — dzięki
 * temu np. "Xpert"~"Expert" czy "Klinig"~"Clinic" dają sygnał > 0. Dokładna
 * zgodność klucza lub Soundex podnosi wynik do maksimum.
 */
export function phoneticSimilarity(a: string, b: string): { score: number; detail: string } {
  const [ap, aa] = doubleMetaphone(a);
  const [bp, ba] = doubleMetaphone(b);
  const dmExact = Boolean((ap && (ap === bp || ap === ba)) || (aa && (aa === bp || aa === ba)));
  const dmRatio = Math.max(
    keyRatio(ap, bp),
    keyRatio(ap, ba),
    keyRatio(aa, bp),
    keyRatio(aa, ba),
  );
  const soundexMatch = soundex(a) !== "" && soundex(a) === soundex(b);
  const plA = polishPhoneticKey(a);
  const plB = polishPhoneticKey(b);
  const plExact = plA !== "" && plA === plB;
  const plRatio = plA && plB ? keyRatio(plA, plB) : 0;

  const score = dmExact || plExact ? 1 : Math.max(dmRatio, plRatio * 0.95, soundexMatch ? 0.7 : 0);

  const parts: string[] = [];
  if (dmExact) parts.push(`Double Metaphone zgodny (${ap}/${bp})`);
  else if (dmRatio > 0) parts.push(`Double Metaphone ${(dmRatio * 100).toFixed(0)}% (${ap} vs ${bp})`);
  if (soundexMatch) parts.push(`Soundex zgodny (${soundex(a)})`);
  if (plExact) parts.push(`klucz fonetyczny PL zgodny (${plA})`);
  else if (plRatio > 0) parts.push(`klucz PL ${(plRatio * 100).toFixed(0)}% (${plA} vs ${plB})`);
  return { score, detail: parts.join("; ") || "brak zgodności fonetycznej" };
}
