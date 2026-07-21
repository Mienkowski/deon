import { NextRequest, NextResponse } from "next/server";
import { suggestSchema } from "@/lib/validation";
import { suggestNiceClasses } from "@/lib/niceClasses";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = suggestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { description, industry, goodsServices } = parsed.data;
  const suggestions = suggestNiceClasses(description, industry, goodsServices);
  return NextResponse.json({ suggestions });
}
