/*
 * preferences.js
 * --------------
 * Preferencias del lector, guardadas en localStorage del propio navegador.
 * No se envía nada a ningún servidor: es una demo local.
 *
 * En la Fase 1 se usan sobre todo el nombre, la localidad y los temas.
 * El formato, la duración del audio y el horario quedan definidos acá para
 * que las fases siguientes (edición HTML y boletín de radio) los lean.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  var STORAGE_KEY = 'canillita.prefs.v3';

  var DEFAULTS = {
    name: '',
    locality: '',
    topics: ['ruta22', 'deportes'],
    format: 'texto',        // texto | audio | html | texto_audio | todos
    audioSeconds: 60,       // 30 | 60 | 180 | 300
    /*
     * Multiplicador que elige el lector, NO la velocidad absoluta.
     * 1 = el ritmo natural del boletín grabado.
     */
    speechRate: 1,
    hour: '07:00',
    persona: null,          // lector de ejemplo elegido para la demo
    lastVisit: null,        // ISO de la visita anterior, para marcar novedades
    following: []           // ids de HILOS que el lector eligió seguir
  };

  var TOPIC_LABELS = {
    ruta22: 'Ruta 22',
    municipio: 'Municipio',
    fruticultura: 'Fruticultura',
    clima: 'Clima y rutas',
    deportes: 'Deportes'
  };

  var FORMAT_LABELS = {
    texto: 'Texto',
    audio: 'Audio',
    html: 'Edición visual',
    texto_audio: 'Texto y audio',
    todos: 'Los tres formatos'
  };

  var current = null;

  function read() {
    if (current) return current;
    var stored = null;
    try {
      stored = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      stored = null; // localStorage bloqueado (modo privado, file://, etc.)
    }
    current = Object.assign({}, DEFAULTS, stored || {});
    return current;
  }

  function write(prefs) {
    current = prefs;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      /* Si no se puede guardar, las preferencias viven solo en memoria. */
    }
    return current;
  }

  function get() {
    return Object.assign({}, read());
  }

  function set(patch) {
    return write(Object.assign({}, read(), patch || {}));
  }

  function reset() {
    current = null;
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* nada que hacer */ }
    return get();
  }

  /** ¿Ya cargó al menos el nombre? */
  function isConfigured() {
    return Boolean(read().name);
  }

  /** Nombre para saludar, con alternativa neutra. */
  function displayName() {
    return read().name || 'vecino';
  }

  function topicLabels() {
    return read().topics.map(function (topic) {
      return TOPIC_LABELS[topic] || topic;
    });
  }

  function formatLabel() {
    return FORMAT_LABELS[read().format] || read().format;
  }

  function audioLabel() {
    var seconds = read().audioSeconds;
    if (seconds < 60) return seconds + ' segundos';
    return (seconds / 60) + (seconds === 60 ? ' minuto' : ' minutos');
  }

  var RATE_LABELS = [
    { value: 0.85, label: 'Pausada' },
    { value: 1.00, label: 'Normal' },
    { value: 1.15, label: 'Ágil' },
    { value: 1.30, label: 'Rápida' }
  ];

  function rateLabel() {
    var current = read().speechRate;
    var found = RATE_LABELS.filter(function (option) {
      return Math.abs(option.value - current) < 0.01;
    });
    return found.length ? found[0].label : current + '×';
  }

  /* ------------------------------------------------------ última visita */

  /* Recargar la página no debería borrar las novedades: se considera la misma
     visita si pasó menos de media hora. */
  var MISMA_VISITA_MS = 30 * 60 * 1000;

  /**
   * Devuelve la fecha de la visita anterior y, si corresponde, la actualiza.
   * @returns {Date|null} null en la primera visita.
   */
  function marcarVisita() {
    var guardada = read().lastVisit;
    var ahora = Date.now();

    if (!guardada) {
      set({ lastVisit: new Date(ahora).toISOString() });
      return null;
    }

    var anterior = new Date(guardada);
    if (ahora - anterior.getTime() > MISMA_VISITA_MS) {
      set({ lastVisit: new Date(ahora).toISOString() });
    }
    return anterior;
  }

  /** Retrasa la última visita. Solo lo usa la demo, y lo dice en pantalla. */
  function simularAusencia(dias) {
    var fecha = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    set({ lastVisit: fecha.toISOString() });
    return fecha;
  }

  /* ------------------------------------------------- historias seguidas */

  function isFollowing(storyId) {
    return read().following.indexOf(storyId) !== -1;
  }

  /** Alterna el seguimiento y devuelve el estado nuevo. */
  function toggleFollow(storyId) {
    var following = read().following.slice();
    var index = following.indexOf(storyId);
    if (index === -1) following.push(storyId);
    else following.splice(index, 1);
    set({ following: following });
    return isFollowing(storyId);
  }

  /** Resumen legible, usado en el chat y en la edición HTML. */
  function summaryText() {
    var prefs = read();
    return [
      'Nombre: ' + (prefs.name || 'sin cargar'),
      'Localidad: ' + (prefs.locality || 'sin cargar'),
      'Temas: ' + topicLabels().join(', '),
      'Formato: ' + formatLabel(),
      'Audio: ' + audioLabel() + ' · velocidad ' + rateLabel().toLowerCase(),
      'Horario: ' + prefs.hour
    ].join('\n');
  }

  Canillita.preferences = {
    get: get,
    set: set,
    reset: reset,
    isConfigured: isConfigured,
    displayName: displayName,
    topicLabels: topicLabels,
    formatLabel: formatLabel,
    audioLabel: audioLabel,
    rateLabel: rateLabel,
    RATE_LABELS: RATE_LABELS,
    marcarVisita: marcarVisita,
    simularAusencia: simularAusencia,
    isFollowing: isFollowing,
    toggleFollow: toggleFollow,
    summaryText: summaryText,
    TOPIC_LABELS: TOPIC_LABELS,
    FORMAT_LABELS: FORMAT_LABELS
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.preferences;
  }
})(typeof window !== 'undefined' ? window : globalThis);
