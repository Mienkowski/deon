import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const run = await store.getRun(params.id);
  if (!run) return NextResponse.json({ error: "Nie znaleziono badania." }, { status: 404 });
  return NextResponse.json({ risk: run.risk, recommendations: run.recommendations });
}
