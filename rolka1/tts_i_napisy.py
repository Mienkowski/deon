"""Rolka 1: lektor z ElevenLabs (jeden przebieg, by zachować intonację) + napisy ASS z wyrównania znaków.

Użycie:
  ELEVENLABS_API_KEY=... python3 tts_i_napisy.py SCENARIUSZ.json VOICE_ID WYJ_PREFIX
  python3 tts_i_napisy.py SCENARIUSZ.json --tylko-napisy WYJ_PREFIX   (z istniejącego WYJ_PREFIX_alignment.json)
"""
import base64, json, os, sys, urllib.request

MODEL = "eleven_multilingual_v2"  # obsługuje polski i znaczniki <break>


def tekst_dla_tts(frazy):
    czesci = []
    for f in frazy:
        czesci.append(f["mowa"])
        czesci.append(f'<break time="{f["pauza"]:.1f}s" />')
    return " ".join(czesci[:-1])  # bez przerwy na samym końcu (ogon dodamy w montażu)


def generuj(frazy, voice_id, prefix):
    body = json.dumps({
        "text": tekst_dla_tts(frazy),
        "model_id": MODEL,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_192",
        data=body, headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        odp = json.load(r)
    with open(prefix + "_lektor.mp3", "wb") as f:
        f.write(base64.b64decode(odp["audio_base64"]))
    with open(prefix + "_alignment.json", "w") as f:
        json.dump(odp["alignment"], f, ensure_ascii=False)
    return odp["alignment"]


def czas_ass(t):
    cs = int(round(t * 100)); h, cs = divmod(cs, 360000); m, cs = divmod(cs, 6000); s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def zakresy_fraz(frazy, al):
    """Odnajduje każdą 'mowę' w ciągu wyrównanych znaków (niezależnie od tego, czy znaczniki break w nim są)."""
    znaki = "".join(al["characters"]); st, en = al["character_start_times_seconds"], al["character_end_times_seconds"]
    poz, wynik = 0, []
    for f in frazy:
        i = znaki.find(f["mowa"], poz)
        if i < 0:
            raise SystemExit(f"Nie znaleziono frazy w wyrównaniu: {f['mowa']!r}")
        j = i + len(f["mowa"]) - 1
        wynik.append((st[i], en[j])); poz = j + 1
    return wynik


def napisy(frazy, al, prefix):
    zak = zakresy_fraz(frazy, al)
    naglowek = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Napis,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5,2,2,80,80,520,1
Style: Plansza,DejaVu Sans,150,&H00FFFFFF,&H00FFFFFF,&H00202020,&HA0000000,1,0,0,0,100,100,0,0,3,24,0,8,80,80,260,1
Style: Podpis,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H00202020,&HA0000000,0,0,0,0,100,100,0,0,3,14,0,8,80,80,450,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linie = []
    for k, (f, (a, b)) in enumerate(zip(frazy, zak)):
        koniec = min(b + f["pauza"], zak[k + 1][0]) if k + 1 < len(zak) else b + f["pauza"]
        linie.append(f"Dialogue: 0,{czas_ass(a)},{czas_ass(koniec)},Napis,,0,0,0,,{{\\fad(60,60)}}{f['napis']}")
        if "plansza" in f:
            liczba, podpis = f["plansza"].split("|")
            pk = min(a + 3.0, koniec + 1.5)
            linie.append(f"Dialogue: 1,{czas_ass(a)},{czas_ass(pk)},Plansza,,0,0,0,,{{\\fad(150,200)\\t(0,250,\\fscx115\\fscy115)\\t(250,450,\\fscx100\\fscy100)}}{liczba}")
            linie.append(f"Dialogue: 1,{czas_ass(a + 0.15)},{czas_ass(pk)},Podpis,,0,0,0,,{{\\fad(150,200)}}{podpis}")
    with open(prefix + "_napisy.ass", "w", encoding="utf-8") as fh:
        fh.write(naglowek + "\n".join(linie) + "\n")
    return zak[-1][1] + frazy[-1]["pauza"]


if __name__ == "__main__":
    frazy = json.load(open(sys.argv[1], encoding="utf-8"))["frazy"]
    if sys.argv[2] == "--tylko-napisy":
        prefix = sys.argv[3]; al = json.load(open(prefix + "_alignment.json"))
    else:
        prefix = sys.argv[3]; al = generuj(frazy, sys.argv[2], prefix)
    print(f"Długość z ogonem: {napisy(frazy, al, prefix):.1f} s")
