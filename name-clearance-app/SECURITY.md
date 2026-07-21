# Dokument bezpieczeństwa

> Sekcja 16 i 25 pkt 19 promptu. Opisuje mechanizmy bezpieczeństwa MVP oraz
> plan dla Etapu 3.

## Zarządzanie sekretami

- **Żadnych sekretów w kodzie.** Wszystkie klucze/tokeny pochodzą ze zmiennych
  środowiskowych. Szablon: [`.env.example`](./.env.example).
- Pliki `.env`, `.env.local` są w `.gitignore` — nie trafiają do repozytorium.
- Wykrywanie brakujących zmiennych: `GET /api/health` raportuje
  `missingOptionalEnv`. Aplikacja działa bez opcjonalnych kluczy (tryb lokalny).
- Rotacja sekretów: wykonywana po stronie dostawcy/hostingu; aplikacja czyta
  klucze wyłącznie z env w czasie żądania (brak cache'owania w kodzie).

## Walidacja i ochrona wejścia

- Walidacja wszystkich ciał żądań schematami **zod** (`src/lib/validation.ts`).
- Ograniczenia długości pól (nazwa, opis, itd.).
- Planowany limit rozmiaru uploadu logo: `MAX_LOGO_UPLOAD_BYTES` (Etap 3 —
  upload logo poza MVP).

## Ochrona aplikacji

- **XSS:** React escapuje treść; brak `dangerouslySetInnerHTML`.
- **CSRF:** operacje mutujące to POST z `content-type: application/json`;
  brak mutacji przez GET; brak ciasteczek sesyjnych w MVP.
- **Nagłówki bezpieczeństwa** (`next.config.mjs`): `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **Rate limiting:** `src/lib/rateLimit.ts` — okno przesuwne per-IP na
  uruchamianiu badań (`RATE_LIMIT_SEARCH_PER_MINUTE`).
- **SSRF/konektory:** żądania wychodzą wyłącznie do ustalonych, publicznych
  endpointów (RDAP), z timeoutem i ograniczoną współbieżnością. Brak
  pobierania URL-i podanych przez użytkownika.
- **Brak SQL injection:** MVP nie używa bazy SQL (store w pamięci). Adapter
  Postgres (Etap 3) będzie używał wyłącznie zapytań parametryzowanych/ORM.

## Audyt

- Każde uruchomienie badania i eksport raportu tworzy wpis `AuditLog`
  (`src/lib/store.ts`), dostępny przez `GET /api/audit-logs`.
- Każdy rekord źródłowy przechowuje prowenancję: źródło, link, datę pobrania,
  status weryfikacji, skrót SHA-256 danych surowych, warunki licencji.

## Transport i dane w spoczynku

- **TLS:** wymuszany na warstwie wdrożenia (reverse proxy / hosting).
- **Dane w spoczynku:** MVP nie utrwala danych (pamięć procesu). Szyfrowanie
  w spoczynku dotyczy Etapu 3 (PostgreSQL z szyfrowaniem woluminu/kolumn).

## Kontrola dostępu (Etap 3)

- **RBAC:** role `admin` / `analyst` / `viewer` w modelu danych (`User`).
- **MFA:** przewidziane w warstwie uwierzytelniania.
- Rejestrowanie działań administracyjnych.

## RODO / retencja (Etap 3)

- Polityka retencji danych badań, mechanizm usuwania danych na żądanie,
  minimalizacja danych osobowych.

## Zależności

- `npm audit` uruchamiany w CI; aktualizacja podatnych pakietów (np. Next.js do
  wersji z łatkami bezpieczeństwa).

## Zgłaszanie podatności

Podatności zgłaszaj prywatnie do opiekuna repozytorium — nie otwieraj
publicznych zgłoszeń z detalami exploita.
