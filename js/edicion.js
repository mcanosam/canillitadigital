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
    var prefs = Canillita.preferences.get();
    var name = prefs.name ? ', ' + prefs.name : '';

    doc.getElementById('saludo').textContent = R.timeGreeting() + name + '.';
    doc.getElementById('edicion-meta').textContent =
      R.todayLabel() + ' · preparada a las ' + R.clockLabel() +
      (prefs.locality ? ' · ' + prefs.locality : '');

    var temas = Canillita.preferences.topicLabels();
    doc.getElementById('intereses').innerHTML = 'Tus temas: ' +
      temas.map(function (label) {
        return '<span class="tag">' + R.esc(label) + '</span>';
      }).join('');

    doc.getElementById('preparada').textContent =
      'Edición preparada el ' + R.todayLabel() + ' a las ' + R.clockLabel() + '.';
  }

  /* ------------------------------------------------------------ historias */

  function storyCard(story, index) {
    var isPrincipal = index === 0;
    return '<article class="nota' + (isPrincipal ? ' nota--principal' : '') + '">' +
      '<p class="nota__eyebrow">' + R.esc(story.category) +
        (isPrincipal ? ' · Noticia principal' : '') + '</p>' +
      '<h2 class="nota__titulo">' + R.esc(story.title) + '</h2>' +
      '<p class="nota__bajada">' + R.esc(story.subtitle) + '</p>' +
      '<p class="nota__lectura">' + R.esc(story.readingTime) + ' min de lectura · ' +
        'actualizada el ' + R.esc(R.longDate(story.lastUpdated)) + '</p>' +
      R.fictionBanner(story) +
      '<p class="nota__resumen">' + R.esc(story.shortSummary) + '</p>' +

      '<details class="mas">' +
        '<summary class="mas__btn">Profundizar en esta historia</summary>' +
        '<div class="mas__cuerpo">' +
          '<div class="article">' + R.articleBody(story.articleBody) + '</div>' +
          (story.whyItMatters
            ? '<div class="importa"><h3>Por qué importa acá</h3><p>' +
              R.esc(story.whyItMatters) + '</p></div>'
            : '') +
          saberBlock(story) +
          '<h3 class="mas__sub">Fuentes</h3>' + R.sources(story) +
        '</div>' +
      '</details>' +

      '<div class="nota__acciones">' +
        R.followButton(story.id) +
        (story.topic === 'ruta22'
          ? '<a class="btn btn--ghost" href="ruta22.html">Ver historia viva ›</a>'
          : '') +
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
      Canillita.radio.player.toggle(script, callbacks);
    });

    stop.addEventListener('click', function () {
      Canillita.radio.player.stop();
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
    doc.getElementById('tramos').innerHTML = R.sections(historia.sections, false);
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
      Canillita.radio.loadRecorded()
    ]).then(function () {
      var stories = Canillita.content.forDailySummary(Canillita.preferences.get().topics);
      if (!stories.length) stories = Canillita.content.all();

      paintHeader();
      paintStories(stories);
      paintAudio(stories);
      paintRoute22();
      paintSuggestions(stories);

      R.bindFollowButtons(doc);
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
