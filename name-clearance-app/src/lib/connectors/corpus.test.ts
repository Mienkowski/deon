import { describe, it, expect } from "vitest";
import { analyzeAgainstCorpus, parseUserCorpus, sampleCorpus } from "./corpus";

describe("analiza podobieństwa do korpusu", () => {
  it("znajduje identyczne oznaczenie na szczycie rankingu", () => {
    const res = analyzeAgainstCorpus("Odznaka Plus", sampleCorpus(), {
      sourceLabel: "test",
      license: "",
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title).toBe("Odznaka Plus");
    expect(res[0].similarity?.identical).toBe(true);
    expect(res[0].similarity?.overall).toBe(1);
  });

  it("wyniki są posortowane malejąco po podobieństwie", () => {
    const res = analyzeAgainstCorpus("Odznaka Plus", sampleCorpus(), { sourceLabel: "t", license: "" });
    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1].similarity!.overall).toBeGreaterThanOrEqual(res[i].similarity!.overall);
    }
  });

  it("wykrywa podobieństwo fonetyczne EN (Xpert ~ Expert)", () => {
    const res = analyzeAgainstCorpus("Expert Learning", [{ name: "Xpert Learning" }], {
      sourceLabel: "t",
      license: "",
      minScore: 0.3,
    });
    expect(res.length).toBe(1);
    expect(res[0].similarity!.overall).toBeGreaterThan(0.3);
  });

  it("respektuje próg minScore", () => {
    const high = analyzeAgainstCorpus("Odznaka Plus", sampleCorpus(), { sourceLabel: "t", license: "", minScore: 0.95 });
    const low = analyzeAgainstCorpus("Odznaka Plus", sampleCorpus(), { sourceLabel: "t", license: "", minScore: 0.3 });
    expect(low.length).toBeGreaterThanOrEqual(high.length);
  });

  it("każdy wynik ma prowenancję z hashem i licencją", () => {
    const res = analyzeAgainstCorpus("Badge", sampleCorpus(), { sourceLabel: "Zbiór", license: "LIC", minScore: 0.3 });
    for (const r of res) {
      expect(r.provenance.contentHash).toBeTruthy();
      expect(r.provenance.license).toBe("LIC");
      expect(r.provenance.source).toBe("Zbiór");
    }
  });
});

describe("parser importu użytkownika", () => {
  it("parsuje jedną nazwę w wierszu", () => {
    const recs = parseUserCorpus("Odznaka Plus\nBadgePro\n\nDigital Badge");
    expect(recs.length).toBe(3);
    expect(recs[0].name).toBe("Odznaka Plus");
  });

  it("parsuje pola po znaku |", () => {
    const recs = parseUserCorpus("Odznaka Plus | EduCert | trademark | PL");
    expect(recs[0].owner).toBe("EduCert");
    expect(recs[0].kind).toBe("trademark");
    expect(recs[0].territory).toBe("PL");
  });

  it("pomija nagłówek CSV name,owner", () => {
    const recs = parseUserCorpus("name,owner\nOdznaka Plus,EduCert");
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe("Odznaka Plus");
    expect(recs[0].owner).toBe("EduCert");
  });
});
