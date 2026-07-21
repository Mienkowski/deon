// Model danych aplikacji (sekcja 14 prompta). Typy współdzielone przez
// warstwę domenową, konektory, API i UI. Store'y (in-memory w MVP, Postgres w
// Etapie 3) implementują interfejs z `store.ts` na tych typach.

export type MarkType =
  | "product"
  | "service"
  | "company"
  | "project"
  | "application"
  | "technology"
  | "event"
  | "organization"
  | "personal_brand";

export type Territory = string; // ISO-3166 alpha-2 lub "EU" / "WO"

// ── Prowenancja: każdy rekord źródłowy przechowuje pełny ślad audytowy ──────
export interface Provenance {
  source: string; // np. "EUIPO TMview"
  externalId?: string; // identyfikator rekordu w źródle
  link?: string; // bezpośredni link do rekordu / zapytania
  retrievedAt: string; // ISO — kiedy pozyskano
  sourceUpdatedAt?: string; // ISO — data aktualizacji w źródle (jeśli znana)
  verificationStatus: "verified" | "unverified" | "manual_required";
  contentHash?: string; // SHA-256 danych surowych
  license?: string; // warunki wykorzystania / licencja źródła
  raw?: unknown; // dane surowe ze źródła
}

// ── Encje wejściowe ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: "admin" | "analyst" | "viewer";
}

export interface Organization {
  id: string;
  name: string;
}

export interface NiceClassSuggestion {
  classNumber: number; // 1–45
  title: string;
  description: string;
  rationale: string; // dlaczego zaproponowano
  confidence: number; // 0–1
  selected: boolean; // użytkownik może zmienić
  source: "rule" | "llm" | "user";
}

export interface NameCandidate {
  id: string;
  name: string;
  markType: MarkType;
  description: string;
  industry: string;
  territories: Territory[];
  // Pola dodatkowe
  plannedDomain?: string;
  languages?: string[];
  customerGroups?: string;
  usageDescription?: string;
  goodsServices?: string;
  niceClasses?: NiceClassSuggestion[];
  plannedStartDate?: string;
  spellingVariants?: string[];
  slogan?: string;
  hasLogo?: boolean;
  competitors?: string[];
  priorityMarkets?: Territory[];
}

export interface SearchProject {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  candidates: NameCandidate[];
}

// ── Warianty i zapytania ────────────────────────────────────────────────────
export type VariantType =
  | "original"
  | "case"
  | "no_diacritics"
  | "spacing"
  | "hyphen"
  | "plural"
  | "inflection"
  | "phonetic"
  | "typo"
  | "transliteration"
  | "translation"
  | "acronym"
  | "reorder"
  | "affix";

export interface NameVariant {
  value: string;
  type: VariantType;
  weight: number; // 0–1: waga podobieństwa/istotności
  note?: string;
}

export interface SearchQuery {
  id: string;
  category: "exact" | "contextual" | "domain" | "vertical" | "negative";
  query: string;
  targetSource?: string;
  url?: string; // gotowy, legalny link do wykonania zapytania
}

// ── Wyniki źródłowe ─────────────────────────────────────────────────────────
export type SourceKind =
  | "trademark"
  | "patent"
  | "company"
  | "domain"
  | "web"
  | "social"
  | "geographic";

export type LegalStatus =
  | "registered"
  | "applied"
  | "expired"
  | "invalidated"
  | "opposed"
  | "unknown"
  | "not_applicable";

export interface SourceResult {
  id: string;
  kind: SourceKind;
  title: string; // znormalizowana etykieta
  matchedValue?: string; // wartość ze źródła, która pasuje
  owner?: string;
  legalStatus?: LegalStatus;
  territory?: Territory;
  niceClasses?: number[];
  filingDate?: string;
  registrationDate?: string;
  expiryDate?: string;
  reputation?: boolean; // znak renomowany
  actualUse?: boolean; // faktyczne używanie wykryte
  provenance: Provenance;
  similarity?: SimilarityAssessment;
  note?: string;
}

// ── Podobieństwo (wyjaśnialne) ──────────────────────────────────────────────
export interface SimilarityComponent {
  algorithm: string; // np. "Jaro-Winkler", "Double Metaphone (PL)"
  kind: "textual" | "phonetic" | "semantic" | "conceptual";
  score: number; // 0–1
  detail?: string; // wyjaśnienie (wspólne fragmenty itd.)
}

export interface SimilarityAssessment {
  query: string; // wariant, który dopasowano
  candidate: string; // wartość ze źródła
  overall: number; // 0–1 zagregowane
  identical: boolean;
  components: SimilarityComponent[];
  sharedPrefix?: string;
  sharedSuffix?: string;
  explanation: string;
}

// ── Ryzyko ──────────────────────────────────────────────────────────────────
export interface RiskComponentScore {
  key: string;
  label: string;
  value: number;
  max: number;
  rationale: string;
}

export type RiskStatus = "A" | "B" | "C" | "D"; // sekcja 10

export interface RiskAssessment {
  score: number; // 0–100
  category: "low" | "moderate_low" | "needs_review" | "high" | "very_high";
  status: RiskStatus;
  statusMessage: string;
  components: RiskComponentScore[];
  overrideRulesApplied: string[];
  dataCompleteness: {
    automatedTrademarkSearch: boolean; // czy rejestry znaków przeszukano automatycznie
    unavailableSources: number;
    note: string;
  };
  factsVsAssessment: {
    facts: string[]; // dane ze źródeł
    algorithmicAssessments: string[]; // oceny algorytmów
    llmInferences: string[]; // wnioski modelu językowego
  };
}

export interface Recommendation {
  id: string;
  text: string;
  priority: "info" | "suggested" | "important";
}

// ── Przebieg wyszukiwania ───────────────────────────────────────────────────
export type ConnectorStatus = "ok" | "partial" | "manual" | "unavailable" | "pending";

export interface DataSourceStatus {
  id: string;
  name: string;
  kind: SourceKind;
  accessMode: "api" | "rdap" | "manual" | "import";
  status: ConnectorStatus;
  message: string;
  queryUrls: string[]; // legalne deep-linki do ręcznej weryfikacji
  license?: string;
}

export interface SearchRun {
  id: string;
  candidate: NameCandidate;
  createdAt: string;
  finishedAt?: string;
  status: "pending" | "running" | "partial" | "completed" | "cancelled" | "failed";
  variants: NameVariant[];
  queries: SearchQuery[];
  sources: DataSourceStatus[];
  results: SourceResult[];
  risk?: RiskAssessment;
  recommendations: Recommendation[];
  requestedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}
