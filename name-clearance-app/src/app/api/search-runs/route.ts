import { NextRequest, NextResponse } from "next/server";
import { candidateSchema } from "@/lib/validation";
import { runSearch } from "@/lib/orchestrator";
import { store } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET() {
  const runs = await store.listRuns();
  // Lekka lista (bez pełnych wyników).
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      name: r.candidate.name,
      createdAt: r.createdAt,
      status: r.status,
      risk: r.risk ? { score: r.risk.score, status: r.risk.status, category: r.risk.category } : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = Number(process.env.RATE_LIMIT_SEARCH_PER_MINUTE ?? 20);
  if (!checkRateLimit(ip, limit)) {
    return NextResponse.json({ error: "Przekroczono limit zapytań. Spróbuj za chwilę." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = candidateSchema.safeParse(body?.candidate ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requestedBy = typeof body?.requestedBy === "string" ? body.requestedBy : "anonymous";
  const candidate = { id: `cand_${Date.now()}`, ...parsed.data } as Parameters<typeof runSearch>[0];

  try {
    const run = await runSearch(candidate, requestedBy);
    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Błąd podczas uruchamiania badania.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
