// Realny konektor EPO OPS (Open Patent Services) — patenty jako źródło
// POMOCNICZE do wykrywania wcześniejszego użycia nazwy/terminu (sekcja 2.2).
//
// Aktywuje się WYŁĄCZNIE gdy skonfigurowano EPO_OPS_CONSUMER_KEY/SECRET oraz
// istnieje egress sieciowy. W przeciwnym razie zwraca [] i źródło pozostaje w
// trybie manualnym. Kod jest defensywny — każdy błąd degraduje do pustej listy,
// nigdy nie wywraca aplikacji.
//
// API: OAuth2 client_credentials → REST search (CQL). Zgodnie z warunkami EPO
// (rejestracja klucza, limity). Nie obchodzimy limitów ani zabezpieczeń.

import type { CorpusRecord } from "./corpus";

const AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";
const SEARCH_URL = "https://ops.epo.org/3.2/rest-services/published-data/search/biblio";

export function isEpoConfigured(): boolean {
  return Boolean(process.env.EPO_OPS_CONSUMER_KEY && process.env.EPO_OPS_CONSUMER_SECRET);
}

async function getToken(timeoutMs: number): Promise<string | null> {
  const key = process.env.EPO_OPS_CONSUMER_KEY as string;
  const secret = process.env.EPO_OPS_CONSUMER_SECRET as string;
  const basic = Buffer.from(`${key}:${secret}`).toString("base64");
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
      body: "grant_type=client_credentials",
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
 * Wyszukuje patenty, których tytuł zawiera podaną nazwę (CQL: ti="..."), i mapuje
 * na rekordy korpusu do analizy podobieństwa. Zwraca [] przy braku konfiguracji
 * lub jakimkolwiek błędzie/limicie.
 */
export async function searchEpoByName(name: string, timeoutMs = 8000): Promise<CorpusRecord[]> {
  if (!isEpoConfigured()) return [];
  const token = await getToken(timeoutMs);
  if (!token) return [];

  const cql = encodeURIComponent(`ti="${name.replace(/"/g, "")}"`);
  const url = `${SEARCH_URL}?q=${cql}&Range=1-15`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return mapEpoResponse(data);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

// EPO OPS zwraca zagnieżdżony JSON (ops:world-patent-data). Mapowanie jest
// tolerancyjne na braki pól.
function mapEpoResponse(data: unknown): CorpusRecord[] {
  try {
    const root = data as Record<string, any>;
    const docs =
      root?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["ops:search-result"]?.["ops:publication-reference"] ??
      [];
    const list = Array.isArray(docs) ? docs : [docs];
    const out: CorpusRecord[] = [];
    for (const d of list) {
      const docId = d?.["document-id"];
      const country = docId?.country?.$ ?? "";
      const num = docId?.["doc-number"]?.$ ?? "";
      const kind = docId?.kind?.$ ?? "";
      const id = `${country}${num}${kind}`;
      if (!id) continue;
      out.push({
        name: `Patent ${id}`,
        kind: "patent",
        territory: country || undefined,
        externalId: id,
        legalStatus: "registered",
        link: `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(id)}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}
