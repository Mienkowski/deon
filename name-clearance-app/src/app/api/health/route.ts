import { NextResponse } from "next/server";
import { isLlmEnabled } from "@/lib/llm";
import { isEuipoConfigured } from "@/lib/connectors/euipo";
import { isEpoConfigured } from "@/lib/connectors/epoOps";

// Musi odzwierciedlać konfigurację RUNTIME (nie build-time) — bez tego Next
// prerenderuje odpowiedź statycznie.
export const dynamic = "force-dynamic";

// Wykrywanie brakujących zmiennych środowiskowych (sekcja 16) — miękkie,
// bo aplikacja działa bez opcjonalnych kluczy.
export async function GET() {
  const optional = ["ANTHROPIC_API_KEY", "EUIPO_CLIENT_ID", "EPO_OPS_CONSUMER_KEY"];
  const missingOptional = optional.filter((k) => !process.env[k]);
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    features: {
      llm: isLlmEnabled(),
      domainsRdap: process.env.CONNECTOR_DOMAINS_RDAP_ENABLED !== "false",
      euipoTrademarkApi: isEuipoConfigured(),
      epoPatentApi: isEpoConfigured(),
    },
    missingOptionalEnv: missingOptional,
  });
}
