# Kalkulator ROI — wdrożenie Claude w firmie komercyjnej

Samodzielne narzędzie (jeden plik HTML) do oceny opłacalności wdrożenia Claude
w firmie komercyjnej. Model **portfelowy**: każdy dział liczony osobno, bo ich
profile zwrotu różnią się o rząd wielkości.

Siostrzane narzędzie dla laboratorium B+R: [`../roi-futur-lab/`](../roi-futur-lab/).

## Uruchomienie

Otwórz `index.html` w przeglądarce. Bez budowania, bez zależności, bez sieci —
wszystkie obliczenia wykonują się lokalnie i żadne dane nie opuszczają urządzenia.

## Presety

Cztery gotowe struktury firm, w pełni edytowalne po wczytaniu:

| Preset | Skala | Co pokazuje |
|---|---|---|
| Usługi B2B / software house / agencja | 80 osób | Mnożnik wartości godziny > 1 dla osób rozliczanych u klienta |
| Produkt / SaaS | 120 osób | Rozłożenie wartości między inżynierię, sprzedaż i customer success |
| E-commerce / handel | 60 osób | Efekt wolumenowy w treściach i obsłudze zamówień |
| Produkcja / przemysł | 300 osób | **Że nie wolno dzielić przez cały stan zatrudnienia** — 200 osób na hali ma czas kwalifikowany bliski zeru i generuje wyłącznie koszt |

## Zakres

| Moduł | Zawartość |
|---|---|
| 1 | Model finansowy: portfel działów, NPV (łączne i tylko kosztowe), okres zwrotu, próg opłacalności, tornado wrażliwości, Monte Carlo (4 000 przebiegów) |
| 2 | Jak czytać wynik — cztery kanały realizacji wartości i dlaczego rachunek portfelowy zmienia rezultat |
| 3 | Protokół pomiarowy: eksperyment równoległy z losowaniem, z rachunkiem mocy statystycznej |
| 4 | Pułapki pomiaru |
| 5 | Ryzyka pozafinansowe: dane klientów, zobowiązania umowne, regulacje, jakość wobec klienta, reakcja zespołu |
| 6 | Checklisty przed pilotażem i na przegląd kwartalny |

## Model

Kroki miesięczne. Dla każdego działu:

```
godziny  = etaty × h_mies × czas_kwalifikowany × oszczędność × (1 − weryfikacja)
           × (1 − dyskonto_nowości) × adopcja × ramp(m)
wartość  = godziny × koszt_h × mnożnik × realizacja
```

**Mnożnik** to wartość odzyskanej godziny względem jej kosztu: 1,0 dla działu
kosztowego, 2,0–2,5 dla osób rozliczanych godzinowo u klienta. **Realizacja**
to część odzyskanych godzin, która faktycznie zamienia się w wartość — parametr,
który w analizie wrażliwości okazuje się dominujący.

Stanowiska liczone są dla osób realnie korzystających (`etaty × adopcja`),
a nie dla całej firmy — dzięki temu kolumna „netto / rok" per dział jest
uczciwym rachunkiem i pokazuje, które działy dopłacają do wdrożenia.

Moduł sprzedażowy jest opcjonalny i raportowany osobno. Kalkulator zawsze
pokazuje **NPV tylko kosztowe** obok NPV łącznego — jeśli wdrożenie broni się
już na samych oszczędnościach, przychód jest bonusem, a nie warunkiem.

Symulacja Monte Carlo losuje **wspólny** mnożnik efektu i realizacji dla całej
firmy oraz mniejsze zaburzenie idiosynkratyczne per dział. Wyniki działów są
skorelowane (to samo narzędzie, ta sama organizacja) — traktowanie ich jako
niezależnych sztucznie zawężałoby rozkład. Generator jest deterministyczny,
więc analiza jest odtwarzalna.

## Różnica wobec narzędzia dla Futur Lab

Przy 50+ osobach **da się przeprowadzić prawdziwy eksperyment z losowaniem**:
wykrycie 20-procentowego efektu wymaga ~240 zadań na ramię, co przy 30 osobach
w grupie oznacza 8 zadań na osobę — wykonalne w 6–8 tygodni. W 10-osobowym
laboratorium było to nieosiągalne i trzeba było sięgnąć po projekt
wewnątrzosobowy. Protokół w module 3 wykorzystuje tę przewagę.

## Ważne zastrzeżenia

- **Wartości domyślne to założenia wstępne, nie pomiary.** Przeznaczone
  do zastąpienia danymi z fazy 0 protokołu pomiarowego.
- **Ceny stanowisk zweryfikuj przed użyciem.** Cenniki się zmieniają,
  rozliczenie roczne jest tańsze, przy większych wdrożeniach obowiązują
  warunki indywidualne.
- Moduł sprzedażowy oczekuje **marży kontrybucyjnej**, nie wartości kontraktu.
  Wpisanie przychodu zawyża wynik kilkukrotnie.
- Model nie wycenia skrócenia cyklu jako opcji — w projektach z twardymi
  terminami (przetargi, okna rynkowe) zaniża wartość.

## Dostępność i zgodność

Palety serii danych zwalidowane pod kątem rozróżnialności przy zaburzeniach
widzenia barw, w obu motywach. Kolor nie jest nigdzie jedynym nośnikiem
informacji — każdy wykres ma legendę, etykiety bezpośrednie i alternatywny
widok tabelaryczny. Kolumna z nazwą działu jest przypięta przy przewijaniu
tabeli. Motyw jasny i ciemny obsługiwane równorzędnie.
