// Analiza podobieństwa nazwy do korpusu rekordów (rdzeń „analizy podobieństwa
// nazw"). Korpus może pochodzić z:
//   - wbudowanego zbioru PRZYKŁADOWEGO (jawnie oznaczonego, do demonstracji),
//   - IMPORTU użytkownika (własna lista nazw — legalne, sekcja 17),
//   - realnego API (EPO OPS) — gdy skonfigurowane (patrz epoOps.ts).
//
// Silnik podobieństwa (src/lib/similarity) jest wspólny dla wszystkich źródeł.

import { createHash } from "node:crypto";
import type { LegalStatus, SourceKind, SourceResult } from "@/lib/types";
import { assessSimilarity } from "@/lib/similarity";
import { generateVariants } from "@/lib/variants";

export interface CorpusRecord {
  name: string; // nazwa/tytuł do porównania
  kind?: SourceKind; // trademark | patent | company | ...
  owner?: string;
  legalStatus?: LegalStatus;
  territory?: string;
  niceClasses?: number[];
  filingDate?: string;
  registrationDate?: string;
  expiryDate?: string;
  externalId?: string;
  link?: string;
  reputation?: boolean;
}

function hash(v: unknown): string {
  return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

let seq = 0;
const rid = () => `sim_${(seq += 1)}`;

/**
 * Porównuje nazwę-zapytanie (oraz jej najistotniejsze warianty) z każdym
 * rekordem korpusu i zwraca posortowaną listę trafień powyżej progu.
 */
export function analyzeAgainstCorpus(
  query: string,
  records: CorpusRecord[],
  opts: { sourceLabel: string; license: string; minScore?: number; verified?: boolean } = {
    sourceLabel: "Korpus",
    license: "",
  },
): SourceResult[] {
  const minScore = opts.minScore ?? 0.45;
  const now = new Date().toISOString();
  // Formy zapytania: oryginał + najistotniejsze warianty (z typem i notatką).
  const forms = [
    { value: query, type: "original" as const, note: "zapis oryginalny" },
    ...generateVariants(query).slice(0, 8).map((v) => ({ value: v.value, type: v.type, note: v.note })),
  ];

  const results: SourceResult[] = [];
  for (const rec of records) {
    const target = rec.name;
    if (!target?.trim()) continue;
    // Najlepsze dopasowanie spośród wszystkich form zapytania.
    let best = assessSimilarity(query, target);
    let matchedForm = forms[0];
    for (const f of forms) {
      const s = assessSimilarity(f.value, target);
      if (s.overall > best.overall) {
        best = s;
        matchedForm = f;
      }
    }
    if (best.overall < minScore && !best.identical) continue;

    // Czy dopasowano przez wariant, a nie przez oryginał? (istotne dla znaków)
    const viaVariant = matchedForm.type !== "original" &&
      matchedForm.value.toLowerCase() !== query.toLowerCase();
    const literallyIdentical = best.identical && !viaVariant;
    const noteParts: string[] = [];
    if (literallyIdentical) noteParts.push("Oznaczenie identyczne po normalizacji.");
    else if (best.identical && viaVariant)
      noteParts.push(`Zbieżność przez wariant „${matchedForm.value}" (${matchedForm.note ?? matchedForm.type}) — nie jest to identyczność literalna badanej nazwy.`);
    else if (viaVariant)
      noteParts.push(`Najsilniejsze dopasowanie przez wariant „${matchedForm.value}" (${matchedForm.note ?? matchedForm.type}).`);

    results.push({
      id: rid(),
      kind: rec.kind ?? "trademark",
      title: rec.name,
      matchedValue: rec.name,
      owner: rec.owner,
      legalStatus: rec.legalStatus ?? "unknown",
      territory: rec.territory,
      niceClasses: rec.niceClasses,
      filingDate: rec.filingDate,
      registrationDate: rec.registrationDate,
      expiryDate: rec.expiryDate,
      reputation: rec.reputation,
      // `identical` na poziomie wyniku odzwierciedla identyczność LITERALNĄ
      // badanej nazwy (nie identyczność wariantu, np. tłumaczenia).
      similarity: { ...best, identical: literallyIdentical },
      provenance: {
        source: opts.sourceLabel,
        externalId: rec.externalId,
        link: rec.link,
        retrievedAt: now,
        verificationStatus: opts.verified ? "verified" : "unverified",
        license: opts.license,
        contentHash: hash(rec),
        raw: rec,
      },
      note: noteParts.join(" ") || undefined,
    });
  }

  return results.sort((a, b) => (b.similarity?.overall ?? 0) - (a.similarity?.overall ?? 0));
}

/**
 * Parser importu użytkownika. Akceptuje jedną nazwę w wierszu, opcjonalnie z
 * polami po znaku „|":  nazwa | właściciel | rodzaj | terytorium
 * Obsługuje też prosty CSV z nagłówkiem name[,owner[,kind[,territory]]].
 */
export function parseUserCorpus(raw: string): CorpusRecord[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Wykryj CSV z nagłówkiem.
  const header = lines[0].toLowerCase();
  const isCsv = header.includes(",") && /(^|,)\s*name\s*(,|$)/.test(header);
  const out: CorpusRecord[] = [];

  const start = isCsv ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const parts = (line.includes("|") ? line.split("|") : line.split(",")).map((p) => p.trim());
    const name = parts[0];
    if (!name) continue;
    out.push({
      name,
      owner: parts[1] || undefined,
      kind: (parts[2] as SourceKind) || undefined,
      territory: parts[3] || undefined,
    });
  }
  return out;
}

// ── Wbudowany zbiór PRZYKŁADOWY ──────────────────────────────────────────────
// UWAGA: to dane DEMONSTRACYJNE, nie odzwierciedlają aktualnego stanu żadnego
// rejestru. Służą wyłącznie do pokazania działania silnika podobieństwa.
// W produkcji zastąp korpusem z importu lub realnego API (EPO OPS/EUIPO).
const SAMPLE_CORPUS: CorpusRecord[] = [
  { name: "Odznaka Plus", kind: "trademark", owner: "Przykład Sp. z o.o.", legalStatus: "registered", territory: "PL", niceClasses: [41], registrationDate: "2019-05-10", externalId: "R.300001" },
  { name: "OdznakaPro", kind: "trademark", owner: "EduCert S.A.", legalStatus: "applied", territory: "EU", niceClasses: [41, 9], filingDate: "2023-02-01", externalId: "018900001" },
  { name: "Badge Plus", kind: "trademark", owner: "BadgeWorks Ltd", legalStatus: "registered", territory: "EU", niceClasses: [9, 41], registrationDate: "2020-11-20", externalId: "018500123" },
  { name: "BadgePro", kind: "trademark", owner: "Credly-like Inc.", legalStatus: "registered", territory: "US", niceClasses: [42], registrationDate: "2018-03-15", externalId: "US-8800111" },
  { name: "Digital Badge", kind: "trademark", owner: "OpenBadge Foundation", legalStatus: "expired", territory: "EU", niceClasses: [41], expiryDate: "2022-01-01", externalId: "017100999" },
  { name: "eOdznaka", kind: "company", owner: "eOdznaka Sp. z o.o.", legalStatus: "not_applicable", territory: "PL", externalId: "KRS-0000123456" },
  { name: "Plaska Odznaka", kind: "trademark", owner: "Metal Art", legalStatus: "registered", territory: "PL", niceClasses: [6], registrationDate: "2015-07-07", externalId: "R.250777" },
  { name: "Certyfikat Plus", kind: "trademark", owner: "CertPlus GmbH", legalStatus: "registered", territory: "EU", niceClasses: [41], registrationDate: "2021-09-09", externalId: "018600222" },
  { name: "Method and system for issuing digital badges", kind: "patent", owner: "Learning Systems Inc.", legalStatus: "registered", territory: "US", filingDate: "2016-04-01", externalId: "US-9,999,111", link: "https://patents.google.com/patent/US9999111" },
  { name: "Verifiable credential badge platform", kind: "patent", owner: "TrustCred B.V.", legalStatus: "applied", territory: "EU", filingDate: "2022-06-15", externalId: "EP-3999999-A1" },
  { name: "Klinig", kind: "trademark", owner: "Klinig AB", legalStatus: "registered", territory: "EU", niceClasses: [44], registrationDate: "2017-05-05", externalId: "016200333" },
  { name: "Xpert Learning", kind: "trademark", owner: "Xpert Education Ltd", legalStatus: "registered", territory: "EU", niceClasses: [41], registrationDate: "2019-12-12", externalId: "018100444" },
  { name: "SzybkiLew", kind: "company", owner: "Szybki Lew S.C.", legalStatus: "not_applicable", territory: "PL", externalId: "CEIDG-11122233" },
  { name: "GreenApple Foods", kind: "trademark", owner: "GreenApple", legalStatus: "registered", territory: "PL", niceClasses: [30], registrationDate: "2014-01-01", externalId: "R.240000" },
  { name: "TechNova", kind: "trademark", owner: "Nova Technologies", legalStatus: "registered", territory: "US", niceClasses: [9, 42], registrationDate: "2013-08-08", reputation: true, externalId: "US-8500222" },
];

export function sampleCorpus(): CorpusRecord[] {
  return SAMPLE_CORPUS;
}

export const SAMPLE_CORPUS_LICENSE =
  "Zbiór PRZYKŁADOWY (demonstracyjny) — dane fikcyjne/ilustracyjne, nie odzwierciedlają stanu żadnego rejestru. Do produkcji użyj importu lub realnego API.";
