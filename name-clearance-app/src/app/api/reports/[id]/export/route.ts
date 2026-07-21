import { NextRequest, NextResponse } from "next/server";
import { store, newId } from "@/lib/store";
import { buildReportJson, buildResultsCsv } from "@/lib/report";

// POST /api/reports/{runId}/export?format=json|csv
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const run = await store.getRun(params.id);
  if (!run) return NextResponse.json({ error: "Nie znaleziono badania." }, { status: 404 });

  const format = (new URL(req.url).searchParams.get("format") ?? "json").toLowerCase();

  await store.appendAudit({
    id: newId("audit"),
    timestamp: new Date().toISOString(),
    actor: run.requestedBy,
    action: "report.export",
    detail: `run=${run.id}; format=${format}`,
  });

  if (format === "csv") {
    return new NextResponse(buildResultsCsv(run), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="name-clearance-${run.id}.csv"`,
      },
    });
  }

  const json = JSON.stringify(buildReportJson(run), null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="name-clearance-${run.id}.json"`,
    },
  });
}
