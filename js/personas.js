/*
 * personas.js
 * -----------
 * Lectores de ejemplo para mostrar la demo.
 *
 * No son cuentas ni usuarios: son configuraciones de preferencias con nombre.
 * Elegir una es exactamente lo mismo que si esa persona hubiera cargado sus
 * datos a mano. Por eso el efecto es real y no una simulación: cambia el
 * mismo `localStorage` que usa cualquier lector.
 *
 * Existen para responder en veinte segundos la pregunta más difícil de la
 * demo: "¿en qué se diferencia de un diario común?".
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  var PERSONAS = [
    {
      id: 'mauro',
      nombre: 'Mauro',
      rol: 'Vecino de Roca',
      descripcion: 'Cruza la Ruta 22 todos los días y sigue lo que pasa en la ciudad.',
      prefs: {
        name: 'Mauro',
        locality: 'General Roca',
        topics: ['ruta22', 'municipio', 'deportes'],
        following: ['ruta22'],
        format: 'texto_audio',
        audioSeconds: 60,
        speechRate: 1
      }
    },
    {
      id: 'jorge',
      nombre: 'Jorge',
      rol: 'Productor frutícola',
      descripcion: 'Chacra en Cervantes. Escucha las noticias en la camioneta, temprano.',
      prefs: {
        name: 'Jorge',
        locality: 'Cervantes',
        topics: ['fruticultura', 'clima', 'ruta22'],
        following: ['fruticultura', 'clima'],
        format: 'audio',
        audioSeconds: 180,
        speechRate: 1
      }
    },
    {
      id: 'diego',
      nombre: 'Diego',
      rol: 'Hincha',
      descripcion: 'De Cipolletti. Quiere deportes y poco más, en treinta segundos.',
      prefs: {
        name: 'Diego',
        locality: 'Cipolletti',
        topics: ['deportes'],
        following: ['deportes_valle', 'messi'],
        format: 'texto',
        audioSeconds: 30,
        speechRate: 1.15
      }
    }
  ];

  function todas() {
    return PERSONAS.slice();
  }

  function get(id) {
    var encontrada = PERSONAS.filter(function (p) { return p.id === id; });
    return encontrada.length ? encontrada[0] : null;
  }

  /** Cuál está activa, o null si el lector configuró lo suyo. */
  function activa() {
    return Canillita.preferences.get().persona || null;
  }

  /**
   * Aplica una persona: escribe sus preferencias como si las hubiera cargado
   * el propio lector. Devuelve la persona aplicada.
   */
  function aplicar(id) {
    var persona = get(id);
    if (!persona) return null;
    Canillita.preferences.set(Object.assign({ persona: id }, persona.prefs));
    return persona;
  }

  /** Vuelve a una configuración propia, sin persona de ejemplo. */
  function limpiar() {
    Canillita.preferences.set({ persona: null });
  }

  Canillita.personas = {
    todas: todas,
    get: get,
    activa: activa,
    aplicar: aplicar,
    limpiar: limpiar
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.personas;
  }
})(typeof window !== 'undefined' ? window : globalThis);
