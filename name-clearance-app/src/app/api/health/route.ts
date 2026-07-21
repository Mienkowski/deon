import { NextResponse } from "next/server";
import { isLlmEnabled } from "@/lib/llm";

// Wykrywanie brakujących zmiennych środowiskowych (sekcja 16) — miękkie,
// bo aplikacja działa bez opcjonalnych kluczy.
export async function GET() {
  const optional = ["ANTHROPIC_API_KEY", "EUIPO_TMVIEW_API_KEY", "EPO_OPS_CONSUMER_KEY"];
  const missingOptional = optional.filter((k) => !process.env[k]);
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    features: {
      llm: isLlmEnabled(),
      domainsRdap: process.env.CONNECTOR_DOMAINS_RDAP_ENABLED !== "false",
    },
    missingOptionalEnv: missingOptional,
  });
}
