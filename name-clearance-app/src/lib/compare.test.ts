import { describe, it, expect } from "vitest";
import { rankComparisons, summarize, type CandidateComparison } from "./compare";

function item(name: string, riskScore: number, over: Partial<CandidateComparison> = {}): CandidateComparison {
  return {
    runId: `r_${name}`,
    name,
    riskScore,
    riskStatus: "B",
    identicalCount: 0,
    similarCount: 0,
    domainsAvailable: 0,
    domainsChecked: 8,
    activeEntities: 0,
    socialToVerify: 0,
    completeness: 1,
    rank: 0,
    ...over,
  };
}

describe("porównywanie nazw", () => {
  it("rankuje po ryzyku rosnąco (1 = najniższe)", () => {
    const ranked = rankComparisons([item("A", 70), item("B", 20), item("C", 45)]);
    expect(ranked[0].name).toBe("B");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[2].name).toBe("A");
  });

  it("remis po ryzyku rozstrzyga liczba identycznych oznaczeń", () => {
    const ranked = rankComparisons([
      item("A", 30, { identicalCount: 2 }),
      item("B", 30, { identicalCount: 0 }),
    ]);
    expect(ranked[0].name).toBe("B");
  });

  it("summarize liczy max/średnią i rekomenduje najniższe ryzyko", () => {
    const s = summarize([item("A", 80), item("B", 20), item("C", 50)]);
    expect(s.highestRisk).toBe(80);
    expect(s.averageRisk).toBe(50);
    expect(s.recommendedName).toBe("B");
  });

  it("nie deklaruje nazwy jako bezpiecznej (disclaimer)", () => {
    const s = summarize([item("A", 10)]);
    expect(s.disclaimer.toLowerCase()).toContain("nie jest");
    expect(s.disclaimer).toContain("badania zdolności rejestrowej");
  });
});
