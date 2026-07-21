// Rejestr konektorów: buduje status per-źródło (sekcja 3, 23) oraz wyniki
// domenowe (realny RDAP) i społecznościowe/oficjalne w trybie manualnym z
// legalnymi deep-linkami. Każde źródło jawnie deklaruje tryb dostępu i licencję.

import type {
  DataSourceStatus,
  NameCandidate,
  SourceResult,
  SourceKind,
} from "@/lib/types";
import { DEEP_LINK_SOURCES, socialMediaLinks } from "./deepLinks";
import { checkDomains } from "./domains";

let seq = 0;
const rid = () => `sr_${(seq += 1)}`;

function kindForSource(id: string): SourceKind {
  if (["uprp", "euipo_tmview", "euipo_esearch", "tmclass", "wipo_brand", "wipo_madrid"].includes(id))
    return "trademark";
  if (["wipo_patentscope", "epo_espacenet", "epo_register"].includes(id)) return "patent";
  if (["krs", "ceidg"].includes(id)) return "company";
  if (["giview"].includes(id)) return "geographic";
  if (["designview"].includes(id)) return "trademark";
  return "web";
}

export interface ConnectorRunResult {
  sources: DataSourceStatus[];
  results: SourceResult[];
}

export async function runConnectors(candidate: NameCandidate): Promise<ConnectorRunResult> {
  const name = candidate.name;
  const sources: DataSourceStatus[] = [];
  const results: SourceResult[] = [];
  const now = new Date().toISOString();

  // ── Źródła oficjalne (manual + deep-link) ──────────────────────────────
  for (const src of DEEP_LINK_SOURCES) {
    const urls = src.buildUrls(name);
    sources.push({
      id: src.id,
      name: src.name,
      kind: kindForSource(src.id),
      accessMode: "manual",
      status: "manual",
      message:
        "Brak otwartego API do automatycznego pobierania — przygotowano legalny link do ręcznej weryfikacji.",
      queryUrls: urls,
      license: src.license,
    });
  }

  // ── Domeny: realny RDAP ─────────────────────────────────────────────────
  const rdapEnabled = process.env.CONNECTOR_DOMAINS_RDAP_ENABLED !== "false";
  const timeoutMs = Number(process.env.CONNECTOR_HTTP_TIMEOUT_MS ?? 6000);
  let domainStatus: DataSourceStatus["status"] = "manual";
  let domainMsg = "RDAP wyłączony — linki WHOIS do ręcznej weryfikacji.";
  try {
    const domains = await checkDomains(name, { enabled: rdapEnabled, timeoutMs });
    const verified = domains.filter((d) => d.provenance.verificationStatus === "verified");
    domainStatus = rdapEnabled ? (verified.length ? "ok" : "partial") : "manual";
    domainMsg = rdapEnabled
      ? `Sprawdzono ${domains.length} domen przez RDAP (${verified.length} zweryfikowanych).`
      : domainMsg;
    for (const d of domains) {
      results.push({
        id: rid(),
        kind: "domain",
        title: d.domain,
        matchedValue: d.domain,
        legalStatus: "not_applicable",
        registrationDate: d.registrationDate,
        expiryDate: d.expiryDate,
        actualUse: d.status === "registered",
        provenance: d.provenance,
        note:
          d.status === "available"
            ? "Domena prawdopodobnie wolna (RDAP 404)."
            : d.status === "registered"
              ? "Domena zarejestrowana."
              : "Status niepewny — wymaga ręcznej weryfikacji.",
      });
    }
    sources.push({
      id: "domains_rdap",
      name: "Domeny internetowe (RDAP / WHOIS)",
      kind: "domain",
      accessMode: "rdap",
      status: domainStatus,
      message: domainMsg,
      queryUrls: domains.map((d) => d.provenance.link!).filter(Boolean),
      license: "RDAP (RFC 9082) — publiczny protokół rejestrów domen.",
    });
  } catch {
    sources.push({
      id: "domains_rdap",
      name: "Domeny internetowe (RDAP / WHOIS)",
      kind: "domain",
      accessMode: "rdap",
      status: "unavailable",
      message: "Błąd połączenia z RDAP — użyj linków WHOIS do ręcznej weryfikacji.",
      queryUrls: [],
      license: "RDAP (RFC 9082).",
    });
  }

  // ── Media społecznościowe (manual + deep-link) ──────────────────────────
  const social = socialMediaLinks(name);
  sources.push({
    id: "social",
    name: "Media społecznościowe (profile/nazwy)",
    kind: "social",
    accessMode: "manual",
    status: "manual",
    message:
      "Regulaminy platform zakazują automatycznego pobierania — przygotowano linki do ręcznego sprawdzenia dostępności profili.",
    queryUrls: social.map((s) => s.url),
    license: "Weryfikacja ręczna zgodnie z regulaminami platform.",
  });
  for (const s of social) {
    results.push({
      id: rid(),
      kind: "social",
      title: `${s.name}: ${name}`,
      matchedValue: name,
      provenance: {
        source: s.name,
        link: s.url,
        retrievedAt: now,
        verificationStatus: "manual_required",
        license: "Weryfikacja ręczna zgodnie z regulaminem platformy.",
      },
      note: "Sprawdź ręcznie, czy profil o tej nazwie istnieje.",
    });
  }

  return { sources, results };
}
