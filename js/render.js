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

  /**
   * Foto de la nota.
   *
   * Mientras no exista el archivo, se dibuja un espacio reservado que dice qué
   * foto va ahí. Es más útil que un hueco vacío —le indica al fotógrafo qué
   * salir a buscar— y más honesto que una imagen de relleno que después habría
   * que reemplazar.
   *
   * @param {Object} story
   * @param {string} tamano 'principal' | 'secundaria'
   */
  function figure(story, tamano) {
    var imagen = story.image;
    if (!imagen) return '';

    var clase = 'foto foto--' + (tamano || 'principal');

    if (imagen.src) {
      var base = (Canillita.router && Canillita.router.base()) || '';
      return '<figure class="' + clase + '">' +
        '<img src="' + esc(base + imagen.src) + '" alt="' + esc(imagen.alt) + '" loading="lazy">' +
        (imagen.credit
          ? '<figcaption class="foto__credito">' + esc(imagen.credit) + '</figcaption>'
          : '<figcaption class="foto__credito foto__credito--falta">' +
            'Crédito pendiente' + '</figcaption>') +
        '</figure>';
    }

    return '<figure class="' + clase + ' foto--pendiente">' +
      '<div class="foto__hueco" role="img" aria-label="' + esc(imagen.alt) + '">' +
        '<span class="foto__icono" aria-hidden="true">▣</span>' +
        '<span class="foto__nota">' + esc(imagen.pending || imagen.alt) + '</span>' +
      '</div>' +
      '</figure>';
  }

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
     * Las secciones se deslizan cuando no entran, pero la acción NO: queda
     * fija a la derecha. Antes viajaba dentro del área deslizable y se perdía
     * apenas había tres o cuatro hilos.
     */
    var lista = '<div class="secciones__lista">' + enlaces.join('') + '</div>';
    var accion = actual === 'chat' ? '' :
      '<a class="secciones__accion" href="' + esc(router.chatUrl()) +
      '">💬 Conversá</a>';

    return lista + accion;
  }

  /* ------------------------------------------------------- programación */

  var HORARIOS = [
    { valor: '07:00', etiqueta: '7 de la mañana', nota: 'antes de salir' },
    { valor: '13:00', etiqueta: '1 de la tarde', nota: 'al mediodía' },
    { valor: '20:00', etiqueta: '8 de la noche', nota: 'después del trabajo' }
  ];

  /*
   * Cuándo querés que llegue.
   *
   * Se dice con todas las letras que el envío automático todavía no está: la
   * demo guarda la preferencia y nada más. Prometer un boletín a las 7 que no
   * llega sería el peor error posible en un producto periodístico.
   */
  function programacion() {
    var prefs = Canillita.preferences.get();

    var opciones = HORARIOS.map(function (horario) {
      var activo = prefs.hour === horario.valor;
      return '<button type="button" class="horario' + (activo ? ' is-activo' : '') +
        '" data-hora="' + esc(horario.valor) + '" aria-pressed="' + activo + '">' +
        '<span class="horario__hora">' + esc(horario.valor) + '</span>' +
        '<span class="horario__nota">' + esc(horario.nota) + '</span>' +
        '</button>';
    }).join('');

    return '<section class="programar" id="programar">' +
      '<p class="programar__rotulo">Programá tu boletín</p>' +
      '<p class="programar__bajada">Elegí a qué hora querés recibir tu edición ' +
        'y las actualizaciones de los hilos que seguís.</p>' +
      '<div class="programar__horarios">' + opciones + '</div>' +
      '<p class="programar__canales">Te llega por <strong>Telegram</strong>. ' +
        'Más adelante, también por WhatsApp.</p>' +
      '<p class="programar__aviso" id="programar-aviso">En esta demostración se ' +
        'guarda tu elección, pero el envío automático todavía no está conectado.</p>' +
      '</section>';
  }

  function bindProgramacion(root) {
    var caja = (root || global.document).querySelector('.programar__horarios');
    if (!caja) return;

    caja.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-hora]');
      if (!boton) return;

      Canillita.preferences.set({ hour: boton.dataset.hora });

      Array.prototype.forEach.call(caja.querySelectorAll('[data-hora]'), function (otro) {
        var activo = otro === boton;
        otro.classList.toggle('is-activo', activo);
        otro.setAttribute('aria-pressed', activo);
      });

      var aviso = global.document.getElementById('programar-aviso');
      if (aviso) {
        aviso.textContent = 'Anotado: ' + boton.dataset.hora +
          '. En esta demostración se guarda tu elección, pero el envío ' +
          'automático todavía no está conectado.';
      }
    });
  }

  /* ---------------------------------------------------------- la firma */

  /*
   * Quién sigue el tema. No es la firma de este texto: es el periodista que
   * cubre el asunto, que en un diario local es lo que da autoridad sobre un
   * tema seguido durante años.
   */
  function firma(story) {
    if (!story.beat || !story.beat.name) return '';
    return '<p class="firma">' +
      '<span class="firma__rol">' + esc(story.beat.role || 'Sigue el tema') + '</span>' +
      '<span class="firma__nombre">' + esc(story.beat.name) + '</span>' +
      '</p>';
  }

  /* ------------------------------------------------ credenciales del hilo */

  /*
   * Lo que hay detrás de una historia viva, en números: hitos reconstruidos,
   * hechos verificados con fecha, preguntas todavía sin respuesta y fuentes
   * consultadas.
   *
   * Existe porque el trabajo periodístico es invisible en una portada. Un
   * lector ve un título y no distingue entre una nota escrita en diez minutos
   * y un hilo seguido durante años. Estos cuatro números lo hacen visible, y
   * salen del propio contenido: si algún día bajan, se nota.
   */
  function credencialesHilo(story) {
    var datos = [
      { n: (story.timeline || []).length, uno: 'hito reconstruido', varios: 'hitos reconstruidos' },
      { n: (story.confirmedFacts || []).length, uno: 'hecho verificado', varios: 'hechos verificados' },
      { n: (story.pendingQuestions || []).length, uno: 'pregunta sin respuesta', varios: 'preguntas sin respuesta' },
      { n: (story.sources || []).length, uno: 'fuente consultada', varios: 'fuentes consultadas' }
    ].filter(function (dato) { return dato.n > 0; });

    if (datos.length < 2) return '';

    var items = datos.map(function (dato) {
      return '<li><strong>' + dato.n + '</strong> ' +
        esc(dato.n === 1 ? dato.uno : dato.varios) + '</li>';
    }).join('');

    return '<div class="credenciales">' +
      '<p class="credenciales__rotulo">Detrás de esta historia</p>' +
      '<ul class="credenciales__lista">' + items + '</ul>' +
      '<p class="credenciales__nota">Lo confirmado y lo que falta definir van ' +
      'separados. Cada dato, con su fecha y su fuente.</p>' +
      '</div>';
  }

  /* -------------------------------------------------------- novedades */

  /*
   * Qué se movió desde la última visita.
   *
   * Se compara `lastUpdated` de cada historia contra la fecha guardada. Solo
   * cuentan los hilos que el lector sigue o los temas que eligió: avisar de
   * algo que no le interesa sería ruido, no novedad.
   *
   * @returns {{desde: Date|null, hilos: Array, total: number}}
   */
  function novedades(desde) {
    if (!desde) return { desde: null, hilos: [], total: 0 };

    var prefs = Canillita.preferences.get();
    var porHilo = {};

    Canillita.content.all().forEach(function (story) {
      if (!story.lastUpdated) return;
      if (new Date(story.lastUpdated) <= desde) return;

      var hiloId = Canillita.content.hiloDe(story.id);
      var hilo = Canillita.content.hilo(hiloId);
      if (!hilo) return;

      var leInteresa = Canillita.preferences.isFollowing(hiloId) ||
        prefs.topics.indexOf(story.topic) !== -1;
      if (!leInteresa) return;

      if (!porHilo[hiloId]) {
        porHilo[hiloId] = { id: hiloId, label: hilo.label, historias: [] };
      }
      porHilo[hiloId].historias.push(story);
    });

    var hilos = Object.keys(porHilo).map(function (id) { return porHilo[id]; });
    return {
      desde: desde,
      hilos: hilos,
      total: hilos.reduce(function (suma, h) { return suma + h.historias.length; }, 0)
    };
  }

  /** ¿Esta historia cambió desde la última visita? */
  function esNovedad(story, resumen) {
    if (!resumen || !resumen.desde || !story.lastUpdated) return false;
    return new Date(story.lastUpdated) > resumen.desde;
  }

  /** "hace 3 días", "hoy", "ayer" */
  function haceCuanto(fecha) {
    var dias = Math.floor((Date.now() - fecha.getTime()) / 86400000);
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    return 'hace ' + dias + ' días';
  }

  /**
   * Banda de novedades.
   *
   * En la primera visita no hay con qué comparar. En vez de inventar
   * novedades, se explica la función y se ofrece simularla: para el que abre
   * la demo por un enlace, es la única forma honesta de que la vea.
   */
  function novedadesBanda(resumen) {
    if (!resumen.desde) {
      return '<section class="novedades novedades--primera">' +
        '<p class="novedades__rotulo">Cómo funciona</p>' +
        '<p class="novedades__titulo">Los hilos que seguís no se cierran.</p>' +
        '<p class="novedades__texto">Cuando vuelvas, acá te marcamos qué se movió ' +
        'mientras no estabas. Ninguna historia queda vieja: se actualiza.</p>' +
        '<button type="button" class="novedades__simular" data-simular="7">' +
        'Ver cómo se vería si volvieras en una semana</button>' +
        '</section>';
    }

    if (!resumen.total) {
      return '<section class="novedades novedades--quieta">' +
        '<p class="novedades__rotulo">Desde tu última visita · ' +
          esc(haceCuanto(resumen.desde)) + '</p>' +
        '<p class="novedades__texto">Ninguno de tus hilos se movió todavía.</p>' +
        '<button type="button" class="novedades__simular" data-simular="7">' +
        'Ver cómo se vería si volvieras en una semana</button>' +
        '</section>';
    }

    var lineas = resumen.hilos.map(function (hilo) {
      var cuantas = hilo.historias.length;
      return '<li><a href="' + esc(hiloUrl(hilo.id)) + '">' +
        '<span class="novedades__hilo">' + esc(hilo.label) + '</span>' +
        '<span class="novedades__detalle">' +
          (cuantas === 1
            ? esc(hilo.historias[0].subtitle)
            : cuantas + ' actualizaciones') +
        '</span></a></li>';
    }).join('');

    var cuantos = resumen.hilos.length;
    return '<section class="novedades">' +
      '<p class="novedades__rotulo"><span class="novedades__punto" aria-hidden="true"></span>' +
        'Desde tu última visita · ' + esc(haceCuanto(resumen.desde)) + '</p>' +
      '<p class="novedades__titulo"><strong>' + cuantos +
        (cuantos === 1 ? ' hilo' : ' hilos') + '</strong> que seguís se ' +
        (cuantos === 1 ? 'movió' : 'movieron')  + '</p>' +
      '<ul class="novedades__lista">' + lineas + '</ul>' +
      '</section>';
  }

  /** Sello para una nota que cambió. */
  function selloNovedad(story, resumen) {
    if (!esNovedad(story, resumen)) return '';
    return '<span class="sello-nuevo">Actualizada</span>';
  }

  /** Activa el botón que simula una ausencia. Solo existe en la demo. */
  function bindSimularAusencia(root) {
    var boton = (root || global.document).querySelector('[data-simular]');
    if (!boton) return;
    boton.addEventListener('click', function () {
      Canillita.preferences.simularAusencia(Number(boton.dataset.simular) || 3);
      global.location.reload();
    });
  }

  /*
   * Barra para ver la demo como distintos lectores. Es una ayuda de
   * demostración, no una función del diario: por eso se muestra aparte y
   * dice explícitamente qué es.
   */
  function personaBar() {
    if (!Canillita.personas) return '';
    var activa = Canillita.personas.activa();

    var botones = Canillita.personas.todas().map(function (persona) {
      var esta = persona.id === activa;
      return '<button type="button" class="persona' + (esta ? ' is-activa' : '') +
        '" data-persona="' + esc(persona.id) + '" aria-pressed="' + esta + '">' +
        '<span class="persona__nombre">' + esc(persona.nombre) + '</span>' +
        '<span class="persona__rol">' + esc(persona.rol) + '</span>' +
        '</button>';
    }).join('');

    var yo = '<button type="button" class="persona' + (!activa ? ' is-activa' : '') +
      '" data-persona="" aria-pressed="' + !activa + '">' +
      '<span class="persona__nombre">Yo</span>' +
      '<span class="persona__rol">Mi configuración</span>' +
      '</button>';

    var actual = activa ? Canillita.personas.get(activa) : null;

    return '<div class="personas">' +
      '<p class="personas__rotulo">Ver la demo como</p>' +
      '<div class="personas__lista">' + botones + yo + '</div>' +
      (actual
        ? '<p class="personas__nota">' + esc(actual.descripcion) + '</p>'
        : '<p class="personas__nota">Elegí un lector y mirá cómo cambia el diario.</p>') +
      '</div>';
  }

  /**
   * Activa la barra. Al cambiar de lector se recarga la página: es la forma
   * más segura de que todo quede consistente, incluidos el audio y el chat.
   */
  function bindPersonaBar(root) {
    var barra = (root || global.document).querySelector('.personas');
    if (!barra) return;

    barra.addEventListener('click', function (event) {
      var boton = event.target.closest('[data-persona]');
      if (!boton) return;

      var id = boton.dataset.persona;
      if (id) Canillita.personas.aplicar(id);
      else Canillita.personas.limpiar();

      global.location.reload();
    });
  }

  /*
   * Al tocar "Conversá con el diario" se pregunta dónde. Antes llevaba
   * directo al simulador, que es lo menos interesante de los dos caminos:
   * el bot de Telegram funciona de verdad.
   */
  function bindConversarConDiario(root) {
    var enlaces = (root || global.document).querySelectorAll('.secciones__accion');
    Array.prototype.forEach.call(enlaces, function (enlace) {
      enlace.addEventListener('click', function (evento) {
        evento.preventDefault();
        abrirElectorDeCanal(enlace.getAttribute('href'));
      });
    });
  }

  function abrirElectorDeCanal(urlChat) {
    var previo = global.document.querySelector('.canal-elector');
    if (previo) previo.remove();

    var caja = global.document.createElement('div');
    caja.className = 'canal-elector';
    caja.innerHTML =
      '<div class="canal-elector__fondo"></div>' +
      '<div class="canal-elector__panel" role="dialog" aria-label="Dónde conversar">' +
        '<p class="canal-elector__volanta">Conversá con el diario</p>' +
        '<h2 class="canal-elector__titulo">¿Dónde querés hablar?</h2>' +
        '<a class="canal-elector__opcion canal-elector__opcion--fuerte" ' +
          'href="https://t.me/TuCanillitaBot" target="_blank" rel="noopener">' +
          '<span class="canal-elector__nombre">En Telegram</span>' +
          '<span class="canal-elector__detalle">El canal real, funcionando</span>' +
        '</a>' +
        '<a class="canal-elector__opcion" href="' + esc(urlChat) + '">' +
          '<span class="canal-elector__nombre">Acá mismo</span>' +
          '<span class="canal-elector__detalle">Sin salir del navegador</span>' +
        '</a>' +
        '<p class="canal-elector__pronto">Pronto también por WhatsApp, que es ' +
        'donde está la gente del valle. Hoy no lo usamos porque el envío diario ' +
        'exige plantillas pagas y una empresa verificada.</p>' +
        '<button type="button" class="canal-elector__cerrar">Cerrar</button>' +
      '</div>';

    global.document.body.appendChild(caja);
    caja.querySelector('.canal-elector__fondo').addEventListener('click', function () { caja.remove(); });
    caja.querySelector('.canal-elector__cerrar').addEventListener('click', function () { caja.remove(); });
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
    figure: figure,
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
    novedades: novedades,
    esNovedad: esNovedad,
    novedadesBanda: novedadesBanda,
    selloNovedad: selloNovedad,
    bindSimularAusencia: bindSimularAusencia,
    firma: firma,
    programacion: programacion,
    bindProgramacion: bindProgramacion,
    credencialesHilo: credencialesHilo,
    bindConversarConDiario: bindConversarConDiario,
    personaBar: personaBar,
    bindPersonaBar: bindPersonaBar,
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
