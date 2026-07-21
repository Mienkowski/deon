import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeAgainstCorpus,
  parseUserCorpus,
  sampleCorpus,
  SAMPLE_CORPUS_LICENSE,
  type CorpusRecord,
} from "@/lib/connectors/corpus";
import { isEpoConfigured, searchEpoByName } from "@/lib/connectors/epoOps";
import { isEuipoConfigured, searchEuipoByName } from "@/lib/connectors/euipo";
import { checkRateLimit } from "@/lib/rateLimit";
import { store, newId } from "@/lib/store";

const bodySchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(200),
  source: z.enum(["sample", "custom", "epo", "euipo"]).default("sample"),
  records: z.string().max(100_000).optional(), // surowy import (tekst/CSV)
  minScore: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(ip, Number(process.env.RATE_LIMIT_SEARCH_PER_MINUTE ?? 20))) {
    return NextResponse.json({ error: "Przekroczono limit zapytań." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, source, records, minScore } = parsed.data;

  let corpus: CorpusRecord[] = [];
  let sourceLabel = "Zbiór przykładowy";
  let license = SAMPLE_CORPUS_LICENSE;
  let verified = false;
  let sourceStatus = "ok";
  let sourceMessage = "";

  if (source === "custom") {
    corpus = parseUserCorpus(records ?? "");
    sourceLabel = "Import użytkownika";
    license = "Dane dostarczone przez użytkownika (import).";
    verified = false;
    if (corpus.length === 0) {
      return NextResponse.json({ error: "Import nie zawiera żadnych nazw." }, { status: 400 });
    }
  } else if (source === "euipo") {
    if (!isEuipoConfigured()) {
      return NextResponse.json(
        {
          error: "EUIPO nie jest skonfigurowane (brak EUIPO_CLIENT_ID/SECRET).",
          hint: "Zarejestruj aplikację na portalu deweloperskim EUIPO i ustaw klucze w środowisku z dostępem sieciowym.",
        },
        { status: 503 },
      );
    }
    corpus = await searchEuipoByName(name);
    sourceLabel = "EUIPO Trade Marks Search API";
    license = "EUIPO Trade Marks Search API — zgodnie z warunkami EUIPO.";
    verified = true;
    sourceStatus = corpus.length ? "ok" : "partial";
    sourceMessage = corpus.length ? "" : "Brak trafień lub API niedostępne — spróbuj innego źródła.";
  } else if (source === "epo") {
    if (!isEpoConfigured()) {
      return NextResponse.json(
        {
          error: "EPO OPS nie jest skonfigurowane (brak EPO_OPS_CONSUMER_KEY/SECRET).",
          hint: "Ustaw klucze w środowisku z dostępem sieciowym, aby użyć realnego API.",
        },
        { status: 503 },
      );
    }
    corpus = await searchEpoByName(name);
    sourceLabel = "EPO OPS (Espacenet)";
    license = "EPO Open Patent Services — zgodnie z warunkami EPO.";
    verified = true;
    sourceStatus = corpus.length ? "ok" : "partial";
    sourceMessage = corpus.length ? "" : "Brak trafień lub API niedostępne — spróbuj innego źródła.";
  } else {
    corpus = sampleCorpus();
  }

  const results = analyzeAgainstCorpus(name, corpus, { sourceLabel, license, minScore, verified });

  await store.appendAudit({
    id: newId("audit"),
    timestamp: new Date().toISOString(),
    actor: "web-user",
    action: "similarity.analyze",
    detail: `name=${name}; source=${source}; corpus=${corpus.length}; hits=${results.length}`,
  });

  return NextResponse.json({
    query: name,
    source: { id: source, label: sourceLabel, license, status: sourceStatus, message: sourceMessage },
    corpusSize: corpus.length,
    results,
    disclaimer:
      "Analiza podobieństwa jest oceną algorytmiczną, nie prawną. Wysokie podobieństwo nie przesądza o kolizji; niskie nie gwarantuje dostępności. Patenty są źródłem pomocniczym — nie chronią samej nazwy.",
  });
}
