# Rolka 1: „Inżynier Kontraktu jest sexy”, materiały robocze

Stan na 2026-10-13. Folder służy do przekazania pracy do nowej sesji z dostępem do API HeyGen.

## Ustalenia
- Zgoda osoby z wizerunku: jest. Obejmuje też przetwarzanie przez HeyGen (dostawca spoza EOG), według deklaracji zamawiającego.
- Głos zatwierdzony: **Pola**, ElevenLabs `voice_id` `lqJpYZ185uAhVny7fXot`, model `eleven_v4`.
  Projekt w ElevenLabs: https://elevenlabs.io/app/flows/zL8Quc6BPbxA3md1Drsb
- Format: 9:16, 1080×1920. Napisy wtopione, plansze z liczbami, logo i plansza końcowa.
- Awatar HeyGen: najnowszy model animacji zdjęcia dostępny w API na planie użytkownika (do sprawdzenia w dokumentacji).

## Pliki
| Plik | Opis |
|---|---|
| `2026-10-13_portret_v2.png` | portret źródłowy 900×1200 (z `portret_zrodlo_v2.webp`); wejście do HeyGen |
| `portret_zrodlo.jpg` | pierwsze, słabsze zdjęcie 500×500 (nieużywane) |
| `2026-10-13_kadr_9x16_v3.png` | kadr 9:16 z dorobionym tłem u góry i usuniętym białym rogiem |
| `2026-10-13_rolka1_lektor_v2_pola.mp3` | **zatwierdzony lektor**, 68,6 s |
| `2026-10-13_rolka1_lektor_v1.mp3` | wariant z głosem Weronika (odrzucony) |
| `2026-10-13_rolka1_napisy_v2_pola.ass` | napisy, plansze z liczbami i plansza końcowa, zgrane z lektorem Poli |
| `2026-10-13_rolka1_scenariusz_v1.json` | frazy: tekst napisu, tekst mówiony, pauzy, plansze |
| `napisy_z_pauz.py` | generuje napisy z pauz w nagraniu (21 fragmentów = 21 zdań) |
| `szablon_stylow.ass` | style napisów i plansz (nagłówek ASS) |
| `montaz.sh` | montaż z nieruchomego kadru: zoom + napisy + dźwięk (wersja bez lip-sync) |
| `tts_i_napisy.py` | alternatywa: lektor przez API ElevenLabs z wyrównaniem znaków |

## Następne kroki
1. HeyGen API (`HEYGEN_API_KEY`, domeny `api.heygen.com`, `upload.heygen.com`): utworzyć awatar ze zdjęcia z `2026-10-13_portret_v2.png`, wideo 9:16 sterowane nagraniem `2026-10-13_rolka1_lektor_v2_pola.mp3`, bez napisów.
2. Nałożyć `2026-10-13_rolka1_napisy_v2_pola.ass` na wideo z HeyGen. Plansze stoją nad głową, więc trzeba sprawdzić kadrowanie z HeyGen i ewentualnie przesunąć style `Plansza` i `Podpis`.
3. Logotypy (Uczelnia Łazarskiego, SIDiR, Polski Klaster Budowlany): czekamy na pliki od zamawiającego.
4. Do weryfikacji przed publikacją: 58 mld zł (2023), 103 mld zł (projekt budżetu 2027), +29% r/r w sierpniu, „najmocniej od 2019”, ~500 firm w PKB.
5. Wynik zapisać jako `2026-10-13_rolka1_v4.mp4` (nie nadpisywać wcześniejszych wersji).
