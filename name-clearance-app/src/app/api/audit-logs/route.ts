import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Dziennik zmienia się w runtime — nie może być prerenderowany statycznie.
export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await store.listAudit();
  return NextResponse.json({ logs });
}
