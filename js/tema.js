/*
 * tema.js
 * -------
 * Dos identidades para la misma aplicación.
 *
 *   'propio'  Tu Canillita como producto independiente.
 *   'grupo'   Tu Canillita como capa que reúne a los medios del Grupo.
 *
 * No es un rediseño ni una copia de ninguna marca: el ocre, la tipografía y
 * los componentes siguen siendo los del producto. Lo que cambia es un acento
 * —el rojo compartido por las cuatro cabeceras— y la aparición del origen de
 * cada contenido.
 *
 * Todo el color vive en variables CSS. Cambiar de tema es poner un atributo
 * en <html>; no hay una segunda hoja de estilos ni una segunda aplicación.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var CLAVE = 'canillita.tema';

  /*
   * Las cuatro marcas comparten el mismo rojo y el mismo negro; Literal suma
   * un azul. Por eso el tema no necesita conciliar cuatro paletas: alcanza con
   * dos colores.
   */
  var MARCAS = [
    { id: 'lmn',      nombre: 'LM Neuquén',    tipo: 'diario' },
    { id: 'lmc',      nombre: 'LM Cipolletti', tipo: 'diario' },
    { id: 'literal',  nombre: 'Literal',       tipo: 'radio'  },
    { id: 'lu5',      nombre: 'LU5',           tipo: 'radio'  }
  ];

  var TEMAS = {
    propio: {
      id: 'propio',
      etiqueta: '',
      bajada: 'Noticias del valle, todos los días',
      marcas: []
    },
    grupo: {
      id: 'grupo',
      etiqueta: 'Edición Grupo',
      bajada: 'Impulsado por el ecosistema de medios del Grupo',
      marcas: MARCAS
    }
  };

  function leer() {
    try {
      return global.localStorage.getItem(CLAVE) || 'propio';
    } catch (error) {
      return 'propio';
    }
  }

  function guardar(id) {
    try {
      global.localStorage.setItem(CLAVE, id);
    } catch (error) { /* sin almacenamiento, el tema dura la sesión */ }
  }

  var activo = 'propio';

  function actual() {
    return TEMAS[activo] || TEMAS.propio;
  }

  function esGrupo() {
    return activo === 'grupo';
  }

  function marcas() {
    return actual().marcas.slice();
  }

  /** Busca una marca por su nombre, como viene escrito en el contenido. */
  function marca(nombre) {
    var encontrada = MARCAS.filter(function (m) { return m.nombre === nombre; });
    return encontrada.length ? encontrada[0] : null;
  }

  /** Aplica el tema: un atributo en <html> y listo. */
  function aplicar(id) {
    activo = TEMAS[id] ? id : 'propio';
    global.document.documentElement.setAttribute('data-tema', activo);
    guardar(activo);
    return actual();
  }

  function alternar() {
    return aplicar(esGrupo() ? 'propio' : 'grupo');
  }

  /**
   * Decide el tema al cargar la página.
   * `?grupo=1` lo enciende; `?grupo=0` lo apaga. Sin parámetro, se respeta lo
   * último elegido.
   */
  function init() {
    var pedido = Canillita.router && Canillita.router.param('grupo');
    if (pedido === '1') return aplicar('grupo');
    if (pedido === '0') return aplicar('propio');
    return aplicar(leer());
  }

  Canillita.tema = {
    init: init,
    aplicar: aplicar,
    alternar: alternar,
    actual: actual,
    esGrupo: esGrupo,
    marcas: marcas,
    marca: marca
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.tema;
  }
})(typeof window !== 'undefined' ? window : globalThis);
