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
  var PROXIMAMENTE = ['Policiales', 'Cultura'];

  /* 'mia' filtra por los temas elegidos; 'todo' muestra lo publicado. */
  var vista = 'mia';

  /* Qué se movió desde la última visita. Se calcula una vez por carga. */
  var resumenNovedades = null;

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

      // Al tocar los temas la configuración pasa a ser propia
      Canillita.preferences.set({ topics: elegidos, persona: null });
      pintarPersonas();
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

  /*
   * Por qué esta nota está en tu portada. Es la línea que convierte el filtro
   * en algo visible: sin ella, la personalización pasa desapercibida.
   * Solo aparece en "Mi edición": en "Todo" no hay criterio que explicar.
   */
  function porQue(story) {
    if (vista === 'todo') return '';
    var hiloId = Canillita.content.hiloDe(story.id);
    var etiquetas = Canillita.preferences.TOPIC_LABELS;

    var razon = Canillita.preferences.isFollowing(hiloId)
      ? 'Porque seguís ' + Canillita.content.hilo(hiloId).label
      : 'Porque elegiste ' + (etiquetas[story.topic] || story.topic);

    return '<p class="porque">' + R.esc(razon) + '</p>';
  }

  function tarjeta(story, principal) {
    var audioId = R.audioIdForStory(story.id);
    var enlace = R.hiloUrl(Canillita.content.hiloDe(story.id));

    /*
     * La principal lleva foto grande, bajada y entrada con capitular.
     * Las secundarias, foto chica y título: si todas pesan igual, no hay
     * portada, hay una lista.
     */
    if (principal) {
      return '<article class="portada-nota portada-nota--principal' +
        (R.esNovedad(story, resumenNovedades) ? ' es-novedad' : '') + '">' +
        R.figure(story, 'principal') +
        '<p class="nota__eyebrow">' + R.selloNovedad(story, resumenNovedades) +
          R.esc(story.category) + '</p>' +
        '<h2 class="portada-nota__titulo"><a href="' + enlace + '">' +
          R.esc(story.title) + '</a></h2>' +
        '<p class="nota__bajada">' + R.esc(story.subtitle) + '</p>' +
        R.fictionBanner(story) +
        '<p class="portada-nota__entrada">' + R.esc(story.shortSummary) + '</p>' +
        '<p class="nota__lectura">' + R.esc(story.readingTime) + ' min · ' +
          R.esc(R.longDate(story.lastUpdated)) + '</p>' +
        R.answerPlayer(audioId, 'Escuchar') +
        R.credencialesHilo(story) +
        porQue(story) +
        '</article>';
    }

    return '<article class="portada-nota' +
      (R.esNovedad(story, resumenNovedades) ? ' es-novedad' : '') + '">' +
      '<div class="portada-nota__fila">' +
        R.figure(story, 'secundaria') +
        '<div class="portada-nota__texto">' +
          '<p class="nota__eyebrow">' + R.selloNovedad(story, resumenNovedades) +
            R.esc(story.category) + '</p>' +
          '<h2 class="portada-nota__titulo"><a href="' + enlace + '">' +
            R.esc(story.title) + '</a></h2>' +
          '<p class="nota__bajada">' + R.esc(story.subtitle) + '</p>' +
          R.fictionBanner(story) +
          '<p class="nota__lectura">' + R.esc(story.readingTime) + ' min · ' +
            R.esc(R.longDate(story.lastUpdated)) + '</p>' +
        '</div>' +
      '</div>' +
      R.answerPlayer(audioId, 'Escuchar') +
      porQue(story) +
      '</article>';
  }

  function pintarPortada() {
    var elegidos = Canillita.preferences.get().topics;
    var historias;

    if (vista === 'todo') {
      historias = Canillita.content.all();
    } else {
      historias = elegidos.length
        ? Canillita.content.forDailySummary(elegidos)
        : Canillita.content.all();
    }

    if (!historias.length) {
      doc.getElementById('portada').innerHTML =
        '<p class="vacio">No hay historias para los temas elegidos. ' +
        'Sumá alguno arriba.</p>';
      return;
    }

    var total = Canillita.content.all().length;
    var recuento = '';

    if (vista === 'mia' && historias.length < total) {
      // El número sale del contenido cargado: si algún día miente, se nota
      recuento = '<p class="recuento">De las <strong>' + total +
        '</strong> historias publicadas, estas <strong>' + historias.length +
        '</strong> son las tuyas.</p>';
    }

    /* La banda es sobre lo tuyo: en "Todo" no hay criterio personal que aplicar */
    var banda = vista === 'mia' ? R.novedadesBanda(resumenNovedades) : '';

    doc.getElementById('portada').innerHTML = banda + recuento + historias.map(function (story, i) {
      return tarjeta(story, i === 0);
    }).join('');

    // Los botones se recrean con cada repintado, así que se reconectan acá
    R.bindAnswerPlayers(doc.getElementById('portada'));
    R.bindSimularAusencia(doc.getElementById('portada'));
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

  /* La franja de temas solo tiene sentido mirando "Mi edición" */
  function activarVistas() {
    var contenedor = doc.querySelector('.vistas');
    contenedor.addEventListener('click', function (event) {
      var boton = event.target.closest('[data-vista]');
      if (!boton) return;

      vista = boton.dataset.vista;
      Array.prototype.forEach.call(contenedor.querySelectorAll('[data-vista]'), function (otro) {
        otro.classList.toggle('is-activa', otro === boton);
      });

      doc.getElementById('franja-temas').hidden = (vista === 'todo');
      pintarPortada();
    });
  }

  function pintarPersonas() {
    var caja = doc.getElementById('personas');
    if (!caja) return;
    caja.innerHTML = R.personaBar() +
      (Canillita.recorrido ? Canillita.recorrido.botonRecorrido() : '');
    R.bindPersonaBar(caja);
    if (Canillita.recorrido) Canillita.recorrido.bindBoton(caja);
  }

  function pintarCabecera() {
    doc.getElementById('secciones').innerHTML = R.seccionesNav('portada');
    R.bindConversarConDiario(doc.getElementById('secciones'));
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
      // marcarVisita() devuelve la visita anterior y adelanta el reloj
      resumenNovedades = R.novedades(Canillita.preferences.marcarVisita());

      pintarCabecera();
      pintarPersonas();
      pintarTemas();
      activarTemas();
      activarVistas();
      pintarPortada();
      pintarBoletin();

      /* El recorrido arranca cuando la portada ya está dibujada: si no, los
         pasos apuntarían a elementos que todavía no existen. */
      if (Canillita.recorrido) Canillita.recorrido.init();
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
