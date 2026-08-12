#!/usr/bin/env python3
"""
build-bundle.py
---------------
Genera content/content.bundle.js: una copia embebida de los JSON de contenido.

¿Para qué? Los navegadores bloquean fetch() cuando la página se abre con doble
clic (protocolo file://). Con este bundle, la demo funciona igual sin servidor.
Los JSON siguen siendo la fuente de verdad: el bundle se regenera, no se edita.

Uso, desde la raíz del proyecto:
    python3 tools/build-bundle.py
"""

import json
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CONTENIDO = RAIZ / "content"
SALIDA = CONTENIDO / "content.bundle.js"

ARCHIVOS = [
    "content/ruta22-actualidad.json",
    "content/ruta22-historia.json",
    "content/messi.json",
    "content/deportes.json",
]


def main() -> None:
    bundle = {}
    for ruta_relativa in ARCHIVOS:
        archivo = RAIZ / ruta_relativa
        with archivo.open(encoding="utf-8") as f:
            bundle[ruta_relativa] = json.load(f)

    cuerpo = json.dumps(bundle, ensure_ascii=False, indent=2)
    SALIDA.write_text(
        "/* Generado por tools/build-bundle.py. No editar a mano. */\n"
        "window.CANILLITA_CONTENT_BUNDLE = " + cuerpo + ";\n",
        encoding="utf-8",
    )
    print(f"Bundle escrito en {SALIDA.relative_to(RAIZ)} ({len(ARCHIVOS)} historias)")


if __name__ == "__main__":
    main()
