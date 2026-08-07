#!/usr/bin/env bash
#
# tts-respuestas.sh
# -----------------
# Convierte build/respuestas.json en un clip de audio por cada respuesta del
# chat. Como el motor es de reglas, el conjunto es finito: se pueden grabar
# todas de antemano y servirlas como archivos estáticos.
#
# Salida: assets/audio/respuestas/<id>.mp3 y assets/audio/respuestas.json
#
# Requisitos: piper, ffmpeg, ffprobe, jq, python3.
#
# Uso:
#   tools/tts-respuestas.sh [voz]

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

VOZ="${1:-es_AR-daniela-high}"
PLAN="build/respuestas.json"
SALIDA="assets/audio/respuestas"
VOCES="build/voices"
TRABAJO="build/respuestas-tmp"

if [ ! -f "$PLAN" ]; then
  echo "No existe $PLAN. Corré primero: node tools/build-respuestas.js" >&2
  exit 1
fi

for programa in piper ffmpeg ffprobe jq python3; do
  command -v "$programa" >/dev/null 2>&1 || { echo "Falta $programa" >&2; exit 1; }
done

rm -rf "$TRABAJO"
mkdir -p "$TRABAJO" "$SALIDA" "$VOCES"

# La voz suele estar ya descargada por tts-boletin.sh; si no, se baja igual.
if [ ! -f "$VOCES/$VOZ.onnx" ]; then
  echo "Descargando la voz $VOZ…"
  if ! python3 -m piper.download_voices "$VOZ" --data-dir "$VOCES" 2>/dev/null; then
    IDIOMA="${VOZ%%-*}"
    FAMILIA="${IDIOMA%%_*}"
    NOMBRE="${VOZ#*-}"; NOMBRE="${NOMBRE%-*}"
    CALIDAD="${VOZ##*-}"
    BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/$FAMILIA/$IDIOMA/$NOMBRE/$CALIDAD/$VOZ"
    curl -fL --retry 3 -o "$VOCES/$VOZ.onnx" "$BASE.onnx"
    curl -fL --retry 3 -o "$VOCES/$VOZ.onnx.json" "$BASE.onnx.json"
  fi
fi

MODELO="$VOCES/$VOZ.onnx"
[ -f "$MODELO" ] || { echo "No se pudo obtener la voz $VOZ" >&2; exit 1; }

TOTAL=$(jq '.answers | length' "$PLAN")
echo "Generando $TOTAL respuestas con $VOZ…"

DURACIONES="$TRABAJO/duraciones.jsonl"
: > "$DURACIONES"

for (( i=0; i<TOTAL; i++ )); do
  ID=$(jq -r ".answers[$i].id" "$PLAN")
  TEXTO=$(jq -r ".answers[$i].speech" "$PLAN")

  CRUDO="$TRABAJO/$ID.wav"
  printf '%s' "$TEXTO" | piper --model "$MODELO" --output_file "$CRUDO" >/dev/null 2>&1

  # Un respiro al final para que no corte seco
  ffmpeg -y -loglevel error -i "$CRUDO" \
    -af "apad=pad_dur=0.4" -ar 22050 -ac 1 "$TRABAJO/$ID-final.wav"

  ffmpeg -y -loglevel error -i "$TRABAJO/$ID-final.wav" \
    -codec:a libmp3lame -b:a 80k "$SALIDA/$ID.mp3"

  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SALIDA/$ID.mp3")
  echo "{\"id\":\"$ID\",\"duration\":$DUR}" >> "$DURACIONES"

  printf '.'
done
echo

# ------------------------------------------------------------- índice ------
python3 - "$PLAN" "$DURACIONES" "assets/audio/respuestas.json" "$VOZ" <<'PYTHON'
import json, sys

plan_path, duraciones_path, salida_path, voz = sys.argv[1:5]

with open(plan_path, encoding='utf-8') as f:
    plan = json.load(f)

duraciones = {}
with open(duraciones_path, encoding='utf-8') as f:
    for linea in f:
        dato = json.loads(linea)
        duraciones[dato['id']] = round(float(dato['duration']), 2)

indice = {}
for respuesta in plan['answers']:
    if respuesta['id'] not in duraciones:
        continue
    indice[respuesta['id']] = {
        'url': f"assets/audio/respuestas/{respuesta['id']}.mp3",
        'duration': duraciones[respuesta['id']],
        'question': respuesta['question'],
        'intent': respuesta['intent']
    }

with open(salida_path, 'w', encoding='utf-8') as f:
    json.dump({
        'voice': voz,
        'engine': 'Piper TTS',
        'generatedAt': plan['generatedAt'],
        'answers': indice
    }, f, ensure_ascii=False, indent=2)

total = sum(v['duration'] for v in indice.values())
print(f"{len(indice)} respuestas grabadas, {round(total)} segundos en total")
PYTHON

rm -rf "$TRABAJO"
echo "Clips en $SALIDA/"
