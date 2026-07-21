import { NextResponse } from "next/server";
import { DEEP_LINK_SOURCES } from "@/lib/connectors/deepLinks";
import { isEuipoConfigured } from "@/lib/connectors/euipo";

// Odzwierciedla konfigurację runtime (tryb dostępu zależy od kluczy w env).
export const dynamic = "force-dynamic";

// Katalog skonfigurowanych źródeł i ich trybu dostępu (sekcja 15, 17).
export async function GET() {
  const rdapEnabled = process.env.CONNECTOR_DOMAINS_RDAP_ENABLED !== "false";
  const euipoApi = isEuipoConfigured();
  const official = DEEP_LINK_SOURCES.map((s) => {
    // EUIPO ma realne API, gdy skonfigurowano klucz.
    if (s.id === "euipo_tmview" && euipoApi) {
      return {
        id: s.id,
        name: s.name,
        accessMode: "api" as const,
        license: "EUIPO Trade Marks Search API — zgodnie z warunkami EUIPO.",
        note: "Realne API znaków (OAuth2) — przeszukiwane automatycznie w badaniu i analizie podobieństwa.",
      };
    }
    return {
      id: s.id,
      name: s.name,
      accessMode: "manual" as const,
      license: s.license,
      note: "Brak otwartego API — tryb 'manual verification required' z legalnym deep-linkiem.",
    };
  });
  return NextResponse.json({
    sources: [
      {
        id: "domains_rdap",
        name: "Domeny internetowe (RDAP / WHOIS)",
        accessMode: rdapEnabled ? "rdap" : "manual",
        license: "RDAP (RFC 9082) — publiczny protokół rejestrów domen.",
        note: rdapEnabled ? "Realne zapytania RDAP." : "RDAP wyłączony — linki WHOIS.",
      },
      {
        id: "social",
        name: "Media społecznościowe",
        accessMode: "manual" as const,
        license: "Weryfikacja ręczna zgodnie z regulaminami platform.",
        note: "Deep-linki do sprawdzenia dostępności profili.",
      },
      ...official,
    ],
  });
}
