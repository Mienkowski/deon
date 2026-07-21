import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { candidateSchema } from "@/lib/validation";
import { runComparison } from "@/lib/compare";
import { checkRateLimit } from "@/lib/rateLimit";

const compareSchema = z.object({
  candidates: z.array(candidateSchema).min(2, "Podaj co najmniej 2 nazwy").max(10, "Maksymalnie 10 nazw"),
  requestedBy: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = Number(process.env.RATE_LIMIT_SEARCH_PER_MINUTE ?? 20);
  if (!checkRateLimit(ip, limit)) {
    return NextResponse.json({ error: "Przekroczono limit zapytań. Spróbuj za chwilę." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const candidates = parsed.data.candidates.map((c, i) => ({ id: `cand_${Date.now()}_${i}`, ...c }));
  try {
    const { comparison } = await runComparison(candidates, parsed.data.requestedBy ?? "web-user");
    return NextResponse.json({ comparison }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Błąd porównania.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
