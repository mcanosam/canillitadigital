/*
 * app.js
 * ------
 * Arranque. Carga el contenido, prepara la cabecera y abre la conversación.
 * Debe cargarse último: depende de content, preferences, intents, responses y chat.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var doc = global.document;

  /**
   * La versión se muestra siempre: sirve para saber qué está publicado.
   * Es informativa, así que si el módulo no cargó no puede tumbar la app.
   */
  function paintVersion() {
    var el = doc.getElementById('version-label');
    if (el && typeof Canillita.versionLabel === 'function') {
      el.textContent = Canillita.versionLabel();
    }
  }

  function paintHeader() {
    paintVersion();

    var nav = doc.getElementById('secciones');
    if (nav && Canillita.render) {
      nav.innerHTML = Canillita.render.seccionesNav('chat');
    }
    var dateEl = doc.getElementById('today-label');
    if (dateEl) {
      dateEl.textContent = Canillita.responses.todayLabel();
    }
    var sourceEl = doc.getElementById('content-source');
    if (sourceEl) {
      sourceEl.textContent = Canillita.content.loadedFrom() === 'fetch'
        ? 'Contenido leído desde /content'
        : 'Contenido leído desde la copia embebida';
    }
  }

  function start() {
    Promise.all([
      Canillita.content.load(),
      Canillita.radio.loadRecorded(),
      Canillita.radio.loadAnswers()
    ])
      .then(function () {
        paintHeader();
        Canillita.chat.init({ opening: Canillita.responses.greeting() });

        // Pregunta traída desde la edición o la historia viva (?q=…)
        // El chat la encola y la responde apenas termina de saludar.
        var question = Canillita.router.param('q');
        if (question) {
          Canillita.chat.send(question);
        }
      })
      .catch(function (error) {
        Canillita.chat.init({});
        Canillita.chat.showError(
          'No pude cargar las noticias.\n\n' + error.message
        );
      });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
