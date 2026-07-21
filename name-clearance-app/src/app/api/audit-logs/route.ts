import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const logs = await store.listAudit();
  return NextResponse.json({ logs });
}
