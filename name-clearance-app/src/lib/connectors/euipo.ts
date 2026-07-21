// Realny konektor EUIPO — Trade Marks Search API (znaki towarowe UE i krajowe
// dostępne przez EUIPO). Znaki towarowe są PODSTAWOWYM źródłem oceny (sekcja 2.1).
//
// Aktywuje się WYŁĄCZNIE gdy skonfigurowano EUIPO_CLIENT_ID/SECRET (OAuth2
// client_credentials z portalu deweloperskiego EUIPO) oraz istnieje egress
// sieciowy. W przeciwnym razie zwraca [] i źródło pozostaje w trybie manualnym.
//
// Kod jest defensywny — każdy błąd/limit degraduje do pustej listy, nigdy nie
// wywraca aplikacji. Nie obchodzimy limitów ani zabezpieczeń (sekcja 17).
//
// Uwaga: dokładne ścieżki/nagłówki API EUIPO mogą się różnić między wersjami
// portalu — endpointy są konfigurowalne przez zmienne środowiskowe.

import type { LegalStatus } from "@/lib/types";
import type { CorpusRecord } from "./corpus";

const AUTH_URL = process.env.EUIPO_AUTH_URL || "https://auth.euipo.europa.eu/oidc/accessToken";
const API_URL = process.env.EUIPO_API_URL || "https://api.euipo.europa.eu/trademark-search/trademarks";

export function isEuipoConfigured(): boolean {
  return Boolean(process.env.EUIPO_CLIENT_ID && process.env.EUIPO_CLIENT_SECRET);
}

async function getToken(timeoutMs: number): Promise<string | null> {
  const id = process.env.EUIPO_CLIENT_ID as string;
  const secret = process.env.EUIPO_CLIENT_SECRET as string;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=uid",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Wyszukuje znaki, których element słowny zawiera podaną nazwę (RSQL). Mapuje na
 * rekordy korpusu do analizy podobieństwa. Zwraca [] przy braku konfiguracji lub
 * jakimkolwiek błędzie/limicie.
 */
export async function searchEuipoByName(name: string, timeoutMs = 8000): Promise<CorpusRecord[]> {
  if (!isEuipoConfigured()) return [];
  const token = await getToken(timeoutMs);
  if (!token) return [];

  // RSQL: element słowny zawiera nazwę (case-insensitive wildcard).
  const rsql = encodeURIComponent(`wordMarkSpecification.verbalElement=="*${name.replace(/"/g, "")}*"`);
  const url = `${API_URL}?query=${rsql}&size=20`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        // Portal EUIPO (IBM API Connect) bywa dodatkowo klucz Client-Id:
        ...(process.env.EUIPO_CLIENT_ID ? { "X-IBM-Client-Id": process.env.EUIPO_CLIENT_ID as string } : {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return mapEuipoResponse(data);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

// Mapowanie EUIPO status → nasz LegalStatus (tolerancyjne na warianty).
export function mapEuipoStatus(status: unknown): LegalStatus {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("registered")) return "registered";
  if (s.includes("filed") || s.includes("examination") || s.includes("published") || s.includes("application"))
    return "applied";
  if (s.includes("expired")) return "expired";
  if (s.includes("invalid") || s.includes("cancelled") || s.includes("ceased")) return "invalidated";
  if (s.includes("opposition") || s.includes("opposed")) return "opposed";
  if (s.includes("withdrawn") || s.includes("refused")) return "invalidated";
  return "unknown";
}

/**
 * Tolerancyjne mapowanie odpowiedzi EUIPO na rekordy korpusu. Obsługuje kilka
 * spotykanych kształtów pól (`trademarks`/`content`/tablica).
 * Wyodrębnione i eksportowane, by było testowalne bez sieci.
 */
export function mapEuipoResponse(data: unknown): CorpusRecord[] {
  try {
    const root = data as Record<string, any>;
    const list: any[] = Array.isArray(root)
      ? root
      : root?.trademarks ?? root?.content ?? root?.results ?? [];
    const out: CorpusRecord[] = [];
    for (const tm of list) {
      const verbal =
        tm?.wordMarkSpecification?.verbalElement ?? tm?.verbalElement ?? tm?.markVerbalElementText;
      if (!verbal) continue;
      const appNum = tm?.applicationNumber ?? tm?.registrationNumber ?? tm?.stId;
      const applicant = Array.isArray(tm?.applicants)
        ? tm.applicants.map((a: any) => a?.name ?? a?.fullName).filter(Boolean).join(", ")
        : tm?.applicantName;
      const niceClasses: number[] = Array.isArray(tm?.niceClasses)
        ? tm.niceClasses.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n))
        : [];
      out.push({
        name: String(verbal),
        kind: "trademark",
        owner: applicant || undefined,
        legalStatus: mapEuipoStatus(tm?.status),
        territory: tm?.registrationOfficeCode || tm?.office || "EU",
        niceClasses: niceClasses.length ? niceClasses : undefined,
        filingDate: tm?.applicationDate,
        registrationDate: tm?.registrationDate,
        expiryDate: tm?.expiryDate,
        externalId: appNum ? String(appNum) : undefined,
        link: appNum
          ? `https://euipo.europa.eu/eSearch/#details/trademarks/${encodeURIComponent(String(appNum))}`
          : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}
