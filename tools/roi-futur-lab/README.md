# Kalkulator ROI — wdrożenie Claude w Futur Lab

Samodzielne narzędzie (jeden plik HTML) do oceny opłacalności wdrożenia Claude
w laboratorium B+R liczącym 5–15 osób. Łączy model finansowy z protokołem
pomiarowym — bo liczba bez planu pomiaru jest tylko dobrze sformatowanym założeniem.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Bez budowania, bez zależności, bez sieci —
wszystkie obliczenia wykonują się lokalnie i żadne dane nie opuszczają urządzenia.

## Zakres

| Moduł | Zawartość |
|---|---|
| 1 | Interaktywny model finansowy: NPV, okres zwrotu, progi opłacalności, analiza wrażliwości, symulacja Monte Carlo (4 000 przebiegów) |
| 2 | Jak czytać wynik — cztery kanały realizacji wartości i dlaczego to one przesądzają o ROI |
| 3 | Protokół pomiarowy: stepped-wedge z analizą na poziomie zadania, wraz z rachunkiem mocy statystycznej |
| 4 | Pułapki pomiaru (efekt nowości, samoocena, dobór ochotników, prawo Parkinsona, prawo Goodharta) |
| 5 | Ryzyka pozafinansowe istotne dla B+R: poufność, zobowiązania grantowe, wiarygodność naukowa, rozwój juniorów |
| 6 | Checklisty przed startem i na przegląd kwartalny |

## Model

Kroki miesięczne, cztery strumienie wartości (literatura, kod i dane,
dokumentacja i granty, projektowanie eksperymentów). Dla każdego strumienia:
udział w czasie pracy × surowa oszczędność × (1 − narzut weryfikacji).
Wynik jest następnie dyskontowany o efekt nowości, skalowany krzywą adopcji
i mnożony przez **współczynnik realizacji wartości** — parametr, który
w analizie wrażliwości okazuje się dominujący.

Symulacja Monte Carlo losuje parametry efektu z rozkładów trójkątnych.
Generator jest deterministyczny (ziarno stałe), więc wynik da się odtworzyć.

## Ważne zastrzeżenia

- **Wartości domyślne to założenia wstępne, nie pomiary.** Są przeznaczone
  do zastąpienia danymi z fazy 0 protokołu pomiarowego.
- **Ceny stanowisk zweryfikuj przed użyciem.** Cenniki się zmieniają,
  rozliczenie roczne jest tańsze od miesięcznego, a dla większych wdrożeń
  obowiązują warunki indywidualne.
- Model nie wycenia skrócenia cyklu jako opcji — w projektach z twardymi
  terminami (nabory grantowe, okna rynkowe) zaniża wartość.

## Dostępność i zgodność

Palety serii danych zwalidowane pod kątem rozróżnialności przy zaburzeniach
widzenia barw, w obu motywach. Kolor nie jest nigdzie jedynym nośnikiem
informacji — każdy wykres ma legendę, etykiety bezpośrednie i alternatywny
widok tabelaryczny. Motyw jasny i ciemny obsługiwane równorzędnie.
