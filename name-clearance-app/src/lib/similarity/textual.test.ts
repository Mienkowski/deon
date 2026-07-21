import { describe, it, expect } from "vitest";
import {
  levenshtein,
  damerauLevenshtein,
  jaroWinkler,
  diceCoefficient,
  cosineNgram,
  tokenSortRatio,
  tokenSetRatio,
  commonPrefix,
  commonSuffix,
} from "./textual";

describe("algorytmy tekstowe", () => {
  it("Levenshtein liczy dystans edycyjny", () => {
    expect(levenshtein("kot", "kot")).toBe(0);
    expect(levenshtein("kot", "kok")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("Damerau-Levenshtein wykrywa transpozycję jako 1 operację", () => {
    expect(damerauLevenshtein("ab", "ba")).toBe(1);
    expect(levenshtein("ab", "ba")).toBe(2);
  });

  it("Jaro-Winkler premiuje wspólny prefiks", () => {
    const withPrefix = jaroWinkler("martha", "marhta");
    expect(withPrefix).toBeGreaterThan(0.9);
    expect(jaroWinkler("abc", "abc")).toBe(1);
  });

  it("Dice i cosine dają 1 dla identycznych", () => {
    expect(diceCoefficient("odznaka", "odznaka")).toBe(1);
    expect(cosineNgram("odznaka", "odznaka")).toBeCloseTo(1, 5);
  });

  it("token sort/set ratio ignoruje kolejność", () => {
    expect(tokenSortRatio("odznaka plus", "plus odznaka")).toBe(1);
    expect(tokenSetRatio("odznaka plus", "plus odznaka pro")).toBeGreaterThan(0.5);
  });

  it("wspólny prefiks i sufiks", () => {
    expect(commonPrefix("badge", "badger")).toBe("badge");
    expect(commonSuffix("odznaka", "znaka")).toBe("znaka");
  });
});
