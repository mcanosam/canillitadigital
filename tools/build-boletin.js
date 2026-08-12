#!/usr/bin/env node
/*
 * build-boletin.js
 * ----------------
 * Traduce el guion del boletín a un "plan de audio": la lista de frases que
 * Piper tiene que decir, con su velocidad y el silencio que va después.
 *
 * Reutiliza js/radio.js, el mismo módulo que usa el navegador. Eso garantiza
 * que el audio generado y el guion que se lee en pantalla nunca se separen.
 *
 * Uso:
 *   node tools/build-boletin.js [--seconds 300] [--name ""] [--out build/plan.json]
 *
 * Salida: un JSON con los segmentos ya normalizados para voz.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

/* ---------------------------------------------------------------- opciones */

function arg(nombre, porDefecto) {
  const index = process.argv.indexOf('--' + nombre);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : porDefecto;
}

const OPCIONES = {
  seconds: Number(arg('seconds', 300)),
  name: arg('name', ''),          // vacío: el boletín es para cualquiera
  rate: Number(arg('rate', 1.0)), // Piper ya suena a ritmo natural
  out: arg('out', 'build/plan.json')
};

/* --------------------------------------------- entorno mínimo del navegador */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function leerHistoria(archivo) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', archivo), 'utf8'));
}

const historias = [
  leerHistoria('ruta22-actualidad.json'),
  leerHistoria('ruta22-historia.json'),
  leerHistoria('messi.json'),
  leerHistoria('deportes.json')
];

const porId = {};
historias.forEach((historia) => { porId[historia.id] = historia; });

/*
 * radio.js espera encontrar Canillita.render y Canillita.content.
 * Acá se arma la versión mínima que necesita, sin DOM.
 * La hora sale del reloj del sistema: el workflow corre con TZ argentina.
 */
globalThis.Canillita = {
  render: {
    timeGreeting() {
      const hora = new Date().getHours();
      if (hora < 6) return 'Buenas noches';
      if (hora < 13) return 'Buen día';
      if (hora < 20) return 'Buenas tardes';
      return 'Buenas noches';
    },
    todayLabel() {
      const ahora = new Date();
      return DIAS[ahora.getDay()] + ' ' + ahora.getDate() + ' de ' +
        MESES[ahora.getMonth()] + ' de ' + ahora.getFullYear();
    }
  },
  content: {
    get: (id) => porId[id] || null
  }
};

const radio = require(path.join(RAIZ, 'js', 'radio.js'));
const { version } = require(path.join(RAIZ, 'js', 'version.js'));

/* ------------------------------------------------------------------- plan */

const guion = radio.buildScript(historias, {
  name: OPCIONES.name,
  targetSeconds: OPCIONES.seconds
});

/*
 * Piper habla de a frases. Se parte igual que en el navegador para que las
 * marcas de tiempo coincidan con los bloques del guion en pantalla.
 */
function partirEnFrases(texto) {
  const frases = texto.match(/[^.!?…]+[.!?…]*\s*/g) || [texto];
  const trozos = [];
  let actual = '';
  frases.forEach((frase) => {
    if ((actual + frase).length > 180 && actual) {
      trozos.push(actual.trim());
      actual = frase;
    } else {
      actual += frase;
    }
  });
  if (actual.trim()) trozos.push(actual.trim());
  return trozos;
}

const piezas = [];
guion.segments.forEach((segmento, indice) => {
  const prosodia = radio.prosodiaDe(segmento.kind);
  const trozos = partirEnFrases(segmento.text);
  trozos.forEach((texto, posicion) => {
    const ultimo = posicion === trozos.length - 1;
    piezas.push({
      segment: indice,
      kind: segmento.kind,
      // toSpeech resuelve números, decretos y abreviaturas
      text: radio.toSpeech(texto),
      rate: Number((OPCIONES.rate * prosodia.rate).toFixed(3)),
      pauseMs: ultimo ? prosodia.pause : 140
    });
  });
});

const plan = {
  version: version,
  generatedAt: new Date().toISOString(),
  baseRate: OPCIONES.rate,
  targetSeconds: OPCIONES.seconds,
  estimatedSeconds: guion.seconds,
  words: guion.words,
  trimmed: guion.trimmed,
  // El guion completo, para publicarlo junto al audio
  segments: guion.segments.map((segmento) => ({
    kind: segmento.kind,
    text: segmento.text
  })),
  pieces: piezas
};

const destino = path.join(RAIZ, OPCIONES.out);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(plan, null, 2), 'utf8');

console.log('Plan de audio escrito en ' + OPCIONES.out);
console.log('  ' + plan.segments.length + ' bloques, ' + piezas.length + ' frases');
console.log('  ' + plan.words + ' palabras, unos ' + plan.estimatedSeconds + ' segundos');
