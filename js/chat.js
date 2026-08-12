/*
 * chat.js
 * -------
 * Todo lo visual de la conversación: burbujas, indicador de escritura,
 * botones de respuesta rápida y envío de mensajes.
 *
 * No decide QUÉ responder (eso es responses.js). Solo lo muestra.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var doc = global.document;

  var elements = {};
  var busy = false;
  var pending = [];   // mensajes que llegaron mientras el agente escribía

  /*
   * El reproductor es uno solo para toda la conversación, pero los botones son
   * muchos. Acá se anota cuál manda: sin esto, tocar play en una respuesta
   * mientras suena otra se interpretaba como "pausar", y nunca arrancaba.
   */
  var reproduciendo = null;   // { id, reset }

  function tomarReproduccion(id, reset) {
    if (reproduciendo && reproduciendo.id !== id) reproduciendo.reset();
    reproduciendo = { id: id, reset: reset };
  }

  function esElQueSuena(id) {
    return reproduciendo !== null && reproduciendo.id === id;
  }

  /* ------------------------------------------------------------- formato */

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Formato liviano estilo WhatsApp: *negrita*, _cursiva_, saltos de línea.
   * Se aplica siempre DESPUÉS de escapar el HTML.
   */
  function formatText(text) {
    return escapeHtml(text)
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function timeLabel() {
    var now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  /* ------------------------------------------------------------ elementos */

  function buildSources(sources) {
    if (!sources || !sources.length) return '';
    var items = sources.map(function (source) {
      var label = escapeHtml(source.publisher || source.name);
      var date = source.publishedAt
        ? Canillita.responses.longDate(source.publishedAt)
        : (source.dateNote ? 'fecha a verificar' : '');
      var text = label + (date ? ' · ' + date : '');
      return source.url
        ? '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener">' + text + '</a>'
        : '<span>' + text + '</span>';
    }).join('');
    return '<div class="sources"><span class="sources__label">Fuentes</span>' + items + '</div>';
  }

  /** Enlaces a las páginas de la edición, como botones dentro de la burbuja. */
  function buildLinks(links) {
    if (!links || !links.length) return '';
    var items = links.map(function (link) {
      return '<a class="bubble__link" href="' + escapeHtml(link.href) + '">' +
        escapeHtml(link.label) + ' ›</a>';
    }).join('');
    return '<div class="bubble__links">' + items + '</div>';
  }

  function buildMeta(msg) {
    if (!msg.dataDate) return '';
    return '<div class="meta">Dato actualizado al ' +
      escapeHtml(Canillita.responses.longDate(msg.dataDate)) + '</div>';
  }

  /**
   * Burbuja de audio: reproduce el boletín y muestra el guion abajo.
   * El guion queda visible aunque el navegador no tenga voz en español.
   */
  function appendAudioMessage(msg) {
    var wrapper = doc.createElement('div');
    wrapper.className = 'msg msg--in msg--audio';

    var grabado = Canillita.radio.recorded();
    var supported = Boolean(grabado) || Canillita.radio.isSupported();
    var segmentsHtml = msg.script.segments.map(function (segment, index) {
      return '<p class="guion__linea" data-segment="' + index + '">' +
        escapeHtml(segment.text) + '</p>';
    }).join('');

    wrapper.innerHTML =
      '<div class="bubble">' +
        '<div class="audio">' +
          '<button type="button" class="audio__play" aria-label="Reproducir el boletín">▶</button>' +
          '<div class="audio__info">' +
            '<span class="audio__title">Boletín de Tu Canillita</span>' +
            '<span class="audio__state">' +
              (grabado ? Math.round(grabado.duration) + ' segundos · voz ' + escapeHtml(grabado.voice)
                : supported ? msg.script.seconds + ' segundos'
                : 'Sin voz disponible: leelo abajo') +
            '</span>' +
          '</div>' +
          (supported ? '<button type="button" class="audio__stop" aria-label="Detener">■</button>' : '') +
        '</div>' +
        '<div class="guion__texto">' + segmentsHtml + '</div>' +
        buildLinks(msg.links) +
        '<time>' + timeLabel() + '</time>' +
      '</div>';

    elements.log.appendChild(wrapper);

    if (supported) {
      bindAudioControls(wrapper, msg.script);
    }
    scrollToEnd();
    return wrapper;
  }

  /** Conecta los botones de una burbuja de audio con el reproductor. */
  function bindAudioControls(wrapper, script) {
    var playButton = wrapper.querySelector('.audio__play');
    var stopButton = wrapper.querySelector('.audio__stop');
    var stateLabel = wrapper.querySelector('.audio__state');

    function highlight(index) {
      var lines = wrapper.querySelectorAll('[data-segment]');
      Array.prototype.forEach.call(lines, function (line) {
        line.classList.toggle('is-speaking', Number(line.dataset.segment) === index);
      });
    }

    var callbacks = {
      onState: function (state) {
        var playing = state === 'playing';
        playButton.textContent = playing ? '❚❚' : '▶';
        playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir el boletín');
        if (state === 'playing') stateLabel.textContent = 'Reproduciendo…';
        else if (state === 'paused') stateLabel.textContent = 'En pausa';
        else if (state === 'ended') stateLabel.textContent = 'Boletín terminado';
        else stateLabel.textContent = script.seconds + ' segundos';
        if (state !== 'playing' && state !== 'paused') highlight(-1);
      },
      onSegment: highlight,
      onError: function () {
        stateLabel.textContent = 'No pude reproducirlo. El guion está abajo.';
      }
    };

    playButton.addEventListener('click', function () {
      var player = Canillita.radio.player;
      // Respetamos la velocidad elegida en la edición.
      player.setRate(Canillita.preferences.get().speechRate);

      if (esElQueSuena('boletin')) {
        player.toggle(script, callbacks);
        return;
      }
      tomarReproduccion('boletin', function () { callbacks.onState('idle'); });
      player.play(script, callbacks);
    });
    stopButton.addEventListener('click', function () {
      Canillita.radio.player.stop();
      reproduciendo = null;
      callbacks.onState('idle');
    });
  }

  function appendMessage(msg, direction) {
    if (msg.kind === 'audio' && direction === 'in') {
      return appendAudioMessage(msg);
    }
    var wrapper = doc.createElement('div');
    wrapper.className = 'msg msg--' + direction + (msg.kind === 'script' ? ' msg--script' : '');
    wrapper.innerHTML =
      '<div class="bubble">' +
        (msg.kind === 'script' ? '<div class="bubble__tag">Guion del boletín</div>' : '') +
        '<div class="bubble__text">' + formatText(msg.text) + '</div>' +
        buildLinks(msg.links) +
        buildMeta(msg) +
        buildSources(msg.sources) +
        '<time>' + timeLabel() + '</time>' +
      '</div>';
    elements.log.appendChild(wrapper);
    scrollToEnd();
    return wrapper;
  }

  function showTyping() {
    var wrapper = doc.createElement('div');
    wrapper.className = 'msg msg--in';
    wrapper.dataset.typing = 'true';
    wrapper.innerHTML = '<div class="bubble bubble--typing" aria-label="Tu Canillita está escribiendo">' +
      '<span></span><span></span><span></span></div>';
    elements.log.appendChild(wrapper);
    scrollToEnd();
    return wrapper;
  }

  /**
   * Barra para escuchar una respuesta puntual, cuando existe su clip grabado.
   * Aparece debajo del último mensaje de la respuesta.
   */
  function appendAnswerPlayer(audioId) {
    var clip = Canillita.radio.answer(audioId);
    if (!clip) return null;

    var wrapper = doc.createElement('div');
    wrapper.className = 'msg msg--in msg--clip';
    wrapper.innerHTML =
      '<div class="clip">' +
        '<button type="button" class="clip__play" aria-label="Escuchar esta respuesta">▶</button>' +
        '<span class="clip__label">Escuchar esta respuesta · ' +
          Math.round(clip.duration) + 's</span>' +
      '</div>';

    var button = wrapper.querySelector('.clip__play');
    var label = wrapper.querySelector('.clip__label');

    var callbacks = {
      onState: function (state) {
        var sonando = state === 'playing';
        button.textContent = sonando ? '❚❚' : '▶';
        button.setAttribute('aria-label', sonando ? 'Pausar' : 'Escuchar esta respuesta');
        label.textContent = sonando
          ? 'Reproduciendo la respuesta…'
          : 'Escuchar esta respuesta · ' + Math.round(clip.duration) + 's';
      },
      onError: function () {
        label.textContent = 'No pude reproducir el audio.';
      }
    };

    button.addEventListener('click', function () {
      var player = Canillita.radio.player;
      player.setRate(Canillita.preferences.get().speechRate);

      // Pausar y retomar solo valen si este clip es el que está sonando.
      if (esElQueSuena(audioId) && player.state() === 'playing') {
        player.pause();
        return;
      }
      if (esElQueSuena(audioId) && player.state() === 'paused') {
        player.resume();
        return;
      }
      tomarReproduccion(audioId, function () { callbacks.onState('idle'); });
      player.playAnswer(audioId, callbacks);
    });

    elements.log.appendChild(wrapper);
    scrollToEnd();
    return wrapper;
  }

  function scrollToEnd() {
    elements.log.scrollTop = elements.log.scrollHeight;
  }

  function renderQuickReplies(replies) {
    elements.quick.innerHTML = '';
    if (!replies || !replies.length) {
      elements.quick.hidden = true;
      return;
    }
    elements.quick.hidden = false;
    replies.forEach(function (label) {
      var button = doc.createElement('button');
      button.type = 'button';
      button.className = 'quick';
      button.textContent = label;
      button.addEventListener('click', function () {
        send(label);
      });
      elements.quick.appendChild(button);
    });
  }

  /* -------------------------------------------------------------- envío */

  function delay(ms) {
    return new Promise(function (resolve) { global.setTimeout(resolve, ms); });
  }

  /**
   * Mientras el agente "escribe" el redactor queda bloqueado.
   * Antes el mensaje se descartaba en silencio y parecía que se había colgado.
   */
  function setBusy(state) {
    busy = state;
    elements.form.setAttribute('aria-busy', state ? 'true' : 'false');
    elements.input.disabled = state;
    elements.send.disabled = state;
    elements.input.placeholder = state
      ? 'Escribiendo…'
      : 'Escribí tu mensaje';
  }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Muestra una respuesta completa, mensaje por mensaje. */
  function renderReply(reply) {
    var quiet = prefersReducedMotion();
    var queue = reply.messages.slice();

    function next() {
      if (!queue.length) {
        if (reply.audioId) appendAnswerPlayer(reply.audioId);
        renderQuickReplies(reply.quickReplies);
        setBusy(false);
        if (pending.length) {
          send(pending.shift());
          return Promise.resolve();
        }
        // preventScroll: sin esto el navegador salta al final de la página
        // apenas carga la demo.
        try {
          elements.input.focus({ preventScroll: true });
        } catch (error) {
          /* navegadores viejos: se ignora */
        }
        return Promise.resolve();
      }
      var msg = queue.shift();
      var typing = showTyping();
      var pause = quiet ? 120 : Math.min(1100, 350 + msg.text.length * 4);
      return delay(pause).then(function () {
        typing.remove();
        appendMessage(msg, 'in');
        return delay(quiet ? 60 : 220).then(next);
      });
    }

    setBusy(true);
    renderQuickReplies([]);
    return next();
  }

  /**
   * Envía un mensaje del usuario y pide la respuesta al motor.
   * Si el agente todavía está escribiendo, el mensaje espera su turno en vez
   * de perderse: así funcionan las preguntas que llegan desde la edición.
   */
  function send(text) {
    var clean = String(text || '').trim();
    if (!clean) return;
    if (busy) {
      pending.push(clean);
      return;
    }
    appendMessage({ text: clean }, 'out');
    elements.input.value = '';
    var reply = Canillita.responses.respondTo(clean);
    renderReply(reply);
  }

  /* --------------------------------------------------------------- init */

  function init(options) {
    elements.log = doc.getElementById('chat-log');
    elements.quick = doc.getElementById('quick-replies');
    elements.form = doc.getElementById('composer');
    elements.input = doc.getElementById('composer-input');
    elements.send = doc.querySelector('.composer__send');

    elements.form.addEventListener('submit', function (event) {
      event.preventDefault();
      send(elements.input.value);
    });

    if (options && options.opening) {
      renderReply(options.opening);
    }
  }

  function showError(text) {
    elements.log = elements.log || doc.getElementById('chat-log');
    appendMessage({ text: text }, 'in');
  }

  Canillita.chat = {
    init: init,
    send: send,
    showError: showError
  };
})(window);
