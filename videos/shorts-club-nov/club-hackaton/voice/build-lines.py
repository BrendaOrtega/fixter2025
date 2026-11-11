# Arma voice/lines.json: tiempos de palabra medidos (Parakeet sobre cada clip) + el texto que va en pantalla.
# SHOWN es el literal de pantalla (números en cifra, como se dicen). GROUP: cuántas palabras oídas cubre cada mostrada.
# b2: Parakeet funde «jueves doce» en una sola palabra (whisper large-v3 sí oye el «12»): se parte a la mitad.
import json, subprocess
SHOWN = {
 "b1": "¿Quieres ver cómo cinco personas arman su propio agente de IA en tres horas, en vivo?",
 "b2": "Es el micro-hackatón de Ghosty Studio: el jueves 12 de noviembre, de 7 a 10 de la noche.",
 "b3": "Se transmite desde la sala del Club de Agentes de IA, donde cada semana construimos agentes en vivo.",
 "b4": "Adentro tienes el muro, los cursos incluidos y todas las llamadas grabadas.",
 "b5": "Cuesta 99 pesos al mes, y si ya eres estudiante de FixterGeek tienes tres meses gratis.",
 "b6": "Entra al Club de Agentes en fixtergeek.com. Míralo este jueves 12 a las 7 de la noche.",
}
GROUP = {"b2": [1, 1, 2] + [1] * 15, "b5": [1, 3] + [1] * 9 + [2] + [1] * 4}
out = []
for scene, text in SHOWN.items():
    shown = text.split(" ")
    if scene == "b6":
        # el CTA son dos oraciones sintetizadas aparte (b6a + 0.25 s de silencio + b6b) para que «punto com» no se pegue
        a = json.load(open("voice/tr-b6a/transcript.json")); b = json.load(open("voice/tr-b6b/transcript.json"))
        off = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "voice/b6a.wav"], capture_output=True, text=True).stdout) + 0.25
        ws = a + [{**w, "start": round(w["start"] + off, 3), "end": round(w["end"] + off, 3)} for w in b]
    else:
        ws = json.load(open(f"voice/tr-{scene}/transcript.json"))
    if scene == "b2":
        i = [w["text"] for w in ws].index("jueves"); j = ws[i]; m = round((j["start"] + j["end"]) / 2 - 0.04, 3)
        ws = ws[:i] + [{"text": "jueves", "start": j["start"], "end": m}, {"text": "doce", "start": m, "end": j["end"]}] + ws[i + 1:]
    g = GROUP.get(scene, [1] * len(shown))
    assert len(g) == len(shown) and sum(g) == len(ws), (scene, len(shown), len(g), sum(g), len(ws))
    words, i = [], 0
    for s, n in zip(shown, g):
        words.append({"w": s, "s": ws[i]["start"], "e": ws[i + n - 1]["end"]}); i += n
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"voice/{scene}.wav"], capture_output=True, text=True).stdout)
    out.append({"scene": scene, "file": f"voice/{scene}.wav", "dur": round(dur, 3), "heard": " ".join(w["text"] for w in ws), "words": words})
json.dump(out, open("voice/lines.json", "w"), ensure_ascii=False, indent=1)
print("ok", [(l["scene"], l["dur"], l["words"][-1]["e"]) for l in out])
