#!/usr/bin/env bash
#
# tts-boletin.sh
# --------------
# Convierte build/plan.json en un boletín de audio publicable.
#
#   1. Piper dice cada frase por separado (un WAV por frase).
#   2. ffmpeg ajusta la velocidad de cada frase y arma los silencios.
#   3. Se concatena todo y se exporta a MP3 y a OGG/Opus.
#   4. Se escribe assets/audio/boletin.json con las marcas de tiempo, para que
#      la página pueda resaltar el bloque que se está escuchando.
#
# Por qué la velocidad y los silencios se hacen con ffmpeg y no con Piper:
# los flags de Piper cambiaron entre versiones, ffmpeg no. Menos cosas que se
# rompan solas dentro de seis meses.
#
# Requisitos: piper (pip install piper-tts), ffmpeg, jq, python3.
#
# Uso:
#   tools/tts-boletin.sh [voz]
#   tools/tts-boletin.sh es_AR-daniela-high

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

VOZ="${1:-es_AR-daniela-high}"
PLAN="build/plan.json"
TRABAJO="build/audio"
SALIDA="assets/audio"
VOCES="build/voices"

if [ ! -f "$PLAN" ]; then
  echo "No existe $PLAN. Corré primero: node tools/build-boletin.js" >&2
  exit 1
fi

for programa in piper ffmpeg ffprobe jq python3; do
  command -v "$programa" >/dev/null 2>&1 || { echo "Falta $programa" >&2; exit 1; }
done

rm -rf "$TRABAJO"
mkdir -p "$TRABAJO" "$SALIDA" "$VOCES"

# ---------------------------------------------------------------- la voz ---
# Piper descarga la voz sola la primera vez. Si el descargador no está
# disponible en esta versión, se baja el modelo directamente.
if [ ! -f "$VOCES/$VOZ.onnx" ]; then
  echo "Descargando la voz $VOZ…"
  if ! python3 -m piper.download_voices "$VOZ" --data-dir "$VOCES" 2>/dev/null; then
    IDIOMA="${VOZ%%-*}"                 # es_AR
    FAMILIA="${IDIOMA%%_*}"             # es
    NOMBRE="${VOZ#*-}"; NOMBRE="${NOMBRE%-*}"   # daniela
    CALIDAD="${VOZ##*-}"                # high
    BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/$FAMILIA/$IDIOMA/$NOMBRE/$CALIDAD/$VOZ"
    echo "  (usando la descarga directa desde Hugging Face)"
    curl -fL --retry 3 -o "$VOCES/$VOZ.onnx" "$BASE.onnx"
    curl -fL --retry 3 -o "$VOCES/$VOZ.onnx.json" "$BASE.onnx.json"
  fi
fi

MODELO="$VOCES/$VOZ.onnx"
[ -f "$MODELO" ] || { echo "No se pudo obtener la voz $VOZ" >&2; exit 1; }

# --------------------------------------------------------- síntesis ---------
TOTAL=$(jq '.pieces | length' "$PLAN")
echo "Sintetizando $TOTAL frases con $VOZ…"

LISTA="$TRABAJO/lista.txt"
MARCAS="$TRABAJO/marcas.jsonl"
: > "$LISTA"
: > "$MARCAS"

for (( i=0; i<TOTAL; i++ )); do
  TEXTO=$(jq -r ".pieces[$i].text" "$PLAN")
  RATE=$(jq -r ".pieces[$i].rate" "$PLAN")
  PAUSA=$(jq -r ".pieces[$i].pauseMs" "$PLAN")
  SEGMENTO=$(jq -r ".pieces[$i].segment" "$PLAN")

  CRUDO="$TRABAJO/crudo_$i.wav"
  FINAL="$TRABAJO/frase_$i.wav"

  printf '%s' "$TEXTO" | piper --model "$MODELO" --output_file "$CRUDO" >/dev/null 2>&1

  # atempo cambia la velocidad sin alterar el tono (rango válido: 0.5 a 2.0)
  ffmpeg -y -loglevel error -i "$CRUDO" \
    -filter:a "atempo=$RATE" -ar 22050 -ac 1 "$FINAL"

  DURACION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
  echo "file '$(basename "$FINAL")'" >> "$LISTA"
  echo "{\"segment\":$SEGMENTO,\"duration\":$DURACION,\"pause\":$PAUSA}" >> "$MARCAS"

  # El silencio entre frases se agrega como un archivo más
  if [ "$PAUSA" -gt 0 ]; then
    SILENCIO="$TRABAJO/silencio_$i.wav"
    SEGUNDOS=$(python3 -c "print($PAUSA/1000)")
    ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=22050:cl=mono \
      -t "$SEGUNDOS" "$SILENCIO"
    echo "file '$(basename "$SILENCIO")'" >> "$LISTA"
  fi

  printf '.'
done
echo

# --------------------------------------------------------- ensamblado -------
echo "Ensamblando el boletín…"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$LISTA" -c copy "$TRABAJO/completo.wav"

# MP3 para la web; OGG/Opus porque es el formato de las notas de voz
ffmpeg -y -loglevel error -i "$TRABAJO/completo.wav" -codec:a libmp3lame -b:a 96k "$SALIDA/boletin.mp3"
ffmpeg -y -loglevel error -i "$TRABAJO/completo.wav" -codec:a libopus -b:a 32k "$SALIDA/boletin.ogg"

DURACION_TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SALIDA/boletin.mp3")

# ------------------------------------------------------------ metadatos -----
python3 - "$PLAN" "$MARCAS" "$SALIDA/boletin.json" "$VOZ" "$DURACION_TOTAL" <<'PYTHON'
import json, sys

plan_path, marcas_path, salida_path, voz, duracion = sys.argv[1:6]

with open(plan_path, encoding='utf-8') as f:
    plan = json.load(f)

# Marca de tiempo donde empieza cada bloque del guion, para resaltarlo
marcas = []
tiempo = 0.0
visto = set()
with open(marcas_path, encoding='utf-8') as f:
    for linea in f:
        dato = json.loads(linea)
        if dato['segment'] not in visto:
            visto.add(dato['segment'])
            marcas.append({'segment': dato['segment'], 'start': round(tiempo, 3)})
        tiempo += float(dato['duration']) + dato['pause'] / 1000

with open(salida_path, 'w', encoding='utf-8') as f:
    json.dump({
        'url': 'assets/audio/boletin.mp3',
        'urlOpus': 'assets/audio/boletin.ogg',
        'voice': voz,
        'engine': 'Piper TTS',
        'version': plan.get('version'),
        'generatedAt': plan['generatedAt'],
        'baseRate': plan['baseRate'],
        'duration': round(float(duracion), 2),
        'segments': plan['segments'],
        'marks': marcas
    }, f, ensure_ascii=False, indent=2)

print(f"Boletín listo: {round(float(duracion))} segundos, {len(marcas)} bloques marcados")
PYTHON

rm -rf "$TRABAJO"
echo "Archivos en $SALIDA/: boletin.mp3, boletin.ogg, boletin.json"
