#!/bin/zsh
# Un paso del demo: lo corre, lo cronometra y lo publica en la consola.
# uso: paso.sh "Título" GET  /sandboxes
#      paso.sh "Título" POST /sandboxes '{"template":"ubuntu"}'
D=${0:a:h}
export EASYBITS_API_KEY=$(grep -m1 '^EASYBITS_API_KEY=' ~/nanoclaw/.env | cut -d= -f2- | tr -d '"'\''')
titulo=$1; metodo=$2; ruta=$3; body=$4
base="https://www.easybits.cloud/api/v2"
ini=$(python3 -c 'import time;print(time.time())')

# Lo que se ejecuta y lo que se muestra son lo mismo, salvo la llave.
if [[ -n $body ]]; then
  mostrar="curl -X $metodo $base$ruta \\
  -H \"Authorization: Bearer \$EASYBITS_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '$body'"
  salida=$(curl -s -X $metodo "$base$ruta" \
    -H "Authorization: Bearer $EASYBITS_API_KEY" \
    -H "Content-Type: application/json" -d "$body" 2>&1)
else
  mostrar="curl $base$ruta \\
  -H \"Authorization: Bearer \$EASYBITS_API_KEY\""
  salida=$(curl -s -X $metodo "$base$ruta" -H "Authorization: Bearer $EASYBITS_API_KEY" 2>&1)
fi

fin=$(python3 -c 'import time;print(time.time())')
python3 - "$titulo" "$mostrar" "$salida" "$ini" "$fin" "$D/runs.json" <<'PY'
import json,sys
titulo,cmd,salida,ini,fin,ruta = sys.argv[1:7]
d = json.load(open(ruta))
d["runs"].append({"paso":titulo,"cmd":cmd,"out":salida[:1500],
                  "ms":round(float(fin)-float(ini),2),
                  "estado":"err" if '"error"' in salida else "ok"})
json.dump(d,open(ruta,"w"),ensure_ascii=False,indent=1)
PY
echo "$salida"
