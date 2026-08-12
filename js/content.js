/*
 * content.js
 * ----------
 * Única puerta de entrada al contenido periodístico.
 *
 * El contenido vive en archivos JSON dentro de /content. Este módulo:
 *   1. los carga con fetch() cuando la página se sirve por HTTP,
 *   2. si falla (por ejemplo, al abrir el index.html con doble clic, donde el
 *      navegador bloquea fetch por seguridad), usa la copia embebida en
 *      content/content.bundle.js,
 *   3. expone consultas simples para el resto de la aplicación.
 *
 * Ningún otro archivo debe leer los JSON directamente.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  /* Archivos de contenido. Para sumar una historia, agregar la ruta acá
     y regenerar el bundle con: python3 tools/build-bundle.py */
  var FILES = [
    'content/ruta22-actualidad.json',
    'content/ruta22-historia.json',
    'content/messi.json',
    'content/deportes.json'
  ];

  var state = {
    stories: [],
    byId: {},
    loadedFrom: null // 'fetch' | 'bundle'
  };

  /* ---------------------------------------------------------------- carga */

  function indexStories(list) {
    state.stories = list;
    state.byId = {};
    list.forEach(function (story) {
      state.byId[story.id] = story;
    });
    return list;
  }

  function loadFromBundle() {
    var bundle = global.CANILLITA_CONTENT_BUNDLE;
    if (!bundle) {
      throw new Error(
        'No se pudo leer el contenido. Serví el proyecto con un servidor local ' +
        '(python3 -m http.server 8000) o regenerá content/content.bundle.js.'
      );
    }
    state.loadedFrom = 'bundle';
    return indexStories(FILES.map(function (path) {
      return bundle[path];
    }).filter(Boolean));
  }

  /**
   * Carga todas las historias. Devuelve una promesa con el array de historias.
   */
  function load() {
    // El prefijo hace que funcione igual desde la raíz y desde /pages.
    var base = (Canillita.router && Canillita.router.base()) || '';
    return Promise.all(FILES.map(function (path) {
      return fetch(base + path).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + path);
        return res.json();
      });
    })).then(function (list) {
      state.loadedFrom = 'fetch';
      return indexStories(list);
    }).catch(function () {
      // file:// o servidor caído: usamos la copia embebida.
      return loadFromBundle();
    });
  }

  /**
   * Carga las historias desde un array ya leído, sin fetch.
   * Lo usan las herramientas que corren en Node para generar audio.
   */
  function hydrate(list) {
    state.loadedFrom = 'hydrate';
    return indexStories(list);
  }

  /*
   * Un HILO es un tema que se sigue en el tiempo. No coincide con "historia":
   * la Ruta 22 son dos historias (la actualidad y el porqué) y un solo hilo.
   * Seguir, navegar y personalizar se hacen por hilo, no por historia.
   */
  var HILOS = {
    ruta22: {
      label: 'Ruta 22',
      topic: 'ruta22',
      stories: ['ruta22_actualidad', 'ruta22_historia'],
      page: 'pages/ruta22.html'
    },
    messi: {
      label: 'Messi',
      topic: 'deportes',
      stories: ['messi_hilo'],
      page: 'pages/hilo.html?id=messi_hilo'
    },
    deportes_valle: {
      label: 'Deportes del valle',
      topic: 'deportes',
      stories: ['deportes_demo'],
      page: 'pages/hilo.html?id=deportes_demo'
    }
  };

  /** A qué hilo pertenece una historia. */
  function hiloDe(storyId) {
    var encontrado = null;
    Object.keys(HILOS).forEach(function (id) {
      if (HILOS[id].stories.indexOf(storyId) !== -1) encontrado = id;
    });
    return encontrado;
  }

  function hilo(id) {
    return HILOS[id] || null;
  }

  /** Hilos que hoy tienen al menos una historia cargada. */
  function hilos() {
    return Object.keys(HILOS).filter(function (id) {
      return HILOS[id].stories.some(function (storyId) {
        return Boolean(state.byId[storyId]);
      });
    }).map(function (id) {
      return Object.assign({ id: id }, HILOS[id]);
    });
  }

  /* ------------------------------------------------------------ consultas */

  function all() {
    return state.stories.slice();
  }

  function get(id) {
    return state.byId[id] || null;
  }

  /** Historias de un tema: 'ruta22' | 'deportes' */
  function byTopic(topic) {
    return state.stories.filter(function (story) {
      return story.topic === topic;
    });
  }

  /** Orden en el que se arma el resumen diario. */
  function forDailySummary(topics) {
    var selected = topics && topics.length ? topics : ['ruta22', 'deportes'];
    return state.stories.filter(function (story) {
      return selected.indexOf(story.topic) !== -1;
    });
  }

  /** Busca una sección de la Ruta 22 por palabras clave ya normalizadas. */
  function findSection(normalizedText) {
    var historia = get('ruta22_historia');
    if (!historia || !historia.sections) return null;
    var best = null;
    var bestLength = 0;
    historia.sections.forEach(function (section) {
      (section.keywords || []).forEach(function (keyword) {
        if (normalizedText.indexOf(keyword) !== -1 && keyword.length > bestLength) {
          best = section;
          bestLength = keyword.length;
        }
      });
    });
    return best;
  }

  /** Devuelve todas las secciones con su estado. */
  function sections() {
    var historia = get('ruta22_historia');
    return historia ? historia.sections.slice() : [];
  }

  /** Busca la ficha de una fuente dentro de una historia. */
  function sourceById(story, sourceId) {
    if (!story || !story.sources) return null;
    var found = story.sources.filter(function (source) {
      return source.id === sourceId;
    });
    return found.length ? found[0] : null;
  }

  /** Resuelve una lista de ids de fuente a objetos fuente. */
  function sourcesFor(story, ids) {
    return (ids || []).map(function (id) {
      return sourceById(story, id);
    }).filter(Boolean);
  }

  function loadedFrom() {
    return state.loadedFrom;
  }

  Canillita.content = {
    load: load,
    hydrate: hydrate,
    hiloDe: hiloDe,
    hilo: hilo,
    hilos: hilos,
    all: all,
    get: get,
    byTopic: byTopic,
    forDailySummary: forDailySummary,
    findSection: findSection,
    sections: sections,
    sourceById: sourceById,
    sourcesFor: sourcesFor,
    loadedFrom: loadedFrom
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.content;
  }
})(typeof window !== 'undefined' ? window : globalThis);
