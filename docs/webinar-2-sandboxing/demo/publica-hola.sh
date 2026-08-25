#!/bin/zsh
# Publica hola-mundo.html en una caja que ya tenga nginx. uso: publica-hola.sh <sandboxId>
D=${0:a:h}
KEY=$(grep -m1 '^EASYBITS_API_KEY=' ~/nanoclaw/.env | cut -d= -f2- | tr -d '"'\''')
SB=$1
# El HTML se manda como JSON (no como heredoc suelto) para que las comillas sobrevivan.
python3 -c "
import json;print(json.dumps({'command':'cat > /var/www/html/index.html <<\'EOF\'\n'+open('$D/hola-mundo.html').read()+'\nEOF\necho PUBLICADA'}))" > /tmp/hola-body.json
curl -s -X POST "https://www.easybits.cloud/api/v2/sandboxes/$SB/exec" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d @/tmp/hola-body.json
echo "\nhttps://${SB//_/-}-80.sandboxes.easybits.cloud"
