/*
 * ruta22.js
 * ---------
 * Historia viva de la Ruta 22: junta las dos notas del tema en una sola página
 * navegable, separando siempre lo confirmado de lo que está en discusión.
 *
 * La actualidad (qué cambió) y la historia (por qué sigue incompleta) son dos
 * JSON distintos; acá se muestran como una sola historia que sigue abierta.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita;
  var doc = global.document;
  var R = null;

  var actualidad = null;
  var historia = null;

  /* ------------------------------------------------------------ cabecera */

  function paintHeader() {
    doc.getElementById('bajada').textContent = actualidad.subtitle;
    doc.getElementById('meta').textContent =
      'Última actualización: ' + R.longDate(actualidad.lastUpdated) +
      ' · ' + historia.readingTime + ' min de lectura';
    doc.getElementById('acciones').innerHTML =
      R.followButton('ruta22_historia') +
      '<a class="btn btn--ghost" href="edicion.html">Ver mi edición ›</a>';
    doc.getElementById('actualizada').textContent =
      'Página actualizada el ' + R.longDate(actualidad.lastUpdated) + '.';
  }

  /* ---------------------------------------------------------- actualidad */

  function paintActualidad() {
    doc.getElementById('actualidad').innerHTML =
      '<p class="destacado">' + R.esc(actualidad.shortSummary) + '</p>' +
      '<div class="article">' + R.articleBody(actualidad.articleBody) + '</div>' +
      '<div class="importa"><h3>Por qué importa acá</h3><p>' +
        R.esc(actualidad.whyItMatters) + '</p></div>';
  }

  /* -------------------------------------------------------------- tramos */

  function paintTramos() {
    doc.getElementById('tramos-lista').innerHTML =
      R.sections(historia.sections, true);
  }

  /* ------------------------------------------------------------ historia */

  function paintHistoria() {
    doc.getElementById('cuerpo').innerHTML = R.articleBody(historia.articleBody);
  }

  /* ---------------------------------------------------------- cronología */

  /** Une los hitos de las dos notas en una sola línea de tiempo ordenada. */
  function paintCronologia() {
    var merged = {
      timeline: historia.timeline.concat(actualidad.timeline).sort(function (a, b) {
        return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
      }),
      sources: historia.sources.concat(actualidad.sources)
    };
    doc.getElementById('cronologia-lista').innerHTML = R.timeline(merged);
  }

  /* --------------------------------------------------- qué sabemos / falta */

  function paintSaber() {
    doc.getElementById('saber-cols').innerHTML =
      '<div class="saber__col">' +
        '<h3>Qué sabemos</h3>' + R.confirmedFacts(actualidad) +
      '</div>' +
      '<div class="saber__col">' +
        '<h3>Qué todavía falta definir</h3>' + R.pendingQuestions(actualidad) +
      '</div>';
  }

  /* -------------------------------------------------------------- fuentes */

  function paintFuentes() {
    // Las dos notas comparten fuentes: se muestran una sola vez.
    var vistas = {};
    var unicas = [];
    historia.sources.concat(actualidad.sources).forEach(function (source) {
      var clave = source.url || source.name;
      if (vistas[clave]) return;
      vistas[clave] = true;
      unicas.push(source);
    });
    doc.getElementById('fuentes-lista').innerHTML = R.sources({ sources: unicas });
  }

  /* ---------------------------------------------------------- sugerencias */

  function paintSugeridas() {
    var questions = historia.suggestedQuestions.concat(actualidad.suggestedQuestions);
    var vistas = {};
    doc.getElementById('sugeridas').innerHTML = questions.filter(function (question) {
      if (vistas[question]) return false;
      vistas[question] = true;
      return true;
    }).slice(0, 6).map(function (question) {
      return '<a class="sugerida" href="' + R.esc(Canillita.router.chatUrl(question)) + '">' +
        R.esc(question) + '</a>';
    }).join('');
  }

  /* ----------------------------------------------------------------- init */

  function start() {
    R = Canillita.render;
    Canillita.content.load().then(function () {
      actualidad = Canillita.content.get('ruta22_actualidad');
      historia = Canillita.content.get('ruta22_historia');

      paintHeader();
      paintActualidad();
      paintTramos();
      paintHistoria();
      paintCronologia();
      paintSaber();
      paintFuentes();
      paintSugeridas();

      R.bindFollowButtons(doc);
      R.bindAskForm('ask-form', 'ask-input');

      // Si se llegó con un ancla (#seccion3), recién ahora existe el destino.
      if (global.location.hash) {
        var target = doc.getElementById(global.location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
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
