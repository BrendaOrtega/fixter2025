#!/usr/bin/env python3
"""Servidor del demo: sirve la consola y acepta un turno del agente.

Es local y sin autenticación a propósito — vive sólo mientras dura el webinar.
La llave nunca llega al navegador: se lee aquí, del .env.
"""
import http.server, json, os, subprocess, threading, time, urllib.request, pathlib

D = pathlib.Path(__file__).parent
BASE = "https://www.easybits.cloud/api/v2"

def llave():
    for l in open(os.path.expanduser("~/nanoclaw/.env")):
        if l.startswith("EASYBITS_API_KEY="):
            return l.split("=", 1)[1].strip().strip('"\'')

def exec_en_caja(sb, comando, timeout=300000):
    cuerpo = json.dumps({"command": comando, "timeoutMs": timeout}).encode()
    req = urllib.request.Request(f"{BASE}/sandboxes/{sb}/exec", data=cuerpo, headers={
        "Authorization": f"Bearer {llave()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=320) as r:
        return json.load(r)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(D), **k)
    def log_message(self, *a): pass

    def do_GET(self):
        # La bitácora vive en otro origen (la caja) y el navegador la bloquea por
        # CORS. Se pide desde aquí y se sirve como propia.
        if self.path.startswith("/log"):
            cfg = json.load(open(D / "runs.json"))
            try:
                with urllib.request.urlopen(cfg["logUrl"] + "?" + str(time.time()), timeout=8) as r:
                    cuerpo = r.read()
            except Exception as e:
                cuerpo = f"(sin bitácora todavía: {e})".encode()
            self.send_response(200)
            self.send_header("content-type", "text/plain; charset=utf-8")
            self.send_header("cache-control", "no-store")
            self.end_headers(); self.wfile.write(cuerpo); return
        return super().do_GET()

    def do_POST(self):
        if self.path != "/turno": return self.send_error(404)
        n = int(self.headers.get("content-length", 0))
        peticion = json.loads(self.rfile.read(n) or b"{}").get("prompt", "").strip()
        cfg = json.load(open(D / "runs.json"))
        sb = cfg.get("sandboxId")
        if not peticion or not sb: return self.send_error(400)
        # El turno corre en segundo plano: la respuesta es inmediata y el avance
        # se ve en la bitácora, que ya se lee sola cada segundo.
        threading.Thread(target=exec_en_caja, args=(sb, f'/root/agente.sh {json.dumps(peticion, ensure_ascii=False)}'),
                         daemon=True).start()
        self.send_response(202); self.send_header("content-type", "application/json")
        self.end_headers(); self.wfile.write(b'{"ok":true}')

http.server.ThreadingHTTPServer(("127.0.0.1", 8777), H).serve_forever()
