/*
 * portada.js
 * ----------
 * La portada del diario. Dos cosas:
 *
 *   1. La franja de temas. Al tocar uno, se guarda en las preferencias y la
 *      portada se rearma en el acto. La personalización se ve, no se explica.
 *   2. Las noticias, ordenadas: la primera va grande, el resto abajo.
 *
 * No hay contenido escrito acá. Todo sale de content/*.json.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita;
  var doc = global.document;
  var R = null;

  /*
   * Temas que todavía no tienen historias cargadas. Se muestran apagados y sin
   * poder tocarse: dicen hacia dónde va el diario sin prometer algo que hoy
   * devolvería una sección vacía.
   */
  var PROXIMAMENTE = ['Municipio', 'Policiales', 'Cultura'];

  /* ---------------------------------------------------------- franja ---- */

  /** Temas que sí tienen al menos una historia cargada. */
  function temasDisponibles() {
    var vistos = [];
    Canillita.content.all().forEach(function (story) {
      if (vistos.indexOf(story.topic) === -1) vistos.push(story.topic);
    });
    return vistos;
  }

  function pintarTemas() {
    var elegidos = Canillita.preferences.get().topics;
    var etiquetas = Canillita.preferences.TOPIC_LABELS;

    var chips = temasDisponibles().map(function (topic) {
      var activo = elegidos.indexOf(topic) !== -1;
      return '<button type="button" class="chip-tema' + (activo ? ' is-activo' : '') +
        '" data-tema="' + R.esc(topic) + '" aria-pressed="' + activo + '">' +
        (activo ? '✓ ' : '+ ') + R.esc(etiquetas[topic] || topic) +
        '</button>';
    });

    var futuros = PROXIMAMENTE.map(function (nombre) {
      return '<span class="chip-tema chip-tema--pronto">' + R.esc(nombre) + ' · pronto</span>';
    });

    doc.getElementById('temas').innerHTML = chips.concat(futuros).join('');
  }

  /** Un solo escuchador para toda la franja, en vez de uno por botón. */
  function activarTemas() {
    doc.getElementById('temas').addEventListener('click', function (event) {
      var boton = event.target.closest('[data-tema]');
      if (!boton) return;

      var topic = boton.dataset.tema;
      var elegidos = Canillita.preferences.get().topics.slice();
      var i = elegidos.indexOf(topic);

      if (i === -1) elegidos.push(topic);
      else elegidos.splice(i, 1);

      Canillita.preferences.set({ topics: elegidos });
      pintarTemas();
      pintarPortada();

      var etiquetas = Canillita.preferences.TOPIC_LABELS;
      doc.getElementById('temas-aviso').textContent = elegidos.length
        ? 'Tu portada se armó con ' + elegidos.map(function (t) {
            return etiquetas[t] || t;
          }).join(' y ') + '.'
        : 'Sin temas elegidos se muestra todo.';
    });
  }

  /* --------------------------------------------------------- noticias --- */

  function tarjeta(story, principal) {
    var audioId = R.audioIdForStory(story.id);
    var enlace = story.topic === 'ruta22'
      ? 'pages/ruta22.html'
      : 'pages/edicion.html';

    return '<article class="portada-nota' + (principal ? ' portada-nota--principal' : '') + '">' +
      '<p class="nota__eyebrow">' + R.esc(story.category) + '</p>' +
      '<h2 class="portada-nota__titulo"><a href="' + enlace + '">' +
        R.esc(story.title) + '</a></h2>' +
      '<p class="nota__bajada">' + R.esc(story.subtitle) + '</p>' +
      R.fictionBanner(story) +
      (principal
        ? '<p class="portada-nota__entrada">' + R.esc(story.shortSummary) + '</p>'
        : '') +
      '<p class="nota__lectura">' + R.esc(story.readingTime) + ' min · ' +
        'actualizada el ' + R.esc(R.longDate(story.lastUpdated)) + '</p>' +
      R.answerPlayer(audioId, 'Escuchar') +
      '</article>';
  }

  function pintarPortada() {
    var elegidos = Canillita.preferences.get().topics;
    var historias = elegidos.length
      ? Canillita.content.forDailySummary(elegidos)
      : Canillita.content.all();

    if (!historias.length) {
      doc.getElementById('portada').innerHTML =
        '<p class="vacio">No hay historias para los temas elegidos. ' +
        'Sumá alguno arriba.</p>';
      return;
    }

    doc.getElementById('portada').innerHTML = historias.map(function (story, i) {
      return tarjeta(story, i === 0);
    }).join('');

    // Los botones se recrean con cada repintado, así que se reconectan acá
    R.bindAnswerPlayers(doc.getElementById('portada'));
  }

  /* --------------------------------------------------------- boletín ---- */

  function pintarBoletin() {
    var grabado = Canillita.radio.recorded();
    if (!grabado) return;

    doc.getElementById('bloque-boletin').hidden = false;
    doc.getElementById('boletin-meta').textContent =
      Math.round(grabado.duration) + ' segundos · voz ' + grabado.voice;

    var audio = doc.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = grabado.absoluteUrl;
    audio.className = 'boletin-audio';
    doc.getElementById('boletin-player').appendChild(audio);
  }

  /* ------------------------------------------------------------ init ---- */

  function pintarCabecera() {
    doc.getElementById('today-label').textContent = R.todayShort();
    var version = doc.getElementById('version-label');
    if (version && typeof Canillita.versionLabel === 'function') {
      version.textContent = Canillita.versionLabel();
    }
    doc.getElementById('preparada').textContent =
      'Portada del ' + R.todayLabel() + ', a las ' + R.clockLabel() + '.';
  }

  function start() {
    R = Canillita.render;
    Promise.all([
      Canillita.content.load(),
      Canillita.radio.loadRecorded(),
      Canillita.radio.loadAnswers()
    ]).then(function () {
      pintarCabecera();
      pintarTemas();
      activarTemas();
      pintarPortada();
      pintarBoletin();
    }).catch(function (error) {
      doc.getElementById('portada').innerHTML =
        '<p class="error">No pude cargar las noticias. ' +
        Canillita.render.esc(error.message) + '</p>';
    });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
