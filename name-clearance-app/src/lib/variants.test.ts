import { describe, it, expect } from "vitest";
import { generateVariants } from "./variants";

describe("generator wariantów", () => {
  const variants = generateVariants("Odznaka Plus");
  const values = variants.map((v) => v.value.toLowerCase());

  it("zawiera oryginał z najwyższą wagą", () => {
    const original = variants.find((v) => v.type === "original");
    expect(original?.value).toBe("Odznaka Plus");
    expect(original?.weight).toBe(1);
  });

  it("generuje warianty bez spacji i z łącznikiem", () => {
    expect(values).toContain("odznakaplus");
    expect(values).toContain("odznaka-plus");
  });

  it("tłumaczy człon PL→EN (odznaka→badge)", () => {
    expect(values.some((v) => v.includes("badge"))).toBe(true);
  });

  it("tworzy odwróconą kolejność słów", () => {
    expect(values).toContain("plus odznaka");
  });

  it("nie zawiera duplikatów wartości", () => {
    const set = new Set(values);
    expect(set.size).toBe(values.length);
  });

  it("warianty są posortowane malejąco po wadze", () => {
    for (let i = 1; i < variants.length; i++) {
      expect(variants[i - 1].weight).toBeGreaterThanOrEqual(variants[i].weight);
    }
  });

  it("obsługuje polskie diakrytyki (bez znaków)", () => {
    const v = generateVariants("Ćma Łoś").map((x) => x.value.toLowerCase());
    expect(v.some((x) => x.includes("cma") && x.includes("los"))).toBe(true);
  });
});
