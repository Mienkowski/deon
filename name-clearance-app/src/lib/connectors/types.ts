import type { Provenance } from "@/lib/types";

export interface DomainRecord {
  domain: string;
  status: "available" | "registered" | "unknown";
  registrationDate?: string;
  expiryDate?: string;
  provenance: Provenance;
}
