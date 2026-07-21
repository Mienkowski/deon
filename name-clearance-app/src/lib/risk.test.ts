import { describe, it, expect } from "vitest";
import { assessRisk } from "./risk";
import { assessSimilarity } from "./similarity";
import type { NameCandidate, SourceResult } from "./types";

function candidate(overrides: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: "c1",
    name: "Odznaka Plus",
    markType: "product",
    description: "cyfrowe odznaki",
    industry: "edukacja",
    territories: ["PL", "EU"],
    niceClasses: [
      { classNumber: 41, title: "Nauczanie", description: "", rationale: "", confidence: 0.9, selected: true, source: "rule" },
    ],
    ...overrides,
  };
}

function trademark(name: string, over: Partial<SourceResult> = {}): SourceResult {
  return {
    id: "r1",
    kind: "trademark",
    title: name,
    matchedValue: name,
    legalStatus: "registered",
    territory: "PL",
    niceClasses: [41],
    reputation: false,
    provenance: { source: "TEST", retrievedAt: new Date().toISOString(), verificationStatus: "verified" },
    similarity: assessSimilarity("Odznaka Plus", name),
    ...over,
  };
}

describe("model ryzyka", () => {
  it("identyczny aktywny znak w tej samej klasie i terytorium ⇒ status C i wysokie ryzyko", () => {
    const risk = assessRisk({
      candidate: candidate(),
      results: [trademark("Odznaka Plus")],
      sourcesUnavailable: 0,
      automatedTrademarkSearch: true,
    });
    expect(risk.score).toBeGreaterThanOrEqual(61);
    expect(risk.status).toBe("C");
    expect(risk.overrideRulesApplied.length).toBeGreaterThan(0);
  });

  it("identyczny znak w całkowicie innej branży daje niższe ryzyko niż w tej samej", () => {
    const other = trademark("Odznaka Plus", { niceClasses: [43], territory: "US" });
    const riskOther = assessRisk({ candidate: candidate(), results: [other], sourcesUnavailable: 0, automatedTrademarkSearch: true });
    const riskSame = assessRisk({ candidate: candidate(), results: [trademark("Odznaka Plus")], sourcesUnavailable: 0, automatedTrademarkSearch: true });
    expect(riskOther.score).toBeLessThan(riskSame.score);
  });

  it("znak wygasły, ale nadal używany, nie zeruje ryzyka", () => {
    const expired = trademark("Odznaka Plus", { legalStatus: "expired", actualUse: true });
    const risk = assessRisk({ candidate: candidate(), results: [expired], sourcesUnavailable: 0, automatedTrademarkSearch: true });
    expect(risk.score).toBeGreaterThanOrEqual(41);
    expect(risk.overrideRulesApplied.join(" ")).toContain("wygasły");
  });

  it("brak wyników ⇒ status A z komunikatem o braku istotnych kolizji", () => {
    const risk = assessRisk({ candidate: candidate(), results: [], sourcesUnavailable: 0, automatedTrademarkSearch: true });
    expect(risk.status).toBe("A");
    expect(risk.score).toBeLessThanOrEqual(20);
  });

  it("niedostępne źródła (awarie) ⇒ status D (dane niewystarczające)", () => {
    const risk = assessRisk({ candidate: candidate(), results: [], sourcesUnavailable: 3, automatedTrademarkSearch: false });
    expect(risk.status).toBe("D");
  });

  it("brak automatycznego przeszukania rejestrów znaków ⇒ status min. B (nie A)", () => {
    const risk = assessRisk({ candidate: candidate(), results: [], sourcesUnavailable: 0, automatedTrademarkSearch: false });
    expect(risk.status).toBe("B");
    expect(risk.dataCompleteness.automatedTrademarkSearch).toBe(false);
    expect(risk.dataCompleteness.note).toContain("ręczn");
  });

  it("znak renomowany identyczny ⇒ wysokie ryzyko także poza klasą", () => {
    const rep = trademark("Odznaka Plus", { niceClasses: [43], territory: "US", reputation: true });
    const risk = assessRisk({ candidate: candidate(), results: [rep], sourcesUnavailable: 0, automatedTrademarkSearch: true });
    expect(risk.score).toBeGreaterThanOrEqual(61);
  });
});
