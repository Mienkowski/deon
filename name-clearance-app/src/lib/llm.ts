// Opcjonalna warstwa LLM (sekcja 7.3, 20). Gated ANTHROPIC_API_KEY.
// Zasady: LLM dostarcza wyłącznie SYGNAŁ POMOCNICZY i NIE nadpisuje danych
// źródłowych. Bez klucza wszystkie funkcje zwracają `null` (aplikacja działa
// w pełni na algorytmach lokalnych).

export function isLlmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface LlmSemanticResult {
  score: number; // 0–1
  rationale: string;
}

/**
 * Ocena podobieństwa semantycznego/koncepcyjnego dwóch nazw przez LLM.
 * Zwraca null, gdy brak klucza lub błąd (fail-safe do algorytmów lokalnych).
 */
export async function llmSemanticSimilarity(
  a: string,
  b: string,
): Promise<LlmSemanticResult | null> {
  if (!isLlmEnabled()) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system:
          "Jesteś ekspertem od znaków towarowych. Oceń wyłącznie semantyczne/koncepcyjne podobieństwo dwóch oznaczeń (znaczenie, skojarzenia, tłumaczenia). Zwróć TYLKO JSON: {\"score\": <0..1>, \"rationale\": \"...\"}. To sygnał pomocniczy, nie ocena prawna.",
        messages: [
          { role: "user", content: `Oznaczenie A: "${a}"\nOznaczenie B: "${b}"` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as LlmSemanticResult;
    if (typeof parsed.score !== "number") return null;
    return { score: Math.max(0, Math.min(1, parsed.score)), rationale: parsed.rationale ?? "" };
  } catch {
    return null;
  }
}
