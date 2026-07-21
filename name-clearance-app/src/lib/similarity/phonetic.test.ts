import { describe, it, expect } from "vitest";
import {
  stripPolishDiacritics,
  polishPhoneticKey,
  soundex,
  doubleMetaphone,
  phoneticSimilarity,
} from "./phonetic";

describe("fonetyka PL/EN", () => {
  it("usuwa polskie diakrytyki", () => {
    expect(stripPolishDiacritics("Źdźbło ąęćłóńśż")).toBe("Zdzblo aeclonsz");
  });

  it("klucz fonetyczny PL zbliża zapisy dźwiękowo równoważne", () => {
    // "sz"→"s": różne zapisy, wspólny rdzeń dźwiękowy
    expect(polishPhoneticKey("Szok")).toBe(polishPhoneticKey("Sok"));
    // "ó" brzmi jak "u": "Kruk" ≈ "Krók"
    expect(polishPhoneticKey("Kruk")).toBe(polishPhoneticKey("Krók"));
  });

  it("Soundex koduje podobnie brzmiące", () => {
    expect(soundex("Robert")).toBe(soundex("Rupert"));
  });

  it("Double Metaphone zbliża warianty pisowni EN", () => {
    // "Xpert" ~ "Expert", "Qbit" ~ "Cubit" — sygnał fonetyczny > 0
    expect(phoneticSimilarity("Xpert", "Expert").score).toBeGreaterThan(0);
    expect(phoneticSimilarity("Qbit", "Cubit").score).toBeGreaterThan(0);
    expect(phoneticSimilarity("Klinig", "Clinic").score).toBeGreaterThan(0);
  });

  it("doubleMetaphone zwraca dwa klucze", () => {
    const [p, a] = doubleMetaphone("Cecilia");
    expect(typeof p).toBe("string");
    expect(typeof a).toBe("string");
  });

  it("różne dźwiękowo słowa mają niską zgodność", () => {
    expect(phoneticSimilarity("Odznaka", "Samochód").score).toBeLessThan(0.5);
  });
});
