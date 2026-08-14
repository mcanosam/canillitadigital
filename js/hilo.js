/*
 * hilo.js
 * -------
 * Página de historia viva genérica: sirve para cualquier hilo cargado.
 * Recibe la historia por la URL (?id=messi_hilo) y la dibuja.
 *
 * La Ruta 22 tiene su propia página porque funde dos historias en una sola
 * lectura. Todo lo demás pasa por acá, incluidos los hilos que se sumen
 * después: alcanza con agregarlos a la tabla HILOS de content.js.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita;
  var doc = global.document;
  var R = null;
  var story = null;
  var hiloId = null;

  /* --------------------------------------------------------- navegación */

  /** Las mismas secciones que en la portada, para no perder el hilo. */
  function pintarSecciones() {
    doc.getElementById('secciones').innerHTML = R.seccionesNav(hiloId);
    R.bindConversarConDiario(doc.getElementById('secciones'));

    var cajaPersonas = doc.getElementById('personas');
    if (cajaPersonas && R.personaBar) {
      cajaPersonas.innerHTML = R.personaBar();
      R.bindPersonaBar(cajaPersonas);
    }

  }

  /* ---------------------------------------------------------- cabecera */

  function pintarCabecera() {
    doc.getElementById('titulo').textContent = Canillita.content.hilo(hiloId).label;
    doc.getElementById('bajada').textContent = story.subtitle;
    doc.getElementById('meta').textContent =
      'Última actualización: ' + R.longDate(story.lastUpdated) +
      ' · ' + story.readingTime + ' min de lectura';
    doc.getElementById('acciones').innerHTML =
      R.followButton(hiloId) +
      '<a class="btn btn--ghost" href="edicion.html">Ver mi edición ›</a>';
    doc.getElementById('actualizada').textContent =
      'Página actualizada el ' + R.longDate(story.lastUpdated) + '.';

    var version = doc.getElementById('version-label');
    if (version && typeof Canillita.versionLabel === 'function') {
      version.textContent = Canillita.versionLabel();
    }
  }

  /* ------------------------------------------------------------ cuerpo */

  function pintarActualidad() {
    // El aviso de contenido ficticio va antes que nada
    doc.getElementById('aviso-ficcion').innerHTML = R.fictionBanner(story);

    doc.getElementById('actualidad').innerHTML =
      R.figure(story, 'principal') +
      '<p class="destacado">' + R.esc(story.shortSummary) + '</p>' +
      R.firma(story) +
      R.answerPlayer(R.audioIdForStory(story.id), 'Escuchar el resumen') +
      R.credencialesHilo(story) +
      '<div class="article">' + R.articleBody(story.articleBody) + '</div>' +
      (story.whyItMatters
        ? '<div class="importa"><h3>Por qué importa acá</h3><p>' +
          R.esc(story.whyItMatters) + '</p></div>'
        : '');
  }

  function pintarCronologia() {
    var lista = doc.getElementById('cronologia-lista');
    if (!story.timeline || !story.timeline.length) {
      doc.getElementById('cronologia').hidden = true;
      return;
    }
    lista.innerHTML = R.timeline(story);
  }

  function pintarSaber() {
    var confirmados = R.confirmedFacts(story);
    var pendientes = R.pendingQuestions(story);

    if (!confirmados && !pendientes) {
      doc.getElementById('saber').hidden = true;
      return;
    }

    doc.getElementById('saber-cols').innerHTML =
      (confirmados ? '<div class="saber__col"><h3>Qué sabemos</h3>' + confirmados + '</div>' : '') +
      (pendientes ? '<div class="saber__col"><h3>Qué todavía falta definir</h3>' + pendientes + '</div>' : '');
  }

  function pintarFuentes() {
    doc.getElementById('fuentes-lista').innerHTML = R.sources(story);
  }

  function pintarSugeridas() {
    doc.getElementById('sugeridas').innerHTML =
      (story.suggestedQuestions || []).slice(0, 6).map(function (pregunta) {
        return '<a class="sugerida" href="' + R.esc(Canillita.router.chatUrl(pregunta)) + '">' +
          R.esc(pregunta) + '</a>';
      }).join('');
  }

  /* -------------------------------------------------------------- init */

  function start() {
    R = Canillita.render;

    Promise.all([
      Canillita.content.load(),
      Canillita.radio.loadAnswers()
    ]).then(function () {
      var id = Canillita.router.param('id');
      story = id ? Canillita.content.get(id) : null;

      if (!story) {
        doc.getElementById('actualidad').innerHTML =
          '<p class="error">No encontré esa historia. ' +
          '<a href="../index.html">Volver al inicio</a>.</p>';
        return;
      }

      hiloId = Canillita.content.hiloDe(story.id);
      doc.title = Canillita.content.hilo(hiloId).label + ' · Tu Canillita';

      pintarSecciones();
      pintarCabecera();
      pintarActualidad();
      pintarCronologia();
      pintarSaber();
      pintarFuentes();
      pintarSugeridas();

      R.bindFollowButtons(doc);
      R.bindAnswerPlayers(doc);
      R.bindAskForm('ask-form', 'ask-input');
    }).catch(function (error) {
      doc.getElementById('actualidad').innerHTML =
        '<p class="error">No pude cargar la historia. ' +
        Canillita.render.esc(error.message) + '</p>';
    });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
