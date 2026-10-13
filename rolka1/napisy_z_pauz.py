import json, os, re, subprocess, sys
from tts_i_napisy import czas_ass
audio, scen, wyj = sys.argv[1:4]
fr = json.load(open(scen, encoding="utf-8"))["frazy"]
grupy = [[0,1,2],[3],[4],[5,6,7],[8],[9],[10,11,12],[13],[14,15,16],[17],[18,19,20],[21],[22,23],[24,25],[26,27,28],[29,30],[31,32,33,34],[35,36],[37],[38],[39,40]]
log = subprocess.run(["ffmpeg","-hide_banner","-i",audio,"-af","silencedetect=noise=-38dB:d=0.25","-f","null","-"],capture_output=True,text=True).stderr
s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",audio],capture_output=True,text=True).stdout)
kawalki = list(zip([0.0]+e, s+[dur]))
assert len(kawalki) == len(grupy), (len(kawalki), len(grupy))
zdarzenia = []
for (a, b), g in zip(kawalki, grupy):
    # scal krótkie frazy w linie do ~42 znaków
    linie, cur = [], []
    for i in g:
        if cur and len(" ".join(fr[j]["napis"] for j in cur + [i])) > 42:
            linie.append(cur); cur = []
        cur.append(i)
    linie.append(cur)
    waga = [sum(len(fr[j]["mowa"]) for j in l) for l in linie]
    t = a
    for l, w in zip(linie, waga):
        d = (b - a) * w / sum(waga)
        zdarzenia.append((t, t + d, " ".join(fr[j]["napis"] for j in l), [fr[j].get("plansza") for j in l if fr[j].get("plansza")]))
        t += d
naglowek = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "szablon_stylow.ass"), encoding="utf-8").read().split("[Events]")[0]
out = [naglowek + "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for k, (a, b, txt, pl) in enumerate(zdarzenia):
    koniec = zdarzenia[k+1][0] if k + 1 < len(zdarzenia) and zdarzenia[k+1][0] - b < 0.8 else b + 0.3
    out.append(f"Dialogue: 0,{czas_ass(a)},{czas_ass(koniec)},Napis,,0,0,0,,{{\\fad(60,60)}}{txt}")
    for p in pl:
        liczba, podpis = p.split("|"); pk = max(koniec, a + 2.8)
        out.append(f"Dialogue: 1,{czas_ass(a)},{czas_ass(pk)},Plansza,,0,0,0,,{{\\fad(150,200)\\t(0,250,\\fscx115\\fscy115)\\t(250,450,\\fscx100\\fscy100)}}{liczba}")
        out.append(f"Dialogue: 1,{czas_ass(a+0.15)},{czas_ass(pk)},Podpis,,0,0,0,,{{\\fad(150,200)}}{podpis}")
# plansza końcowa
out.append(f"Dialogue: 2,{czas_ass(dur+0.2)},{czas_ass(dur+2.7)},Plansza,,0,0,0,,{{\\fad(250,0)\\fs96}}Inżynier\\NKontraktu")
out.append(f"Dialogue: 2,{czas_ass(dur+0.4)},{czas_ass(dur+2.7)},Podpis,,0,0,0,,{{\\fad(250,0)\\pos(540,560)}}Uczelnia Łazarskiego")
open(wyj, "w", encoding="utf-8").write("\n".join(out) + "\n")
for z in zdarzenia: print(f"{z[0]:6.2f}-{z[1]:6.2f}  {z[2]}")
