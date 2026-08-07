#!/usr/bin/env node
/*
 * bump-version.js
 * ---------------
 * Sube el número de versión en js/version.js y agrega la entrada nueva arriba
 * de todo en CHANGELOG.md, lista para completar.
 *
 * Uso:
 *   node tools/bump-version.js            → 1.6.0 a 1.6.1  (ajuste menor)
 *   node tools/bump-version.js minor      → 1.6.1 a 1.7.0  (algo nuevo)
 *   node tools/bump-version.js major      → 1.7.0 a 2.0.0  (cambio de fondo)
 *
 * No hace commit: deja los archivos listos para revisar antes de subir.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const VERSION_JS = path.join(RAIZ, 'js', 'version.js');
const CHANGELOG = path.join(RAIZ, 'CHANGELOG.md');

const tipo = (process.argv[2] || 'patch').toLowerCase();
if (['patch', 'minor', 'major'].indexOf(tipo) === -1) {
  console.error('Tipo inválido. Usá: patch, minor o major.');
  process.exit(1);
}

/* -------------------------------------------------------- nueva versión */

const fuente = fs.readFileSync(VERSION_JS, 'utf8');
const actual = /Canillita\.version = '([\d.]+)'/.exec(fuente);
if (!actual) {
  console.error('No encontré la versión en js/version.js');
  process.exit(1);
}

const [mayor, menor, parche] = actual[1].split('.').map(Number);
const siguiente =
  tipo === 'major' ? [mayor + 1, 0, 0] :
  tipo === 'minor' ? [mayor, menor + 1, 0] :
                     [mayor, menor, parche + 1];
const nueva = siguiente.join('.');

fs.writeFileSync(
  VERSION_JS,
  fuente.replace(actual[0], "Canillita.version = '" + nueva + "'"),
  'utf8'
);

/* ------------------------------------------------------------ changelog */

const hoy = new Date();
const fecha = [
  String(hoy.getDate()).padStart(2, '0'),
  String(hoy.getMonth() + 1).padStart(2, '0'),
  hoy.getFullYear()
].join('-');

const entrada = [
  '## v' + nueva + ' · ' + fecha,
  '',
  '- (describir el cambio)',
  '',
  '---',
  ''
].join('\n');

const changelog = fs.readFileSync(CHANGELOG, 'utf8');
const marca = '---\n\n## v';
const corte = changelog.indexOf(marca);

fs.writeFileSync(
  CHANGELOG,
  corte === -1
    ? changelog + '\n' + entrada
    : changelog.slice(0, corte + 4) + entrada + changelog.slice(corte + 4),
  'utf8'
);

console.log('Versión ' + actual[1] + ' → ' + nueva);
console.log('Entrada agregada en CHANGELOG.md: completá qué cambió.');
