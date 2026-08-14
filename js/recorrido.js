/*
 * recorrido.js
 * ------------
 * Recorrido guiado para quien recibe la demo por un enlace.
 *
 * Se hace SOBRE la portada real, no sobre pantallas aparte: lo que se muestra
 * es el producto, y si mañana cambia algo el recorrido no queda mintiendo.
 *
 * Se activa de dos formas:
 *   - con ?demo=1 en la dirección, para el enlace que se comparte;
 *   - con el botón "Hacer el recorrido", siempre disponible.
 *
 * El paso actual se guarda, porque elegir un lector recarga la página: sin
 * eso, el recorrido se cortaría justo en el segundo paso.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var doc = global.document;

  var CLAVE = 'canillita.recorrido';

  /*
   * Cada paso apunta a algo que ya existe en la página. Si el objetivo no está
   * —por ejemplo, el boletín cuando todavía no se generó el audio— el paso se
   * saltea solo en vez de mostrar un recuadro vacío.
   */
  var PASOS = [
    {
      id: 'bienvenida',
      centrado: true,
      volanta: 'Tu Canillita',
      titulo: '¿Y si el diario supiera qué necesitás saber?',
      texto: 'Las noticias de tu ciudad, armadas para cada lector. ' +
             'Son dos minutos: te muestro cómo funciona.',
      boton: 'Empezar el recorrido'
    },
    {
      id: 'lector',
      objetivo: '.personas',
      titulo: 'Elegí quién sos',
      texto: 'Tres lectores con intereses distintos. Tocá uno y mirá cómo se ' +
             'rearma el diario. No es una simulación: cambia de verdad.',
      boton: 'Ya elegí',
      esperaClic: '[data-persona]'
    },
    {
      id: 'seleccion',
      objetivo: '.recuento',
      titulo: 'Tu portada no es la de todos',
      texto: 'De todo lo que se publicó, solo aparece lo que te sirve. ' +
             'Y cada nota dice por qué está ahí.',
      boton: 'Seguir'
    },
    {
      id: 'novedades',
      objetivo: '.novedades',
      titulo: 'Las historias no se cierran',
      texto: 'Un diario común publica la nota de hoy y mañana la reemplaza. ' +
             'Acá cada tema es un hilo que sigue, y te marcamos qué se movió ' +
             'desde la última vez que pasaste.',
      boton: 'Seguir'
    },
    {
      id: 'periodismo',
      objetivo: '.credenciales',
      titulo: 'Acá está el trabajo',
      texto: 'Seguir un tema durante años es reconstruir hitos, verificar cada ' +
             'dato con su fuente y admitir qué todavía no se sabe. Eso no lo ' +
             'hace un algoritmo: lo hace una redacción. Lo que cambia es cómo ' +
             'te llega.',
      boton: 'Seguir'
    },
    {
      id: 'audio',
      objetivo: '#bloque-boletin',
      titulo: 'O escuchalo',
      texto: 'No es la lectura de las notas: es un boletín de radio armado con ' +
             'tu edición, con la duración que elegiste. Podés escucharlo acá o ' +
             'recibirlo como nota de voz por Telegram, y más adelante por WhatsApp.',
      boton: 'Seguir'
    },
    {
      id: 'programar',
      objetivo: '.programar',
      titulo: 'Vos decidís cuándo',
      texto: 'A las siete, al mediodía o de noche. El diario te busca a la hora ' +
             'que te sirve, en vez de esperar a que vos te acuerdes de entrar.',
      boton: 'Seguir'
    },
    {
      id: 'preguntar',
      objetivo: '.canal',
      titulo: 'Y preguntale',
      texto: 'Cualquier duda sobre una noticia se la preguntás al diario, y te ' +
             'responde con la fecha del dato y la fuente. Hoy por Telegram; ' +
             'más adelante, por WhatsApp.',
      boton: 'Terminar'
    },
    {
      id: 'cierre',
      centrado: true,
      volanta: 'Eso es todo',
      titulo: 'No es una portada nueva.',
      texto: 'Es el mismo periodismo, con una edición distinta para cada lector. ' +
             'Texto, audio o conversación, según cómo y cuándo quiera leerlo.',
      boton: 'Explorar por mi cuenta'
    }
  ];

  /* La numeración se calcula: agregar o sacar un paso no obliga a renumerar */
  var NUMERADOS = PASOS.filter(function (paso) { return !paso.centrado; });

  function volantaDe(paso) {
    if (paso.volanta) return paso.volanta;
    var n = NUMERADOS.indexOf(paso) + 1;
    return 'Paso ' + n + ' de ' + NUMERADOS.length;
  }

  /* ------------------------------------------------------------- estado */

  function leerPaso() {
    try {
      var guardado = global.localStorage.getItem(CLAVE);
      return guardado === null ? null : Number(guardado);
    } catch (error) {
      return null;
    }
  }

  function guardarPaso(indice) {
    try {
      if (indice === null) global.localStorage.removeItem(CLAVE);
      else global.localStorage.setItem(CLAVE, String(indice));
    } catch (error) { /* sin almacenamiento, el recorrido igual funciona */ }
  }

  var indiceActual = 0;
  var capa = null;
  var enfocado = null;

  /* ------------------------------------------------------------ pintado */

  function esc(texto) {
    return Canillita.render ? Canillita.render.esc(texto) : String(texto);
  }

  function crearCapa() {
    capa = doc.createElement('div');
    capa.className = 'recorrido';
    capa.innerHTML =
      '<div class="recorrido__fondo"></div>' +
      '<div class="recorrido__panel" role="dialog" aria-live="polite">' +
        '<p class="recorrido__volanta"></p>' +
        '<h2 class="recorrido__titulo"></h2>' +
        '<p class="recorrido__texto"></p>' +
        '<div class="recorrido__acciones">' +
          '<button type="button" class="recorrido__seguir"></button>' +
          '<button type="button" class="recorrido__salir">Salir</button>' +
        '</div>' +
      '</div>';
    doc.body.appendChild(capa);

    capa.querySelector('.recorrido__seguir').addEventListener('click', siguiente);
    capa.querySelector('.recorrido__salir').addEventListener('click', terminar);
    capa.querySelector('.recorrido__fondo').addEventListener('click', terminar);
  }

  function limpiarFoco() {
    if (enfocado) {
      enfocado.classList.remove('recorrido-foco');
      enfocado = null;
    }
  }

  function pintar(indice) {
    var paso = PASOS[indice];
    if (!paso) return terminar();

    /*
     * Si el objetivo no está o está oculto, el paso no tiene sentido: pasa a
     * la siguiente. Es el caso del boletín cuando todavía no se generó el
     * audio: el bloque existe en el HTML pero no se muestra.
     */
    var objetivo = paso.objetivo ? doc.querySelector(paso.objetivo) : null;
    if (paso.objetivo && (!objetivo || objetivo.offsetParent === null)) {
      return pintar(indice + 1);
    }

    indiceActual = indice;
    guardarPaso(indice);
    limpiarFoco();

    capa.querySelector('.recorrido__volanta').textContent = volantaDe(paso);
    capa.querySelector('.recorrido__titulo').textContent = paso.titulo;
    capa.querySelector('.recorrido__texto').textContent = paso.texto;
    capa.querySelector('.recorrido__seguir').textContent = paso.boton;
    capa.classList.toggle('recorrido--centrado', Boolean(paso.centrado));

    if (objetivo) {
      enfocado = objetivo;
      objetivo.classList.add('recorrido-foco');
      objetivo.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    } else {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function siguiente() {
    pintar(indiceActual + 1);
  }

  function terminar() {
    limpiarFoco();
    guardarPaso(null);
    if (capa) {
      capa.remove();
      capa = null;
    }
    doc.body.classList.remove('recorrido-activo');

    /* Se saca ?demo=1 para que recargar no vuelva a arrancar el recorrido */
    if (global.history && global.history.replaceState) {
      global.history.replaceState({}, '', global.location.pathname);
    }
  }

  /* ---------------------------------------------------------- arranque */

  /*
   * Elegir un lector recarga la página. Se anota el paso siguiente ANTES de
   * que eso pase, usando la fase de captura para llegar primero.
   */
  function seguirClicDeLector() {
    doc.addEventListener('click', function (evento) {
      if (!capa) return;
      var paso = PASOS[indiceActual];
      if (!paso || !paso.esperaClic) return;
      if (!evento.target.closest(paso.esperaClic)) return;
      guardarPaso(indiceActual + 1);
    }, true);
  }

  function arrancar(desde) {
    if (capa) return;
    doc.body.classList.add('recorrido-activo');
    crearCapa();
    pintar(typeof desde === 'number' ? desde : 0);
  }

  /** Botón para hacer el recorrido cuando uno quiera. */
  function botonRecorrido() {
    return '<button type="button" class="btn-recorrido" data-recorrido>' +
      'Hacer el recorrido guiado</button>';
  }

  function bindBoton(root) {
    var boton = (root || doc).querySelector('[data-recorrido]');
    if (boton) boton.addEventListener('click', function () { arrancar(0); });
  }

  /**
   * Decide si el recorrido tiene que arrancar solo.
   * Se llama cuando la portada ya terminó de dibujarse.
   */
  function init() {
    seguirClicDeLector();

    var pendiente = leerPaso();
    var pedido = Canillita.router && Canillita.router.param('demo') === '1';

    if (pendiente !== null) arrancar(pendiente);
    else if (pedido) arrancar(0);
  }

  Canillita.recorrido = {
    init: init,
    arrancar: arrancar,
    terminar: terminar,
    botonRecorrido: botonRecorrido,
    bindBoton: bindBoton
  };
})(window);
