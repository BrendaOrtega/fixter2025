# Genera un atlas con gpt-image-2. Uso: python3 gen.py salida.png [referencia.png]
# La llave se lee de ~/fixter2025/.env sin imprimirla.
import json, os, sys, time, base64, urllib.request, uuid
key = next(l.split("=", 1)[1].strip().strip('"').strip("'") for l in open(os.path.expanduser("~/fixter2025/.env")) if l.startswith("OPENAI_API_KEY="))
out, ref = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
prompt = open("prompt.txt").read()
t = time.time()
if not ref:
    body = {"model": "gpt-image-2", "prompt": prompt, "size": "1536x1024", "quality": os.environ.get("Q", "high"), "background": "transparent", "output_format": "png", "n": 1}
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=json.dumps(body).encode(), headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
else:
    prompt = ("Use the attached sheet ONLY as a rough guide for which objects exist, their silhouettes and colors. "
              "Redraw everything from scratch at a far more polished, beautiful, detailed level, and add every object listed below. ") + prompt
    b = uuid.uuid4().hex
    parts = []
    for k, v in {"model": "gpt-image-2", "prompt": prompt, "size": "1536x1024", "quality": os.environ.get("Q", "high"), "background": "transparent", "output_format": "png"}.items():
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="ref.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(ref, "rb").read() + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=b"".join(parts), headers={"Authorization": "Bearer " + key, "Content-Type": "multipart/form-data; boundary=" + b})
try:
    r = json.load(urllib.request.urlopen(req, timeout=400))
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:600]); sys.exit(1)
open(out, "wb").write(base64.b64decode(r["data"][0]["b64_json"]))
print(out, "ok en", round(time.time() - t), "s · uso:", json.dumps(r.get("usage", {}))[:200])
