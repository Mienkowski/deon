import { describe, it, expect } from "vitest";
import { suggestNiceClasses } from "./niceClasses";

describe("sugestia klas nicejskich", () => {
  it("dla edukacji/certyfikacji proponuje klasę 41", () => {
    const s = suggestNiceClasses("Cyfrowe odznaki i certyfikacja", "edukacja, szkolenia", "kursy, certyfikaty");
    expect(s.some((c) => c.classNumber === 41)).toBe(true);
  });

  it("dla oprogramowania proponuje klasę 9 lub 42", () => {
    const s = suggestNiceClasses("Aplikacja SaaS", "oprogramowanie, technologia", "platforma");
    expect(s.some((c) => c.classNumber === 9 || c.classNumber === 42)).toBe(true);
  });

  it("zwraca domyślne klasy przy braku trafień", () => {
    const s = suggestNiceClasses("qwerty zxcv", "", "");
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((c) => c.confidence <= 0.35)).toBe(true);
  });

  it("każda propozycja ma uzasadnienie i pewność 0..1", () => {
    const s = suggestNiceClasses("sklep internetowy", "e-commerce", "sprzedaż");
    for (const c of s) {
      expect(c.rationale.length).toBeGreaterThan(0);
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });
});
