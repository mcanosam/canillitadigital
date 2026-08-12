/*
 * render.js
 * ---------
 * Piezas de HTML que las dos páginas necesitan por igual: cronología, estado
 * por tramo, fuentes, cuerpo del artículo, fechas.
 *
 * Escribirlas una sola vez evita que la edición y la historia viva se vayan
 * separando con el tiempo. Todo lo que entra se escapa antes de imprimirse.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  /* ------------------------------------------------------------- formato */

  function esc(text) {
    return String(text === null || text === undefined ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** '2026-08-02' -> '2 de agosto de 2026' */
  function longDate(isoDate) {
    if (!isoDate) return '';
    var parts = String(isoDate).slice(0, 10).split('-');
    if (parts.length !== 3) return String(isoDate);
    return Number(parts[2]) + ' de ' + MONTHS[Number(parts[1]) - 1] + ' de ' + parts[0];
  }

  /** Solo el año, para cronologías con fechas aproximadas (2016-01-01). */
  function timelineDate(isoDate) {
    var text = String(isoDate || '');
    return /-01-01$/.test(text) ? text.slice(0, 4) : longDate(text);
  }

  function todayLabel() {
    var now = new Date();
    return DAYS[now.getDay()] + ' ' + now.getDate() + ' de ' + MONTHS[now.getMonth()] +
      ' de ' + now.getFullYear();
  }

  /** Fecha sin año, para el filete de la portada: entra en una línea. */
  function todayShort() {
    var now = new Date();
    return DAYS[now.getDay()] + ' ' + now.getDate() + ' de ' + MONTHS[now.getMonth()];
  }

  function clockLabel() {
    var now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  function timeGreeting() {
    var hour = new Date().getHours();
    if (hour < 6) return 'Buenas noches';   // a las 2 de la mañana no es "buen día"
    if (hour < 13) return 'Buen día';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  /* --------------------------------------------------------- componentes */

  /** Aviso de contenido ficticio. Se muestra antes que nada. */
  function fictionBanner(story) {
    if (!story.isFiction) return '';
    return '<p class="fiction">' + esc(story.fictionNotice) + '</p>';
  }

  /** Cuerpo del artículo: párrafos e intertítulos. */
  function articleBody(body) {
    return (body || []).map(function (block) {
      if (block.type === 'heading') {
        return '<h3 class="article__heading">' + esc(block.text) + '</h3>';
      }
      return '<p>' + esc(block.text) + '</p>';
    }).join('');
  }

  /** Hechos confirmados, con su fecha. */
  function confirmedFacts(story) {
    var items = (story.confirmedFacts || []).map(function (item) {
      return '<li>' + esc(item.fact) +
        '<span class="fact__date">Dato del ' + esc(longDate(item.date)) + '</span></li>';
    }).join('');
    return items ? '<ul class="facts facts--confirmed">' + items + '</ul>' : '';
  }

  /** Preguntas abiertas. */
  function pendingQuestions(story) {
    var items = (story.pendingQuestions || []).map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');
    return items ? '<ul class="facts facts--pending">' + items + '</ul>' : '';
  }

  /** Cronología vertical. */
  function timeline(story) {
    var items = (story.timeline || []).map(function (item) {
      var source = Canillita.content.sourceById(story, item.sourceId);
      return '<li class="hito">' +
        '<span class="hito__date">' + esc(timelineDate(item.date)) + '</span>' +
        '<h4 class="hito__title">' + esc(item.title) + '</h4>' +
        '<p class="hito__text">' + esc(item.text) + '</p>' +
        (source ? '<p class="hito__source">' + esc(source.publisher) + '</p>' : '') +
        '</li>';
    }).join('');
    return items ? '<ol class="cronologia">' + items + '</ol>' : '';
  }

  var STATUS_LABEL = {
    done: 'Habilitado',
    partial: 'Parcial',
    blocked: 'Sin ejecutar'
  };

  /** Estado por tramo. `detailed` agrega el párrafo; `withAudio`, el clip. */
  function sections(list, detailed, withAudio) {
    var items = list.map(function (section) {
      return '<li class="tramo tramo--' + esc(section.status) + '" id="' + esc(section.id) + '">' +
        '<div class="tramo__head">' +
          '<h4 class="tramo__name">' + esc(section.name) + '</h4>' +
          '<span class="chip chip--' + esc(section.status) + '">' +
            esc(STATUS_LABEL[section.status] || section.status) + '</span>' +
        '</div>' +
        '<p class="tramo__traza">' + esc(section.from) + ' → ' + esc(section.to) +
          (section.lengthKm ? ' · ' + esc(String(section.lengthKm).replace('.', ',')) + ' km' : '') +
        '</p>' +
        '<p class="tramo__estado">' + esc(section.statusLabel) + '</p>' +
        (detailed ? '<p class="tramo__detalle">' + esc(section.detail) + '</p>' : '') +
        (withAudio ? answerPlayer(section.id, 'Escuchar este tramo') : '') +
        '</li>';
    }).join('');
    return '<ul class="tramos">' + items + '</ul>';
  }

  /** Lista de fuentes con publicación y fecha. */
  function sources(story) {
    var items = (story.sources || []).map(function (source) {
      var date = source.publishedAt
        ? longDate(source.publishedAt)
        : (source.dateNote ? 'fecha a verificar' : '');
      var label = esc(source.name) +
        '<span class="fuente__meta">' + esc(source.publisher) + (date ? ' · ' + esc(date) : '') + '</span>';
      return '<li class="fuente">' +
        (source.url
          ? '<a href="' + esc(source.url) + '" target="_blank" rel="noopener">' + label + '</a>'
          : label) +
        '</li>';
    }).join('');
    return items ? '<ul class="fuentes">' + items + '</ul>' : '';
  }

  /** Dirección de la página de un hilo, desde donde se esté. */
  function hiloUrl(hiloId) {
    var hilo = Canillita.content.hilo(hiloId);
    if (!hilo) return Canillita.router.homeUrl();
    return Canillita.router.path(hilo.page);
  }

  /**
   * Botón de seguir. Es por HILO, no por historia: seguir "Ruta 22" cubre
   * tanto la actualidad como el porqué de la obra.
   */
  function followButton(hiloId) {
    var hilo = Canillita.content.hilo(hiloId);
    if (!hilo) return '';
    var following = Canillita.preferences.isFollowing(hiloId);
    return '<button type="button" class="btn btn--follow" data-follow="' + esc(hiloId) + '"' +
      ' aria-pressed="' + (following ? 'true' : 'false') + '">' +
      (following ? '✓ Seguís ' + esc(hilo.label) : '＋ Seguir ' + esc(hilo.label)) +
      '</button>';
  }

  /** Activa todos los botones de seguir presentes en la página. */
  function bindFollowButtons(root) {
    var buttons = (root || global.document).querySelectorAll('[data-follow]');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var hiloId = button.dataset.follow;
        var hilo = Canillita.content.hilo(hiloId);
        var etiqueta = hilo ? hilo.label : 'esta historia';
        var following = Canillita.preferences.toggleFollow(hiloId);
        button.setAttribute('aria-pressed', following ? 'true' : 'false');
        button.textContent = (following ? '✓ Seguís ' : '＋ Seguir ') + etiqueta;

        // Sin este aviso, seguir una historia no tenía ningún efecto visible
        var aviso = button.parentNode.querySelector('.seguir-aviso');
        if (!aviso) {
          aviso = global.document.createElement('p');
          aviso.className = 'seguir-aviso';
          button.parentNode.appendChild(aviso);
        }
        aviso.textContent = following
          ? 'Queda como acceso directo en el menú del chat.'
          : '';
      });
    });
  }


  /* ------------------------------------------- escuchar una respuesta */

  /*
   * Qué clip le corresponde a cada historia. Los tramos usan su propio id
   * (seccion1, tramo6…), que ya coincide con el del clip generado.
   */
  var AUDIO_POR_HISTORIA = {
    ruta22_actualidad: 'ruta22-actualidad',
    ruta22_historia: 'ruta22-historia',
    deportes_demo: 'deportes',
    messi_hilo: 'messi'
  };

  function audioIdForStory(storyId) {
    return AUDIO_POR_HISTORIA[storyId] || null;
  }

  /*
   * El reproductor es uno solo por página, pero los botones son varios.
   * Acá se anota cuál manda, para que tocar play en un bloque no se
   * interprete como pausar el que estaba sonando.
   */
  var reproduciendo = null;

  function claimPlayback(id, reset) {
    if (reproduciendo && reproduciendo.id !== id) reproduciendo.reset();
    reproduciendo = { id: id, reset: reset };
  }

  function isPlaybackOwner(id) {
    return reproduciendo !== null && reproduciendo.id === id;
  }

  function releasePlayback() {
    reproduciendo = null;
  }

  /** Barra de escucha. Devuelve '' si esa respuesta no tiene clip grabado. */
  function answerPlayer(audioId, label) {
    if (!audioId || !Canillita.radio.answer(audioId)) return '';
    var clip = Canillita.radio.answer(audioId);
    return '<div class="escuchar clip" data-clip="' + esc(audioId) + '">' +
      '<button type="button" class="clip__play" aria-label="Escuchar">▶</button>' +
      '<span class="clip__label">' + esc(label || 'Escuchar') + ' · ' +
        Math.round(clip.duration) + 's</span>' +
      '</div>';
  }

  /** Activa todas las barras de escucha presentes en la página. */
  function bindAnswerPlayers(root) {
    var barras = (root || global.document).querySelectorAll('[data-clip]');
    Array.prototype.forEach.call(barras, function (barra) {
      var audioId = barra.dataset.clip;
      var button = barra.querySelector('.clip__play');
      var label = barra.querySelector('.clip__label');
      var textoBase = label.textContent;

      var callbacks = {
        onState: function (state) {
          var sonando = state === 'playing';
          button.textContent = sonando ? '❚❚' : '▶';
          button.setAttribute('aria-label', sonando ? 'Pausar' : 'Escuchar');
          label.textContent = sonando ? 'Reproduciendo…' : textoBase;
        },
        onError: function () {
          label.textContent = 'No pude reproducir el audio.';
        }
      };

      button.addEventListener('click', function () {
        var player = Canillita.radio.player;
        player.setRate(Canillita.preferences.get().speechRate);

        if (isPlaybackOwner(audioId) && player.state() === 'playing') {
          player.pause();
          return;
        }
        if (isPlaybackOwner(audioId) && player.state() === 'paused') {
          player.resume();
          return;
        }
        claimPlayback(audioId, function () { callbacks.onState('idle'); });
        player.playAnswer(audioId, callbacks);
      });
    });
  }

  /**
   * Barra de secciones. Se arma sola con los hilos cargados, así que sumar un
   * hilo nuevo no obliga a tocar el HTML de cada página.
   * `actual` es la página en la que estamos, para no enlazarla a sí misma.
   */
  function seccionesNav(actual) {
    var router = Canillita.router;
    var enlaces = [];

    if (actual !== 'portada') {
      enlaces.push('<a href="' + esc(router.homeUrl()) + '">Portada</a>');
    }
    if (actual !== 'edicion') {
      enlaces.push('<a href="' + esc(router.editionUrl()) + '">Mi edición</a>');
    }

    Canillita.content.hilos().forEach(function (hilo) {
      if (actual === hilo.id) return;
      enlaces.push('<a href="' + esc(hiloUrl(hilo.id)) + '">' + esc(hilo.label) + '</a>');
    });

    /*
     * "Conversá con el diario" no es una sección más: es la acción que
     * distingue al producto. Va separada y marcada, al final de la barra.
     */
    if (actual !== 'chat') {
      enlaces.push('<a class="secciones__accion" href="' + esc(router.chatUrl()) +
        '">💬 Conversá con el diario</a>');
    }
    return enlaces.join('');
  }

  /** Conecta el campo "preguntale al canillita" con el chat. */
  function bindAskForm(formId, inputId) {
    var form = global.document.getElementById(formId);
    var input = global.document.getElementById(inputId);
    if (!form || !input) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var question = input.value.trim();
      if (!question) return;
      global.location.href = Canillita.router.chatUrl(question);
    });
  }

  Canillita.render = {
    esc: esc,
    longDate: longDate,
    timelineDate: timelineDate,
    todayLabel: todayLabel,
    todayShort: todayShort,
    clockLabel: clockLabel,
    timeGreeting: timeGreeting,
    fictionBanner: fictionBanner,
    articleBody: articleBody,
    confirmedFacts: confirmedFacts,
    pendingQuestions: pendingQuestions,
    timeline: timeline,
    sections: sections,
    sources: sources,
    followButton: followButton,
    hiloUrl: hiloUrl,
    seccionesNav: seccionesNav,
    audioIdForStory: audioIdForStory,
    answerPlayer: answerPlayer,
    bindAnswerPlayers: bindAnswerPlayers,
    claimPlayback: claimPlayback,
    isPlaybackOwner: isPlaybackOwner,
    releasePlayback: releasePlayback,
    bindFollowButtons: bindFollowButtons,
    bindAskForm: bindAskForm
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.render;
  }
})(typeof window !== 'undefined' ? window : globalThis);
