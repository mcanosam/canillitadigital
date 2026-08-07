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

  /** Estado por tramo. `detailed` agrega el párrafo explicativo. */
  function sections(list, detailed) {
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

  /** Botón de seguir historia, con su estado actual. */
  function followButton(storyId) {
    var following = Canillita.preferences.isFollowing(storyId);
    return '<button type="button" class="btn btn--follow" data-follow="' + esc(storyId) + '"' +
      ' aria-pressed="' + (following ? 'true' : 'false') + '">' +
      (following ? '✓ Seguís esta historia' : '＋ Seguir esta historia') +
      '</button>';
  }

  /** Activa todos los botones de seguir presentes en la página. */
  function bindFollowButtons(root) {
    var buttons = (root || global.document).querySelectorAll('[data-follow]');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var following = Canillita.preferences.toggleFollow(button.dataset.follow);
        button.setAttribute('aria-pressed', following ? 'true' : 'false');
        button.textContent = following ? '✓ Seguís esta historia' : '＋ Seguir esta historia';
      });
    });
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
    bindFollowButtons: bindFollowButtons,
    bindAskForm: bindAskForm
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.render;
  }
})(typeof window !== 'undefined' ? window : globalThis);
