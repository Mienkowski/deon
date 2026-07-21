# Name Clearance Assistant — Architektura i plan implementacji

> Dokument wymagany przez sekcję 27 promptu. Przedstawia architekturę, źródła
> danych, ograniczenia integracyjne, model ryzyka, model danych, strategię
> bezpieczeństwa, plan MVP i strukturę repozytorium **przed** i **wraz z**
> implementacją MVP.

Aplikacja służy do **wstępnej** oceny ryzyka użycia nazwy produktu/marki. Nie
jest usługą prawną i nie zastępuje badania zdolności rejestrowej ani opinii
rzecznika patentowego. Zob. sekcję „Zastrzeżenie prawne”.

---

## 0. Decyzje projektowe (ustalone z użytkownikiem)

| Decyzja | Wybór | Konsekwencja |
|---|---|---|
| Zakres | Działający MVP end-to-end | Pełne flow: formularz → warianty → wyszukiwanie → podobieństwo → ryzyko → raport |
| Stack | Next.js full-stack (TypeScript, App Router) | Jeden proces, `npm run dev`, brak osobnego backendu Python |
| Źródła danych | Realne API gdzie istnieje + reszta w trybie „manual verification required” | RDAP dla domen (realne), deep-linki do UPRP/TMview/WIPO/EPO/KRS/CEIDG. Zero scrapingu, zero fikcyjnych API |
| AI/semantyka | Algorytmy lokalne (deterministyczne) + opcjonalny LLM włączany kluczem | Działa offline; LLM to warstwa wzbogacająca, nie źródło faktów |

Odstępstwa od preferencji z prompta i ich uzasadnienie:

- **Next.js full-stack zamiast Next.js + FastAPI** — jeden runtime upraszcza
  uruchomienie i utrzymanie MVP. Cała logika podobieństwa/scoringu jest czysto
  algorytmiczna i nie wymaga ekosystemu Pythona. Architektura konektorów jest
  modularna, więc backend Python można dołożyć później bez przepisywania UI.
- **Store w pamięci zamiast PostgreSQL/pgvector/Redis w MVP** — model danych i
  interfejs store'a są zdefiniowane tak, by wymienić implementację na Postgres
  bez zmiany warstwy domenowej. pgvector/OpenSearch to Etap 3.

---

## 1. Analiza wymagań

### 1.1. Cel
„Name Clearance Assistant” — użytkownik podaje nazwę, typ, branżę, terytoria i
towary/usługi; system generuje warianty, odpytuje/deep-linkuje źródła, liczy
podobieństwo, ocenia ryzyko (0–100) wg jawnych reguł i wydaje audytowalny raport
z rozróżnieniem **fakt ze źródła** vs **ocena algorytmu** vs **wniosek LLM**.

### 1.2. Założenia
- Wynik jest zawsze komunikowany jako „nie znaleziono istotnych kolizji w
  **przeszukanych** źródłach”, nigdy „nazwa jest wolna”.
- Zawsze pokazujemy, które rejestry realnie sprawdzono, a które są w trybie
  manualnym / niedostępne.
- Brak wyniku ≠ dostępność. Reguła nadrzędna w modelu ryzyka.

### 1.3. Ryzyka projektowe
- **Brak otwartych API oficjalnych baz** (UPRP, TMview, WIPO, Espacenet, KRS).
  Mitigacja: konektory w trybie „manual verification required” generujące
  gotowe, legalne deep-linki z wariantami nazwy. Nie udajemy że pobieramy dane.
- **RDAP dla .pl** — NASK nie zawsze udostępnia publiczny RDAP; konektor
  degraduje się do trybu manualnego per-TLD, z jawnym oznaczeniem statusu.
- **Fałszywe poczucie pewności** — mitigowane komunikatami, statusami źródeł,
  rozróżnianiem faktu od oceny i obowiązkową akceptacją zastrzeżenia.
- **Rate limity / regulaminy** — konektory realne mają timeout, retry z
  backoffem i respektują brak zgody na automatyzację (fallback: manual).

---

## 2. Architektura

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js (App Router)                        │
│                                                                │
│  UI (React, TS)                     API Routes (route.ts)      │
│  ─ Formularz nazwy                  ─ POST /api/search-runs    │
│  ─ Terytoria / towary               ─ GET  /api/search-runs/id │
│  ─ Sugestie klas nicejskich         ─ .../results .../risk     │
│  ─ Podgląd wariantów                ─ POST /api/reports/id/... │
│  ─ Postęp + wyniki + mapa ryzyka    ─ GET  /api/data-sources   │
│  ─ Raport + eksport                 ─ POST /api/nice-classes.. │
│                                     ─ GET  /api/health         │
└───────────────────────────┬───────────────┬──────────────────┘
                            │               │
              ┌─────────────▼───┐   ┌────────▼─────────────────┐
              │  Domain core     │   │  Connector layer          │
              │  (src/lib)       │   │  (src/lib/connectors)     │
              │  ─ variants      │   │  ─ registry + typy        │
              │  ─ similarity    │   │  ─ uprp / euipo-tmview     │
              │    (text+fonet.) │   │  ─ wipo / epo             │
              │  ─ niceClasses   │   │  ─ krs / ceidg            │
              │  ─ queries       │   │  ─ domains (RDAP realne)  │
              │  ─ risk model    │   │  ─ web (deep-links)       │
              │  ─ report        │   │  Każdy: status + link +   │
              │  ─ store (iface) │   │  provenance + license     │
              └──────────────────┘   └───────────────────────────┘
                            │
              ┌─────────────▼───────────────┐
              │ Opcjonalny LLM (llm.ts)       │
              │ gated ANTHROPIC_API_KEY       │
              │ semantyka + sugestia klas     │
              │ (wzbogaca, nie nadpisuje      │
              │  danych źródłowych)           │
              └───────────────────────────────┘
```

Orkiestracja `SearchRun`: zapytania do konektorów wykonywane równolegle z
limitem współbieżności, timeoutem i „partial results” — częściowe wyniki są
dostępne natychmiast, a status per-źródło (`ok` / `manual` / `unavailable`) jest
raportowany.

---

## 3. Źródła danych i ograniczenia integracyjne

| Źródło | Tryb w MVP | Uzasadnienie |
|---|---|---|
| UPRP e-Wyszukiwarka (znaki, wynalazki, wzory) | manual + deep-link | Brak stabilnego publicznego API do automatyzacji |
| EUIPO TMview / eSearch / TMclass / DesignView / GIview | manual + deep-link | API TMview wymaga umowy/klucza; publicznie deep-link |
| WIPO Global Brand DB / Madrid Monitor / PATENTSCOPE | manual + deep-link | Brak otwartego API do masowego pobierania |
| EPO Espacenet / European Patent Register | manual + deep-link | OPS API wymaga rejestracji klucza (Etap 3) |
| KRS / CEIDG / REGON | manual + deep-link | KRS/CEIDG mają API, ale z warunkami; MVP deep-linkuje |
| Domeny (.pl .com .eu .net .org .ai .app .io …) | **realne RDAP** + fallback manual | RDAP jest publicznym, legalnym standardem (RFC 7482/9082) |
| Wyszukiwarki / social / app stores / repo | deep-link (manual) | Regulaminy zakazują automatycznego scrapingu |

Zasada: **nie implementujemy niedozwolonego scrapingu i nie tworzymy fikcyjnych
API**. Każdy konektor deklaruje `accessMode`, `license/terms` i `status`.

Ścieżka rozbudowy o realne API (udokumentowana, wyłączona flagami w `.env`):
EUIPO TMview API, EPO OPS, WIPO, KRS API — po dostarczeniu kluczy.

---

## 4. Generator wariantów nazwy (sekcja 5 prompta)

20 klas transformacji: oryginał, case'y, bez PL-diakrytyków, bez spacji, z/bez
łącznika, l.poj/mn., warianty fleksyjne (heurystyka PL), fonetyczne, literówki
(edit-distance 1), transliteracja, tłumaczenia (słownik + opcj. LLM), akronimy,
odwrócona kolejność, prefiksy/sufiksy branżowe, formy podobnie brzmiące.
Każdy wariant ma **wagę** i **typ** (nie są równoważne).

## 5. Silnik podobieństwa (sekcja 7)

- **Tekst:** Levenshtein, Damerau–Levenshtein, Jaro–Winkler, n-gramy (Dice),
  cosine (bag-of-char-ngrams), token set ratio, token sort ratio, wspólny
  prefiks/sufiks, człon dominujący.
- **Fonetyka:** Soundex, Metaphone, Double Metaphone + reguły PL
  (sz→s, cz→c, rz/ż→z, ch→h, w→f na końcu, ó→u, ą/ę nasal, dz/dź/dż itp.).
- **Semantyka:** lokalny słownik synonimów/tłumaczeń + **opcjonalny LLM**
  (sygnał pomocniczy, nie kolizja sama w sobie).
- **Wyjaśnialność:** każdy wynik zwraca który algorytm, jaki wynik liczbowy,
  które fragmenty wspólne.

## 6. Model oceny ryzyka (sekcja 9)

Składowe (suma bazowa 0–100):

| Składowa | Zakres |
|---|---|
| identyczność oznaczenia | 0–30 |
| podobieństwo słowne | 0–15 |
| podobieństwo fonetyczne | 0–10 |
| podobieństwo koncepcyjne | 0–5 |
| podobieństwo towarów i usług | 0–20 |
| zgodność terytorium | 0–8 |
| aktywny status prawny | 0–7 |
| renoma / intensywność używania | 0–5 |

**Reguły nadrzędne (override):**
1. Identyczny, aktywny znak, ta sama branża i terytorium ⇒ min. **wysokie**
   (≥ 61).
2. Identyczny znak renomowany ⇒ wysokie także poza podobnymi klasami.
3. Znak wygasły **nie** zeruje ryzyka (nazwa może być nadal używana).
4. Brak wyniku w jednej bazie **nie** obniża ryzyka.
5. Brak wyników internetowych **nie** jest dowodem nieużywania.

Wynik ogólny nie jest średnią — to max(suma ważona, wynik reguł nadrzędnych),
przycięty do 0–100. Kategorie: 0–20 niskie, 21–40 umiark. niskie, 41–60 do
pogłębienia, 61–80 wysokie, 81–100 bardzo wysokie. Statusy A/B/C/D wg sekcji 10.

## 7. Model danych (sekcja 14)

Encje (TypeScript, `src/lib/types.ts`): `User`, `Organization`, `SearchProject`,
`NameCandidate`, `SearchRun`, `SearchQuery`, `DataSource`, `SourceConnector`,
`SourceResult`, `TrademarkRecord`, `PatentRecord`, `CompanyRecord`,
`DomainRecord`, `WebMention`, `SocialMediaMention`, `NiceClass`,
`SimilarityAssessment`, `RiskAssessment`, `Recommendation`, `Report`,
`AuditLog`.

Każdy rekord źródłowy: `source`, `externalId`, `raw`, `normalized`,
`retrievedAt`, `sourceUpdatedAt`, `verificationStatus`, `contentHash` (SHA-256),
`link`, `license`. Store: interfejs `Store` (impl. in-memory w MVP, wymienny na
Postgres/pgvector w Etap 3).

## 8. API (sekcja 15)

`POST/GET /api/projects`, `.../{id}`, `.../{id}/candidates`,
`POST/GET /api/search-runs`, `.../{id}`, `.../status`, `.../results`,
`.../risk`, `.../retry`, `.../cancel`, `GET /api/reports/{id}`,
`POST /api/reports/{id}/export`, `GET /api/data-sources`, `GET /api/health`,
`GET /api/audit-logs`. Dokumentacja OpenAPI: `GET /api/openapi.json`.

## 9. Bezpieczeństwo i zgodność (sekcja 16)

- Sekrety wyłącznie w env (`.env.example`, walidacja brakujących zmiennych na
  starcie), nigdy w kodzie.
- Walidacja wejścia (zod), limit rozmiaru uploadu logo, sanityzacja.
- HTTPS/TLS na wdrożeniu, nagłówki bezpieczeństwa, ochrona XSS (React) i CSRF
  (same-site, brak stanu mutowalnego z GET).
- Rate limiting na endpointach uruchamiających wyszukiwanie.
- Audyt: `AuditLog` dla każdego uruchomienia i eksportu.
- RODO: polityka retencji i endpoint usuwania danych (Etap 3 — udokumentowane).
- RBAC/MFA — zaprojektowane, wdrożenie w Etap 3 (MVP: pojedynczy użytkownik
  lokalny).

## 10. Plan MVP (sekcja 24, Etap 2) — zakres tej dostawy

- [x] Formularz nazwy + typ + opis + branża + terytoria + towary/usługi
- [x] Sugestia klas nicejskich (reguły + opcj. LLM), edytowalna, z uzasadnieniem
- [x] Generator wariantów z wagami
- [x] Generator zapytań (dokładne / kontekstowe / domenowe / branżowe / negatywne)
- [x] Konektory: domeny (RDAP realne) + UPRP/TMview/WIPO/EPO/KRS/CEIDG/web (deep-link, manual)
- [x] Silnik podobieństwa (tekst + fonetyka PL) z wyjaśnialnością
- [x] Model ryzyka 0–100 z regułami nadrzędnymi i statusami A/B/C/D
- [x] Raport na ekranie + eksport JSON / CSV (+ PDF przez druk przeglądarki)
- [x] Historia analiz (store), status per-źródło, wyniki cząstkowe
- [x] Testy jednostkowe (similarity, fonetyka PL, warianty, ryzyko, klasy)
- [x] Dockerfile, docker-compose, .env.example, README, dokument ograniczeń

Etap 3 (poza MVP, udokumentowane): logo/wizualne, embeddings pgvector,
porównanie wielu nazw (UI), realne API (EUIPO/EPO/KRS), monitoring statusów,
RBAC/MFA, OpenSearch, Postgres.

## 11. Struktura repozytorium

```
name-clearance-app/
├── ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md
├── LEGAL_AND_TECHNICAL_LIMITATIONS.md
├── SECURITY.md
├── README.md
├── .env.example
├── package.json / tsconfig.json / next.config.mjs / vitest.config.ts
├── Dockerfile / docker-compose.yml / .dockerignore
└── src/
    ├── app/                     # UI + API routes
    │   ├── page.tsx, layout.tsx, globals.css
    │   └── api/...              # endpointy REST + openapi.json
    └── lib/
        ├── types.ts             # model danych
        ├── store.ts             # interfejs + in-memory
        ├── variants.ts          # generator wariantów
        ├── queries.ts           # generator zapytań
        ├── niceClasses.ts       # sugestia klas nicejskich
        ├── risk.ts              # model ryzyka
        ├── report.ts            # raport + eksport
        ├── llm.ts               # opcjonalny LLM (gated)
        ├── orchestrator.ts      # SearchRun orchestration
        ├── similarity/          # textual.ts, phonetic.ts, index.ts
        └── connectors/          # registry.ts + per-source
```

## 12. Kryteria akceptacji → mapowanie
Wszystkie punkty sekcji 27 są adresowane przez powyższe moduły; MVP jest
uruchamialny (`npm run dev` lub Docker), testy przechodzą, źródła mają jawny
status i linki, ryzyko liczone jawnymi regułami, wynik nigdy nie jest
gwarancją prawną, raport jest audytowalny.
