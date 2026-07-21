# Ograniczenia prawne i techniczne

> Dokument wymagany przez sekcję 25 pkt 20 promptu. Opisuje granice, w jakich
> aplikacja może być używana, oraz świadome decyzje projektowe wpływające na
> interpretację wyników.

## 1. Charakter prawny wyniku

Aplikacja realizuje **wstępne** wyszukiwanie i ocenę ryzyka. **Nie** jest
usługą prawną, **nie** stanowi porady prawnej, **nie** zastępuje:

- badania zdolności rejestrowej znaku towarowego,
- opinii rzecznika patentowego lub adwokata/radcy prawnego,
- oceny naruszenia praw osób trzecich.

Najbezpieczniejszy komunikat aplikacji brzmi **„nie znaleziono istotnych
kolizji w przeszukanych źródłach"**, a nigdy „nazwa jest wolna/dostępna”.

Pełne zastrzeżenie (prezentowane w aplikacji i w raporcie):

> Aplikacja służy do wstępnego wyszukiwania i oceny ryzyka. Nie świadczy usług
> prawnych, nie zastępuje profesjonalnego badania zdolności rejestrowej ani
> opinii rzecznika patentowego lub adwokata. Wynik zależy od kompletności i
> aktualności zewnętrznych baz danych. Brak wykrytego wyniku nie oznacza, że
> oznaczenie jest prawnie dostępne ani że jego używanie nie narusza praw osób
> trzecich.

Użytkownik musi zaakceptować zastrzeżenie przed uruchomieniem badania.

## 2. Ograniczenia źródeł danych

### 2.1. Dostęp do rejestrów znaków (EUIPO realne API)
**EUIPO** udostępnia **Trade Marks Search API** (OAuth2 client_credentials,
rejestracja na portalu deweloperskim EUIPO). Aplikacja ma **realny konektor**
EUIPO (`src/lib/connectors/euipo.ts`): po ustawieniu `EUIPO_CLIENT_ID/SECRET`
w środowisku z dostępem sieciowym przeszukuje znaki automatycznie — zarówno w
analizie podobieństwa (źródło „euipo"), jak i w głównym badaniu (status źródła
„ok", co pozwala ocenie ryzyka osiągnąć status A/B/C). Konektor jest defensywny:
każdy błąd/limit degraduje do trybu manualnego, nie wywraca aplikacji.

Pozostałe rejestry — UPRP, WIPO (Global Brand Database/Madrid Monitor/
PATENTSCOPE), EPO (Register) oraz część funkcji EUIPO (TMclass/DesignView/
GIview) — nie mają otwartego, darmowego API do masowego pobierania lub wymagają
odrębnych umów. Działają w trybie **„manual verification required"**: aplikacja
generuje gotowe, legalne deep-linki, ale **nie pobiera** danych automatycznie.
Patenty (EPO OPS) mają realny, gated konektor jako źródło pomocnicze.

**Uwaga o środowisku:** jeżeli środowisko uruchomieniowe blokuje ruch wychodzący
(egress), realne API (EUIPO/EPO/RDAP) nie zadziała mimo poprawnych kluczy —
konektor zwróci pustą listę / status „unavailable", a aplikacja pozostanie
w pełni funkcjonalna na zbiorze przykładowym i imporcie.

**Konsekwencja dla oceny:** skoro rejestry znaków nie są przeszukiwane
automatycznie, aplikacja **nigdy** nie wskazuje statusu A („brak istotnych
kolizji") wyłącznie na tej podstawie — minimalny status to **B** (wymaga
weryfikacji), a baner „Kompletność danych" jawnie to komunikuje.

### 2.2. Domeny (RDAP)
Sprawdzanie domen wykorzystuje **RDAP** (RFC 7482/9082) — publiczny, legalny
protokół rejestrów domen. Część TLD (w tym niektóre rejestry krajowe, np. `.pl`)
może nie udostępniać publicznego RDAP; wówczas konektor degraduje się do trybu
manualnego z linkiem WHOIS, jawnie oznaczając status jako „wymaga weryfikacji".

### 2.3. Wyszukiwarki, sklepy, social media
Regulaminy tych serwisów zwykle zakazują automatycznego scrapingu. Aplikacja
**nie** obchodzi CAPTCHA, limitów ani zabezpieczeń i **nie** scrapuje tych
źródeł. Zamiast tego generuje legalne linki do ręcznego wykonania zapytań.

### 2.3a. Zbiór przykładowy do analizy podobieństwa
Ekran „Analiza podobieństwa" korzysta domyślnie z **wbudowanego zbioru
PRZYKŁADOWEGO** — dane **fikcyjne/ilustracyjne**, jawnie oznaczone, **nie**
odzwierciedlają stanu żadnego rejestru. Służą wyłącznie do demonstracji silnika
podobieństwa w środowisku bez dostępu do sieci. Do realnej pracy należy użyć:
importu własnej listy (legalne, dane użytkownika) albo realnego API (EPO OPS,
a docelowo EUIPO) w środowisku z egress i kluczem. Wyniki na zbiorze
przykładowym **nie** mają znaczenia prawnego.

### 2.4. Rejestry przedsiębiorców (KRS/CEIDG/REGON)
KRS i CEIDG udostępniają dane publicznie, lecz z warunkami korzystania. W MVP
działają w trybie deep-link; integracja z ich API to Etap 3, po weryfikacji
warunków licencyjnych.

## 3. Ograniczenia metod (silnik podobieństwa)

- Algorytmy tekstowe/fonetyczne są **heurystykami** — wykrywają sygnały
  podobieństwa, ale nie rozstrzygają o podobieństwie w rozumieniu prawa znaków
  towarowych (to ocena prawnika/urzędu).
- Reguły fonetyczne PL oraz Double Metaphone są uproszczone i mogą nie objąć
  wszystkich przypadków brzegowych.
- Podobieństwo semantyczne/koncepcyjne jest **sygnałem pomocniczym** i samo w
  sobie nie oznacza kolizji.
- Sugestia klas nicejskich jest oparta na słowach kluczowych (wybrane klasy),
  nie na pełnym wykazie 1–45 — wymaga weryfikacji.

## 4. Ograniczenia modelu ryzyka

- Wynik 0–100 jest funkcją **jawnych reguł** i danych, jakimi dysponuje system.
  Niekompletne dane obniżają wiarygodność (status D przy realnych awariach,
  status ≥ B przy braku automatycznego przeszukania rejestrów).
- Reguły nadrzędne (identyczny aktywny/renomowany znak; znak wygasły nadal
  używany; brak wyniku ≠ dostępność) świadomie zawyżają ostrożność.
- Model **nie** modeluje pełnego prawa krajowego/unijnego ani orzecznictwa.

## 5. Rola opcjonalnego LLM

- LLM (gdy włączony kluczem) dostarcza **wyłącznie sygnał pomocniczy**
  (semantyka, propozycje klas). **Nie** nadpisuje danych źródłowych.
- Wnioski LLM są w raporcie oznaczone oddzielnie od faktów i ocen algorytmu.
- Bez klucza aplikacja działa w pełni na algorytmach lokalnych.

## 6. Ograniczenia techniczne MVP

- Store w pamięci procesu — dane nie przetrwają restartu (Etap 3: PostgreSQL).
- Brak RBAC/MFA i trwałego audytu — zaprojektowane, wdrożenie w Etapie 3.
- Rate limiting w pamięci (jedna instancja) — Etap 3: Redis.
- Analiza logo/wizualna nie jest częścią MVP.

## 7. Zgodność

- Nie zapisujemy sekretów w kodzie; konfiguracja przez zmienne środowiskowe.
- Dane wejściowe walidowane (zod); nagłówki bezpieczeństwa ustawione.
- RODO: polityka retencji i mechanizmy usuwania danych — Etap 3
  (store w pamięci MVP nie utrwala danych osobowych poza sesją procesu).
