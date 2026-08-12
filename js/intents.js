/*
 * intents.js
 * ----------
 * Motor conversacional por reglas. NO es un modelo de lenguaje: compara el
 * texto del usuario contra listas de frases y elige la coincidencia más larga.
 *
 * Ventajas: funciona sin conexión, sin API paga y es 100% auditable.
 * Límites: no entiende frases que no fueron previstas. Cuando no encuentra
 * nada, devuelve la intención 'unknown' y el agente lo dice explícitamente.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  /**
   * Normaliza texto: minúsculas, sin acentos, sin signos, espacios simples.
   * "¿Por qué se frenó la Ruta 22?" -> "por que se freno la ruta 22"
   */
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // quita acentos
      .replace(/[^a-z0-9\s]/g, ' ')      // quita signos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Opciones del menú principal, accesibles por número. */
  var MENU = {
    '1': 'daily_summary',
    '2': 'listen_summary',
    '3': 'route22_history',
    '4': 'sports',
    '5': 'preferences'
  };

  /*
   * Tabla de intenciones. El orden no importa: gana la frase más larga que
   * aparezca en el mensaje del usuario.
   */
  var INTENTS = {
    greeting: [
      'hola', 'holis', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes',
      'buenas noches', 'que tal', 'como andas', 'como va', 'empezar', 'start'
    ],
    help: [
      'ayuda', 'menu', 'opciones', 'que podes hacer', 'que sabes hacer',
      'que puedo preguntar', 'volver al menu', 'inicio'
    ],
    daily_summary: [
      'mi resumen de hoy', 'resumen de hoy', 'resumen', 'noticias de hoy',
      'que paso hoy', 'novedades', 'ponete al dia', 'contame las noticias',
      'que hay de nuevo'
    ],
    listen_summary: [
      'escuchar', 'escuchar resumen', 'escuchar las noticias', 'audio',
      'boletin', 'radio', 'leemelo', 'lee las noticias', 'quiero escuchar'
    ],
    open_html: [
      'ver edicion', 'ver edicion completa', 'edicion completa', 'edicion visual',
      'abrir la edicion', 'ver en la web', 'ver la pagina', 'version web'
    ],
    /* 'ruta 22' a secas queda acá como red de contención: si el mensaje no
       coincide con nada más específico, al menos entregamos la actualidad. */
    route22_current: [
      'ruta 22', 'ruta22', 'la 22', 'ruta 22 actualidad', 'que cambio en la ruta 22',
      'novedades de la ruta 22', 'como viene la ruta 22', 'ultimo de la ruta 22',
      'ruta 22 hoy', 'que paso con la ruta 22', 'resumime la ruta 22',
      'resumen de la ruta 22', 'contame la ruta 22'
    ],
    route22_history: [
      'ver la historia de la ruta 22', 'historia de la ruta 22', 'historia completa',
      'ruta 22 historia', 'toda la historia', 'antecedentes de la ruta 22',
      'cronologia'
    ],
    route22_reason_stopped: [
      'por que se freno', 'por que se paro', 'por que esta paralizada',
      'por que esta frenada', 'que paso con la obra', 'por que no se termino',
      'por que sigue incompleta', 'por que no avanza'
    ],
    route22_status: [
      'que tramo esta terminado', 'que tramos estan terminados', 'estado por tramo',
      'estado de los tramos', 'que secciones estan listas', 'que falta hacer',
      'como esta cada tramo', 'que esta hecho'
    ],
    route22_province: [
      'rio negro ya se hizo cargo', 'se hizo cargo la provincia', 'traspaso',
      'provincializacion', 'quien administra la ruta', 'la provincia toma la ruta',
      'ya firmaron', 'se firmo el convenio'
    ],
    route22_neutralized: [
      'contratos neutralizados', 'neutralizados', 'neutralizada',
      'que significa neutralizado', 'obras congeladas'
    ],
    route22_toll: [
      'peaje', 'va a haber peaje', 'hay que pagar', 'concesion', 'tarifa'
    ],
    route22_roca: [
      'general roca', 'en roca', 'muralla', 'pasos elevados', 'puentes elevados',
      'autopista elevada', 'partir la ciudad'
    ],
    /* Ojo: "Cipolletti" es club y también ciudad de la Ruta 22. Lo dejamos
       fuera de esta lista para que la pregunta por la ciudad llegue al tramo
       urbano; el club se nombra como "Deportivo Roca" o "el clásico". */
    sports: [
      'ver deportes', 'deportes', 'futbol', 'deportivo roca', 'clasico',
      'liga confluencia', 'liga deportiva', 'como salio', 'resultado', 'partido'
    ],
    /* Messi va antes que 'deportes' por especificidad: gana la frase más larga */
    messi: [
      'messi', 'la pulga', 'hilo de messi', 'carrera de messi',
      'historia de messi', 'lionel messi'
    ],
    messi_final: [
      'final del mundial', 'como salio la final', 'mundial 2026',
      'perdimos la final', 'argentina espana', 'la final con espana'
    ],
    messi_retiro: [
      'messi se retira', 'se retira messi', 'deja la seleccion',
      'sigue en la seleccion', 'ultimo partido de messi', 'retiro de messi'
    ],
    messi_premios: [
      'balones de oro', 'balon de oro', 'cuantos balones', 'premios de messi'
    ],
    sports_next: [
      'cuando juega', 'juega deportivo roca', 'proximo partido', 'proxima fecha',
      'cuando es el proximo partido', 'a que hora juega', 'contra quien juega'
    ],
    preferences: [
      'configurar', 'configurar mis preferencias', 'preferencias', 'mis datos',
      'cambiar mi nombre', 'mis intereses', 'ajustes', 'mi perfil'
    ],
    thanks: [
      'gracias', 'muchas gracias', 'joya', 'genial', 'barbaro', 'perfecto'
    ]
  };

  /**
   * Detecta la intención de un mensaje.
   * @returns {{intent: string, matched: string, normalized: string}}
   */
  function detect(rawText) {
    var text = normalize(rawText);

    // Opción del menú escrita como número suelto ("2").
    if (MENU[text]) {
      return { intent: MENU[text], matched: text, normalized: text };
    }

    var best = { intent: 'unknown', matched: '', normalized: text };

    Object.keys(INTENTS).forEach(function (intentId) {
      INTENTS[intentId].forEach(function (phrase) {
        if (text.indexOf(phrase) !== -1 && phrase.length > best.matched.length) {
          best = { intent: intentId, matched: phrase, normalized: text };
        }
      });
    });

    // Última red antes de 'unknown': ¿nombra un tramo de la ruta?
    if (best.intent === 'unknown' && Canillita.content) {
      var section = Canillita.content.findSection(text);
      if (section) {
        return { intent: 'route22_section', matched: section.id, normalized: text, section: section };
      }
    }

    return best;
  }


  Canillita.intents = {
    normalize: normalize,
    detect: detect,
    table: INTENTS,
    menu: MENU
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.intents;
  }
})(typeof window !== 'undefined' ? window : globalThis);
