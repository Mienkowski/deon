# Name Clearance Assistant

Aplikacja webowa do **wstępnej** oceny ryzyka użycia nazwy produktu, usługi,
firmy, projektu lub marki. Bada kolizje w znakach towarowych, rejestrach
przedsiębiorców, domenach, patentach (pomocniczo) i sieci, licząc ryzyko w skali
0–100 wg **jawnych reguł** i generując audytowalny raport.

> ⚠️ **To nie jest porada prawna.** Aplikacja nie zastępuje badania zdolności
> rejestrowej ani opinii rzecznika patentowego. Brak wykrytego wyniku nie
> oznacza, że nazwa jest prawnie dostępna. Zob. `LEGAL_AND_TECHNICAL_LIMITATIONS.md`.

Dokument projektowy: [`ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md`](./ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md).

## Co robi (MVP)

- Formularz nazwy: typ, opis, branża, terytoria, towary/usługi.
- **Sugestia klas nicejskich** z opisu (reguły; opcjonalnie LLM), edytowalna.
- **Generator wariantów** nazwy (20 klas transformacji, wagi) — PL diakrytyki,
  fonetyka, tłumaczenia, literówki, akronimy, prefiksy/sufiksy branżowe…
- **Generator zapytań** (dokładne / kontekstowe / domenowe / branżowe / negatywne)
  z gotowymi, legalnymi deep-linkami.
- **Konektory źródeł**:
  - **Domeny** — realny **RDAP** (RFC 9082), degradacja do WHOIS/manual per-TLD;
  - **UPRP, EUIPO (TMview/eSearch/TMclass/DesignView/GIview), WIPO, EPO, KRS,
    CEIDG, media społecznościowe** — tryb *manual verification required* z
    legalnymi deep-linkami (brak scrapingu, brak fikcyjnych API).
- **Silnik podobieństwa** (wyjaśnialny): Levenshtein, Damerau–Levenshtein,
  Jaro–Winkler, n-gramy (Dice/cosine), token set/sort ratio, Soundex, Double
  Metaphone + **reguły fonetyczne PL**, słownik koncepcyjny.
- **Model ryzyka 0–100** z regułami nadrzędnymi i statusami A/B/C/D; rozróżnia
  **fakt ze źródła / ocenę algorytmu / wniosek LLM**.
- **Raport**: ekran + eksport **JSON / CSV** + **PDF** (druk przeglądarki).
- **Historia badań**, statusy per-źródło, audyt, OpenAPI.

## Szybki start (lokalnie)

Wymagania: Node.js 20+.

```bash
cd name-clearance-app
cp .env.example .env.local          # opcjonalne — aplikacja działa bez kluczy
npm install
npm run dev                          # http://localhost:3000
```

Produkcyjnie:

```bash
npm run build && npm start
```

Testy:

```bash
npm test
```

## Uruchomienie w Docker

```bash
docker compose up --build            # http://localhost:3000
```

Usługi Postgres/Redis w `docker-compose.yml` są przygotowane pod Etap 3 i
domyślnie zakomentowane — MVP ich nie wymaga (store w pamięci procesu).

## Konfiguracja

Wszystkie zmienne są opcjonalne (aplikacja działa w pełni lokalnie). Zob.
`.env.example`. Najważniejsze:

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Włącza opcjonalną warstwę LLM (semantyka, klasy). |
| `CONNECTOR_DOMAINS_RDAP_ENABLED` | `true` | Realne zapytania RDAP dla domen. |
| `CONNECTOR_HTTP_TIMEOUT_MS` | `6000` | Timeout zapytań sieciowych. |
| `RATE_LIMIT_SEARCH_PER_MINUTE` | `20` | Limit uruchomień badania / IP / min. |

Brak opcjonalnych kluczy jest raportowany przez `GET /api/health`.

## API

Dokumentacja OpenAPI: `GET /api/openapi.json`. Kluczowe endpointy:

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/search-runs` | Uruchom badanie nazwy |
| GET | `/api/search-runs` | Historia badań |
| GET | `/api/search-runs/{id}` | Pełny wynik |
| GET | `/api/search-runs/{id}/status` | Status + źródła |
| GET | `/api/search-runs/{id}/results` | Wyniki i statusy źródeł |
| GET | `/api/search-runs/{id}/risk` | Ocena ryzyka + rekomendacje |
| POST | `/api/reports/{id}/export?format=json\|csv` | Eksport raportu |
| POST | `/api/nice-classes/suggest` | Sugestia klas nicejskich |
| GET | `/api/data-sources` | Katalog źródeł i tryb dostępu |
| GET | `/api/health` · `/api/audit-logs` | Zdrowie / audyt |

## Struktura

Zob. sekcję 11 w `ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md`. Logika domenowa w
`src/lib/*`, API w `src/app/api/*`, UI w `src/app/page.tsx`.

## Ograniczenia i dalszy rozwój

- MVP nie automatyzuje pobierania z rejestrów znaków (brak otwartych API) —
  używa trybu manualnego z deep-linkami. Dlatego status nigdy nie wskazuje
  „brak kolizji" bez ręcznej weryfikacji rejestrów (co najmniej status B).
- Etap 3 (udokumentowany): analiza logo/wizualna, embeddings (pgvector),
  porównanie wielu nazw w UI, realne API EUIPO/EPO/KRS, monitoring statusów,
  RBAC/MFA, trwały store (PostgreSQL) + cache (Redis), OpenSearch.

Licencja: zob. repozytorium nadrzędne.
