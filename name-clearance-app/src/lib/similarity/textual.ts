// Algorytmy podobieństwa tekstowego (sekcja 7.1 prompta).
// Wszystkie funkcje są czyste i deterministyczne — testowalne bez zależności.

/** Levenshtein distance (liczba operacji wstawienia/usunięcia/zamiany). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Damerau–Levenshtein (dodatkowo transpozycja sąsiednich znaków). */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Znormalizowane podobieństwo Levenshteina do zakresu 0–1. */
export function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Jaro similarity. */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  const matchWindow = Math.max(0, Math.floor(Math.max(m, n) / 2) - 1);
  const aMatches = new Array<boolean>(m).fill(false);
  const bMatches = new Array<boolean>(n).fill(false);
  let matches = 0;
  for (let i = 0; i < m; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, n);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < m; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  return (matches / m + matches / n + (matches - t) / matches) / 3;
}

/** Jaro–Winkler (premia za wspólny prefiks do 4 znaków). */
export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * p * (1 - j);
}

/** Zbiór n-gramów znakowych. */
export function ngrams(s: string, n = 2): string[] {
  if (s.length < n) return s.length ? [s] : [];
  const out: string[] = [];
  for (let i = 0; i <= s.length - n; i++) out.push(s.slice(i, i + n));
  return out;
}

/** Współczynnik Dice'a na bigramach. */
export function diceCoefficient(a: string, b: string): number {
  const A = ngrams(a, 2);
  const B = ngrams(b, 2);
  if (A.length === 0 && B.length === 0) return a === b ? 1 : 0;
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let intersection = 0;
  for (const g of B) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      intersection++;
      counts.set(g, c - 1);
    }
  }
  return (2 * intersection) / (A.length + B.length);
}

/** Cosine similarity na wektorach częstości bigramów. */
export function cosineNgram(a: string, b: string, n = 2): number {
  const va = new Map<string, number>();
  const vb = new Map<string, number>();
  for (const g of ngrams(a, n)) va.set(g, (va.get(g) ?? 0) + 1);
  for (const g of ngrams(b, n)) vb.set(g, (vb.get(g) ?? 0) + 1);
  let dot = 0;
  for (const [g, x] of va) dot += x * (vb.get(g) ?? 0);
  const mag = (v: Map<string, number>) =>
    Math.sqrt(Array.from(v.values()).reduce((s, x) => s + x * x, 0));
  const denom = mag(va) * mag(vb);
  return denom === 0 ? 0 : dot / denom;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** token_sort_ratio: porównanie po posortowaniu tokenów. */
export function tokenSortRatio(a: string, b: string): number {
  const sa = tokens(a).sort().join(" ");
  const sb = tokens(b).sort().join(" ");
  return levenshteinRatio(sa, sb);
}

/** token_set_ratio: porównanie części wspólnej i różnic zbiorów tokenów. */
export function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const inter = [...ta].filter((t) => tb.has(t)).sort();
  const diffA = [...ta].filter((t) => !tb.has(t)).sort();
  const diffB = [...tb].filter((t) => !ta.has(t)).sort();
  const s1 = inter.join(" ");
  const s2 = [...inter, ...diffA].join(" ");
  const s3 = [...inter, ...diffB].join(" ");
  return Math.max(
    levenshteinRatio(s1, s2),
    levenshteinRatio(s1, s3),
    levenshteinRatio(s2, s3),
  );
}

export function commonPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

export function commonSuffix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i === 0 ? "" : a.slice(a.length - i);
}
