#!/usr/bin/env node
/*
 * build-respuestas.js
 * -------------------
 * El motor conversacional es de reglas, así que el conjunto de respuestas
 * posibles es FINITO. Este script las enumera todas y arma el plan para que
 * Piper las diga, una por una.
 *
 * Resultado: cada respuesta del chat se puede escuchar, no solo leer.
 *
 * Usa los mismos módulos que el navegador (responses.js, intents.js,
 * content.js). Si mañana se agrega una intención nueva, aparece acá sola.
 *
 * Uso:
 *   node tools/build-respuestas.js [--out build/respuestas.json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf('--' + nombre);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const SALIDA = arg('out', 'build/respuestas.json');

/* ------------------------------------------------ entorno para los módulos */

globalThis.Canillita = {};

require(path.join(RAIZ, 'js', 'version.js'));
require(path.join(RAIZ, 'js', 'router.js'));
require(path.join(RAIZ, 'js', 'content.js'));
require(path.join(RAIZ, 'js', 'preferences.js'));
require(path.join(RAIZ, 'js', 'render.js'));
require(path.join(RAIZ, 'js', 'radio.js'));
require(path.join(RAIZ, 'js', 'intents.js'));
require(path.join(RAIZ, 'js', 'responses.js'));

const Canillita = globalThis.Canillita;

Canillita.content.hydrate([
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'ruta22-actualidad.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'ruta22-historia.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'deportes.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'messi.json'), 'utf8'))
]);

/* ------------------------------------------------------ qué se va a decir */

/*
 * Cada entrada es una pregunta tal como la escribiría un lector. Se pasa por
 * el mismo detector de intenciones que usa el chat, así que si la frase no
 * matchea, el error salta acá y no en producción.
 *
 * Quedan afuera a propósito: el menú, el saludo, las preferencias y el
 * boletín (que ya tiene su propio audio). Solo se graba lo informativo.
 */
const PREGUNTAS = [
  { id: 'ruta22-actualidad',   pregunta: 'Ruta 22 hoy' },
  { id: 'ruta22-historia',     pregunta: 'Ver la historia de la Ruta 22' },
  { id: 'ruta22-por-que',      pregunta: '¿Por qué se frenó la Ruta 22?' },
  { id: 'ruta22-tramos',       pregunta: '¿Qué tramo está terminado?' },
  { id: 'ruta22-roca',         pregunta: '¿Qué pasó en General Roca?' },
  { id: 'ruta22-traspaso',     pregunta: '¿Río Negro ya se hizo cargo?' },
  { id: 'ruta22-neutralizados', pregunta: '¿Qué son los contratos neutralizados?' },
  { id: 'ruta22-peaje',        pregunta: '¿Va a haber peaje?' },
  { id: 'seccion1',            pregunta: 'Sección 1' },
  { id: 'seccion2',            pregunta: 'Sección 2' },
  { id: 'seccion3',            pregunta: 'Sección 3' },
  { id: 'seccion4',            pregunta: 'Sección 4' },
  { id: 'seccion5',            pregunta: 'Sección 5' },
  { id: 'tramo6',              pregunta: '¿Qué pasa en Cipolletti?' },
  { id: 'deportes',            pregunta: 'Ver deportes' },
  { id: 'deportes-proximo',    pregunta: '¿Cuándo juega Deportivo Roca?' },
  { id: 'messi',               pregunta: 'Contame el hilo de Messi' },
  { id: 'messi-final',         pregunta: '¿Cómo salió la final del Mundial 2026?' },
  { id: 'messi-retiro',        pregunta: '¿Messi se retira de la Selección?' },
  { id: 'fuera-de-alcance',    pregunta: '¿Qué pasa con el dólar?' }
];

/* ---------------------------------------------------------- limpieza ---- */

/**
 * El texto del chat tiene emojis, asteriscos de negrita y guiones bajos de
 * cursiva. Nada de eso se dice en voz alta.
 */
const ORDINALES = ['', 'Primero.', 'Segundo.', 'Tercero.', 'Cuarto.', 'Quinto.'];

function limpiar(texto) {
  const sinAdornos = String(texto)
    // Los números en círculo (1️⃣) son enumeraciones: se dicen como tales
    .replace(/([1-5])\u{FE0F}?\u{20E3}/gu, (m, n) => ORDINALES[Number(n)])
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/[*_]/g, '')
    .replace(/^\s*[•·]\s*/gm, '');

  /*
   * En pantalla, el salto de línea hace de separador visual. En voz alta no
   * existe: sin un punto, la frase se encadena con la siguiente y se pierde
   * la estructura. Cada línea termina en punto si no traía puntuación.
   */
  return sinAdornos
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => (/[.!?:;,]$/.test(linea) ? linea : linea + '.'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .trim();
}

/* ------------------------------------------------------------- el plan -- */

const radio = Canillita.radio;
const respuestas = [];
const problemas = [];

PREGUNTAS.forEach((entrada) => {
  const deteccion = Canillita.intents.detect(entrada.pregunta);
  if (deteccion.intent === 'unknown' && entrada.id !== 'fuera-de-alcance') {
    problemas.push(`"${entrada.pregunta}" no matchea ninguna intención`);
    return;
  }

  const respuesta = Canillita.responses.respondTo(entrada.pregunta);

  // El texto hablado junta todos los mensajes de la respuesta
  const crudo = respuesta.messages.map((m) => m.text).join(' ');
  const texto = limpiar(crudo);

  respuestas.push({
    id: entrada.id,
    question: entrada.pregunta,
    intent: deteccion.intent === 'route22_section'
      ? 'route22_section:' + deteccion.section.id
      : deteccion.intent,
    text: texto,
    // toSpeech resuelve números, decretos y abreviaturas
    speech: radio.toSpeech(texto),
    words: texto.split(/\s+/).length
  });
});

if (problemas.length) {
  console.error('Preguntas sin intención:');
  problemas.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

const plan = {
  version: Canillita.version,
  generatedAt: new Date().toISOString(),
  count: respuestas.length,
  answers: respuestas
};

const destino = path.join(RAIZ, SALIDA);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(plan, null, 2), 'utf8');

const palabras = respuestas.reduce((suma, r) => suma + r.words, 0);
console.log('Plan de respuestas escrito en ' + SALIDA);
console.log('  ' + respuestas.length + ' respuestas, ' + palabras + ' palabras');
console.log('  unos ' + Math.round(palabras / 2.5) + ' segundos de audio en total');
