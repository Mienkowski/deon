// Konektor domen — REALNE sprawdzenie przez RDAP (RFC 7482/9082), publiczny i
// legalny standard. Degradacja do trybu manualnego dla TLD bez publicznego RDAP
// (np. część rejestrów krajowych). Zero scrapingu.

import { createHash } from "node:crypto";
import type { DomainRecord } from "./types";

const DEFAULT_TLDS = ["pl", "com", "eu", "net", "org", "ai", "app", "io"];

// RDAP endpoint bootstrap: rdap.org kieruje do właściwego rejestru.
function rdapUrl(domain: string): string {
  return `https://rdap.org/domain/${encodeURIComponent(domain)}`;
}

// Publiczna wyszukiwarka WHOIS/RDAP jako link do ręcznej weryfikacji.
function whoisLink(domain: string): string {
  return `https://www.whois.com/whois/${encodeURIComponent(domain)}`;
}

function sanitizeLabel(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
}

function hash(v: unknown): string {
  return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

async function checkOne(domain: string, timeoutMs: number): Promise<DomainRecord> {
  const now = new Date().toISOString();
  const base: Omit<DomainRecord, "status" | "provenance"> = { domain };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rdapUrl(domain), {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    clearTimeout(timer);
    if (res.status === 404) {
      // RDAP 404 = brak rejestracji obiektu ⇒ domena prawdopodobnie wolna.
      return {
        ...base,
        status: "available",
        provenance: {
          source: "RDAP",
          link: whoisLink(domain),
          retrievedAt: now,
          verificationStatus: "verified",
          license: "RDAP (RFC 9082) — publiczny protokół rejestrów domen.",
          contentHash: hash({ domain, http: 404 }),
        },
      };
    }
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const events = (data.events as { eventAction?: string; eventDate?: string }[]) ?? [];
      const registered = events.find((e) => e.eventAction === "registration")?.eventDate;
      const expiry = events.find((e) => e.eventAction === "expiration")?.eventDate;
      return {
        ...base,
        status: "registered",
        registrationDate: registered,
        expiryDate: expiry,
        provenance: {
          source: "RDAP",
          externalId: (data.handle as string) ?? domain,
          link: whoisLink(domain),
          retrievedAt: now,
          verificationStatus: "verified",
          license: "RDAP (RFC 9082) — publiczny protokół rejestrów domen.",
          contentHash: hash(data),
          raw: data,
        },
      };
    }
    // Inny status (np. 400/501 dla TLD bez RDAP) ⇒ tryb manualny.
    return manualRecord(domain, now, `RDAP zwrócił status ${res.status}`);
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : "błąd sieci/RDAP";
    return manualRecord(domain, now, reason);
  }
}

function manualRecord(domain: string, now: string, reason: string): DomainRecord {
  return {
    domain,
    status: "unknown",
    provenance: {
      source: "RDAP",
      link: whoisLink(domain),
      retrievedAt: now,
      verificationStatus: "manual_required",
      license: "RDAP (RFC 9082); dla tego TLD zalecana ręczna weryfikacja WHOIS.",
      raw: { reason },
    },
  };
}

export async function checkDomains(
  name: string,
  opts: { tlds?: string[]; timeoutMs?: number; enabled?: boolean } = {},
): Promise<DomainRecord[]> {
  const label = sanitizeLabel(name);
  const tlds = opts.tlds ?? DEFAULT_TLDS;
  const now = new Date().toISOString();
  if (!label) return [];

  // Warianty z łącznikiem (dla nazw wieloczłonowych) — bez duplikatów.
  const labels = new Set<string>([label]);
  const hyphen = sanitizeLabel(name).length ? name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]+/g, "") : "";
  if (hyphen && hyphen !== label) labels.add(hyphen);

  const domains = [...labels].flatMap((l) => tlds.map((t) => `${l}.${t}`));

  if (!opts.enabled) {
    return domains.map((domain) => manualRecord(domain, now, "RDAP wyłączony w konfiguracji"));
  }

  const timeoutMs = opts.timeoutMs ?? 6000;
  // Ograniczona współbieżność, by respektować rejestry.
  const results: DomainRecord[] = [];
  const pool = 4;
  for (let i = 0; i < domains.length; i += pool) {
    const batch = domains.slice(i, i + pool);
    results.push(...(await Promise.all(batch.map((d) => checkOne(d, timeoutMs)))));
  }
  return results;
}
