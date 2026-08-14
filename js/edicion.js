/*
 * edicion.js
 * ----------
 * Dibuja la edición personalizada: saludo, historias, boletín y Ruta 22.
 *
 * Todo sale de los JSON y de las preferencias guardadas. Si el lector nunca
 * configuró nada, la página igual funciona con valores neutros.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita;
  var doc = global.document;
  var R = null;   // Canillita.render, se asigna en start()

  /* ------------------------------------------------------------ cabecera */

  function paintHeader() {
    var versionEl = doc.getElementById('version-label');
    if (versionEl && typeof Canillita.versionLabel === 'function') {
      versionEl.textContent = Canillita.versionLabel();
    }

    var nav = doc.getElementById('secciones');
    if (nav) nav.innerHTML = R.seccionesNav('edicion');

    var cajaPersonas = doc.getElementById('personas');
    if (cajaPersonas && R.personaBar) {
      cajaPersonas.innerHTML = R.personaBar();
      R.bindPersonaBar(cajaPersonas);
    }

    var prefs = Canillita.preferences.get();
    var name = prefs.name ? ', ' + prefs.name : '';

    doc.getElementById('saludo').textContent = R.timeGreeting() + name + '.';
    doc.getElementById('edicion-meta').textContent =
      R.todayLabel() + ' · preparada a las ' + R.clockLabel() +
      (prefs.locality ? ' · ' + prefs.locality : '');

    /*
     * Cada tema lleva al hilo correspondiente. Si un tema tiene más de un
     * hilo (deportes son dos), se muestra un enlace por hilo: es más honesto
     * que mandarlos todos al mismo lado.
     */
    var etiquetas = Canillita.preferences.TOPIC_LABELS;
    var enlaces = [];
    prefs.topics.forEach(function (topic) {
      var hilosDelTema = Canillita.content.hilos().filter(function (hilo) {
        return hilo.topic === topic;
      });
      if (!hilosDelTema.length) {
        enlaces.push('<span class="tag tag--vacio">' +
          R.esc(etiquetas[topic] || topic) + '</span>');
        return;
      }
      hilosDelTema.forEach(function (hilo) {
        enlaces.push('<a class="tag" href="' + R.esc(R.hiloUrl(hilo.id)) + '">' +
          R.esc(hilo.label) + '</a>');
      });
    });
    doc.getElementById('intereses').innerHTML = 'Tus temas: ' + enlaces.join('');

    doc.getElementById('preparada').textContent =
      'Edición preparada el ' + R.todayLabel() + ' a las ' + R.clockLabel() + '.';
  }

  /* ------------------------------------------------------------ historias */

  /*
   * El botón de seguir es por hilo, así que solo se muestra en la primera
   * historia de cada uno: la Ruta 22 son dos notas y un solo seguimiento.
   */
  var hilosYaMostrados = [];

  function storyCard(story, index) {
    var isPrincipal = index === 0;
    var hiloId = Canillita.content.hiloDe(story.id);
    var primeraDelHilo = hilosYaMostrados.indexOf(hiloId) === -1;
    if (primeraDelHilo) hilosYaMostrados.push(hiloId);

    return '<article class="nota' + (isPrincipal ? ' nota--principal' : '') + '">' +
      (isPrincipal ? R.figure(story, 'principal') : '') +
      '<p class="nota__eyebrow">' + R.esc(story.category) +
        (isPrincipal ? ' · Noticia principal' : '') + '</p>' +
      '<h2 class="nota__titulo">' + R.esc(story.title) + '</h2>' +
      '<p class="nota__bajada">' + R.esc(story.subtitle) + '</p>' +
      '<p class="nota__lectura">' + R.esc(story.readingTime) + ' min de lectura · ' +
        'actualizada el ' + R.esc(R.longDate(story.lastUpdated)) + '</p>' +
      R.fictionBanner(story) +
      '<p class="nota__resumen">' + R.esc(story.shortSummary) + '</p>' +
      R.answerPlayer(R.audioIdForStory(story.id), 'Escuchar esta noticia') +

      '<div class="nota__acciones">' +
        // Un solo camino a la nota completa: la página del hilo
        '<a class="btn btn--primary" href="' + R.esc(R.hiloUrl(hiloId)) + '">' +
          'Leer la historia completa ›</a>' +
        (primeraDelHilo ? R.followButton(hiloId) : '') +
      '</div>' +
    '</article>';
  }

  /** Bloques "qué sabemos" y "qué falta definir", solo si hay contenido. */
  function saberBlock(story) {
    var confirmed = R.confirmedFacts(story);
    var pending = R.pendingQuestions(story);
    if (!confirmed && !pending) return '';
    return '<div class="saber">' +
      (confirmed ? '<div class="saber__col"><h3>Qué sabemos</h3>' + confirmed + '</div>' : '') +
      (pending ? '<div class="saber__col"><h3>Qué todavía falta definir</h3>' + pending + '</div>' : '') +
      '</div>';
  }

  function paintStories(stories) {
    hilosYaMostrados = [];
    doc.getElementById('historias').innerHTML =
      stories.map(storyCard).join('');
  }

  /* -------------------------------------------------------------- audio */

  var script = null;

  function paintAudio(stories) {
    var settings = Canillita.preferences.get();
    script = Canillita.radio.buildScript(stories, {
      name: settings.name,
      targetSeconds: settings.audioSeconds
    });

    var grabado = Canillita.radio.recorded();
    doc.getElementById('audio-duracion').textContent = grabado
      ? 'Boletín del día · ' + Math.round(grabado.duration) + ' segundos'
      : 'Duración elegida: ' + Canillita.preferences.audioLabel() +
        '. Este boletín dura unos ' + script.seconds + ' segundos.';

    // Si hay archivo grabado, el guion que se muestra es el que se escucha.
    if (grabado && grabado.segments && grabado.segments.length) {
      script = {
        segments: grabado.segments,
        seconds: Math.round(grabado.duration),
        trimmed: false
      };
    }

    doc.getElementById('guion-texto').innerHTML =
      script.segments.map(function (segment, index) {
        return '<p class="guion__linea" data-segment="' + index + '">' +
          R.esc(segment.text) + '</p>';
      }).join('');

    doc.getElementById('guion-aviso').textContent = script.trimmed
      ? 'Recortado para entrar en la duración que elegiste. Cambiala desde el chat, con "configurar".'
      : 'Este es el guion completo, tal como se lee en voz alta.';

    bindVelocidad();
    bindPlayer();
  }

  function bindVelocidad() {
    var contenedor = doc.getElementById('velocidad');
    var actual = Canillita.preferences.get().speechRate;
    Canillita.radio.player.setRate(actual);

    contenedor.innerHTML = Canillita.preferences.RATE_LABELS.map(function (option) {
      var activa = Math.abs(option.value - actual) < 0.01;
      return '<button type="button" class="velocidad__btn' + (activa ? ' is-active' : '') +
        '" data-rate="' + option.value + '" aria-pressed="' + activa + '">' +
        R.esc(option.label) + '</button>';
    }).join('');

    contenedor.addEventListener('click', function (event) {
      var button = event.target.closest('[data-rate]');
      if (!button) return;
      var value = Number(button.dataset.rate);

      Canillita.preferences.set({ speechRate: value });
      Canillita.radio.player.setRate(value);
      // Cambiar la velocidad en pleno boletín cortaría la frase por la mitad.
      Canillita.radio.player.stop();

      Array.prototype.forEach.call(contenedor.querySelectorAll('[data-rate]'), function (other) {
        var activa = other === button;
        other.classList.toggle('is-active', activa);
        other.setAttribute('aria-pressed', activa);
      });
      doc.getElementById('audio-estado').textContent =
        'Velocidad ' + Canillita.preferences.rateLabel().toLowerCase() + '. Tocá escuchar para probarla.';
    });
  }

  function bindPlayer() {
    var play = doc.getElementById('btn-play');
    var stop = doc.getElementById('btn-stop');
    var estado = doc.getElementById('audio-estado');
    var guion = doc.getElementById('guion');

    var grabado = Canillita.radio.recorded();

    if (grabado) {
      // Caso normal: hay boletín generado con Piper.
      estado.textContent = 'Voz ' + grabado.voice + ' · generado el ' +
        R.longDate(grabado.generatedAt) + '.';
      // Si el audio se generó con otra versión, el guion en pantalla y la voz
      // pueden no coincidir: mejor decirlo que disimularlo.
      if (grabado.version && grabado.version !== Canillita.version) {
        estado.textContent += ' Audio de la versión ' + grabado.version + '.';
      }
      var horas = Canillita.radio.recordedAgeHours();
      if (horas !== null && horas > 30) {
        estado.textContent += ' Atención: tiene más de un día.';
      }
    } else if (!Canillita.radio.isSupported()) {
      play.disabled = true;
      estado.textContent = 'Todavía no hay boletín grabado y este navegador no tiene voz. El guion se puede leer igual.';
      return;
    } else {
      estado.textContent = 'Todavía no hay boletín grabado: se va a leer con la voz de este dispositivo.';
      Canillita.radio.onVoicesReady(function (voice) {
        if (voice) {
          estado.textContent = 'Sin boletín grabado. Voz de respaldo: ' + voice.name + '.';
        }
      });
    }

    function marcar(index) {
      var lineas = doc.querySelectorAll('#guion-texto [data-segment]');
      Array.prototype.forEach.call(lineas, function (linea) {
        linea.classList.toggle('is-speaking', Number(linea.dataset.segment) === index);
      });
    }

    var callbacks = {
      onState: function (state) {
        var playing = state === 'playing';
        play.textContent = playing ? '❚❚ Pausar' : '▶ Escuchar';
        stop.disabled = (state !== 'playing' && state !== 'paused');
        if (state === 'playing') estado.textContent = 'Reproduciendo el boletín…';
        else if (state === 'paused') estado.textContent = 'En pausa.';
        else if (state === 'ended') estado.textContent = 'Boletín terminado.';
        if (state !== 'playing' && state !== 'paused') marcar(-1);
      },
      onSegment: marcar,
      onError: function () {
        estado.textContent = 'No pude reproducir el audio. El guion queda disponible para leer.';
      }
    };

    play.addEventListener('click', function () {
      // El guion aparece solo al reproducir: se sigue la lectura con la vista,
      // y mientras tanto no ocupa la pantalla con un texto largo.
      guion.hidden = false;

      // El boletín compite con los clips de cada nota por el mismo reproductor
      if (R.isPlaybackOwner('boletin')) {
        Canillita.radio.player.toggle(script, callbacks);
        return;
      }
      R.claimPlayback('boletin', function () { callbacks.onState('idle'); });
      Canillita.radio.player.play(script, callbacks);
    });

    stop.addEventListener('click', function () {
      Canillita.radio.player.stop();
      R.releasePlayback();
      callbacks.onState('idle');
    });

    // Si el lector se va de la página, la voz no queda hablando sola.
    global.addEventListener('pagehide', function () {
      Canillita.radio.player.stop();
    });
  }

  /* ------------------------------------------------------------- Ruta 22 */

  function paintRoute22() {
    var historia = Canillita.content.get('ruta22_historia');
    if (!historia) {
      doc.getElementById('bloque-ruta22').hidden = true;
      return;
    }
    doc.getElementById('tramos').innerHTML = R.sections(historia.sections, false, true);
    doc.getElementById('cronologia').innerHTML = R.timeline(historia);
  }

  /* --------------------------------------------------------- sugerencias */

  function paintSuggestions(stories) {
    var questions = [];
    stories.forEach(function (story) {
      (story.suggestedQuestions || []).forEach(function (question) {
        if (questions.indexOf(question) === -1) questions.push(question);
      });
    });
    doc.getElementById('sugeridas').innerHTML = questions.slice(0, 6).map(function (question) {
      return '<a class="sugerida" href="' + R.esc(Canillita.router.chatUrl(question)) + '">' +
        R.esc(question) + '</a>';
    }).join('');
  }

  /* --------------------------------------------------------------- init */

  function start() {
    R = Canillita.render;
    // El boletín grabado se busca en paralelo: si no está, seguimos igual.
    Promise.all([
      Canillita.content.load(),
      Canillita.radio.loadRecorded(),
      Canillita.radio.loadAnswers()
    ]).then(function () {
      var stories = Canillita.content.forDailySummary(Canillita.preferences.get().topics);
      if (!stories.length) stories = Canillita.content.all();

      paintHeader();
      paintStories(stories);
      paintAudio(stories);
      paintRoute22();
      paintSuggestions(stories);

      R.bindFollowButtons(doc);
      R.bindAnswerPlayers(doc);
      R.bindAskForm('ask-form', 'ask-input');
    }).catch(function (error) {
      doc.getElementById('historias').innerHTML =
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
