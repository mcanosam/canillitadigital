/*
 * radio.js
 * --------
 * Dos cosas separadas a propósito:
 *
 *   1. El GUION. Convierte las noticias en un texto para decir en voz alta.
 *      No lee el artículo: lo reescribe con estructura de boletín.
 *   2. El REPRODUCTOR. Envuelve la Web Speech API del navegador.
 *
 * La separación importa porque el guion tiene que existir aunque la voz falle.
 * Si el navegador no tiene síntesis en español, el texto se muestra igual.
 *
 * Web Speech API: gratuita, incluida en el navegador, sin claves ni cuentas.
 * La calidad de la voz depende del sistema operativo del lector.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};

  /* Ritmo de lectura radial en español: unas 2,5 palabras por segundo. */
  var WORDS_PER_SECOND = 2.5;

  /* Prioridad de cada segmento. Si el boletín no entra en la duración
     elegida, se recortan primero los de prioridad más alta. */
  var ESENCIAL = 1;
  var IMPORTANTE = 2;
  var AMPLIACION = 3;

  /* ------------------------------------------------------------- utilidades */

  function countWords(text) {
    return String(text).trim().split(/\s+/).length;
  }

  function seconds(words) {
    return Math.round(words / WORDS_PER_SECOND);
  }

  /** 'Buenas tardes' -> 'buenas tardes' (para encadenar frases) */
  function lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  /** La hora dicha como la diría una persona: 7:05 -> "siete y cinco". */
  var HOURS = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
    'ocho', 'nueve', 'diez', 'once'];

  var UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
    'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
    'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
    'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];

  var TENS = { 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta' };

  /** 44 -> 'cuarenta y cuatro'. Los números se dicen, no se leen. */
  function spokenNumber(value) {
    if (value < 30) return UNITS[value];
    var ten = Math.floor(value / 10) * 10;
    var unit = value % 10;
    return TENS[ten] + (unit ? ' y ' + UNITS[unit] : '');
  }

  /** Franja del día como la nombraría un locutor. */
  function franjaFor(hour) {
    if (hour < 6) return ' de la madrugada';
    if (hour < 12) return ' de la mañana';
    if (hour === 12) return ' del mediodía';
    if (hour < 20) return ' de la tarde';
    return ' de la noche';
  }

  /** Frase completa con la hora: incluye el verbo, porque la una es singular. */
  function spokenTime(date) {
    var hour = date.getHours();
    var minutes = date.getMinutes();
    var esUna = (hour % 12) === 1;
    var base = (esUna ? 'Es la una' : 'Son las ' + HOURS[hour % 12]);
    var franja = franjaFor(hour);
    if (minutes === 0) return base + ' en punto' + franja;
    if (minutes === 15) return base + ' y cuarto' + franja;
    if (minutes === 30) return base + ' y media' + franja;
    return base + ' y ' + spokenNumber(minutes) + franja;
  }


  /* ---------------------------------------------- números dichos en voz */

  var CIENTOS = {
    1: 'ciento', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos',
    5: 'quinientos', 6: 'seiscientos', 7: 'setecientos', 8: 'ochocientos',
    9: 'novecientos'
  };

  var DECENAS = {
    3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta',
    7: 'setenta', 8: 'ochenta', 9: 'noventa'
  };

  /** 2026 -> 'dos mil veintiséis'. Cubre de 0 a 999.999. */
  function numberToWords(value) {
    var n = Math.floor(Math.abs(value));
    if (n === 0) return 'cero';
    if (n === 100) return 'cien';
    if (n < 30) return UNITS[n];
    if (n < 100) {
      var ten = Math.floor(n / 10);
      var unit = n % 10;
      return DECENAS[ten] + (unit ? ' y ' + UNITS[unit] : '');
    }
    if (n < 1000) {
      var hundred = Math.floor(n / 100);
      var rest = n % 100;
      return CIENTOS[hundred] + (rest ? ' ' + numberToWords(rest) : '');
    }
    var thousands = Math.floor(n / 1000);
    var remainder = n % 1000;
    var prefix = thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil';
    return prefix + (remainder ? ' ' + numberToWords(remainder) : '');
  }

  /**
   * Prepara el texto para ser dicho, no leído.
   *
   * Los motores de voz suelen tropezar con cifras grandes, decretos con barra
   * y abreviaturas. Acá se resuelven antes de que lleguen al sintetizador.
   */
  function toSpeech(text) {
    return String(text)
      // Decreto 253/2026 -> "doscientos cincuenta y tres, del año dos mil..."
      .replace(/(\d{1,4})\/(\d{4})/g, function (match, numero, anio) {
        return numberToWords(Number(numero)) + ', del año ' + numberToWords(Number(anio));
      })
      // 2.380 millones / 5.000 toneladas: el punto de miles confunde al motor
      .replace(/(\d{1,3})\.(\d{3})\b/g, function (match, miles, resto) {
        return numberToWords(Number(miles + resto));
      })
      // 20,7 km -> "veinte coma siete kilómetros"
      .replace(/(\d+),(\d+)/g, function (match, entero, decimal) {
        return numberToWords(Number(entero)) + ' coma ' + numberToWords(Number(decimal));
      })
      // Cifras sueltas hasta cinco dígitos
      .replace(/\b(\d{1,5})\b/g, function (match, numero) {
        return numberToWords(Number(numero));
      })
      .replace(/\bkm\b/g, 'kilómetros')
      .replace(/\bRN\b/g, 'ruta nacional')
      // Comillas y símbolos que algunos motores leen en voz alta
      .replace(/[«»""'']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------------------------------------------------------------- guion */

  var SEPARADORES = [
    'Seguimos.',
    'Vamos con la que sigue.',
    'Y ahora, otro tema.'
  ];

  /**
   * Arma el guion completo.
   * @param {Array} stories historias ya filtradas por interés
   * @param {Object} options { name, targetSeconds }
   * @returns {{segments: Array, words: number, seconds: number, trimmed: boolean}}
   */
  function buildScript(stories, options) {
    var opts = options || {};
    // Sin nombre el saludo queda general: es el caso del boletín publicado.
    var name = opts.name || '';
    var now = new Date();
    var render = Canillita.render;
    var segments = [];
    var separadorIndex = 0;

    function push(kind, text, priority) {
      segments.push({
        id: kind + '-' + segments.length,
        kind: kind,
        text: text,
        priority: priority
      });
    }

    /* 1. Identificación. Sin cortina musical: nada con derechos de autor. */
    push('identificacion', 'Tu Canillita Digital, boletín del Alto Valle.', ESENCIAL);

    /* 2 y 3. Saludo, hora y fecha. */
    push('saludo', spokenTime(now) + '. ' +
      render.timeGreeting() + (name ? ', ' + name : '') + '.', ESENCIAL);
    push('fecha', 'Hoy es ' + render.todayLabel() + '.', IMPORTANTE);

    /* 4. Presentación. */
    push('presentacion', 'Estas son las noticias que elegiste para hoy.', IMPORTANTE);

    /* 5 a 10. Las noticias. */
    var noticias = stories.filter(function (story) { return story.topic !== 'deportes'; });
    var deportes = stories.filter(function (story) { return story.topic === 'deportes'; });

    noticias.forEach(function (story, index) {
      if (index > 0) {
        push('separador', SEPARADORES[separadorIndex % SEPARADORES.length], ESENCIAL);
        separadorIndex++;
      }
      // radioHeadline es el titular escrito para decir; el título del diario
      // está pensado para leer y suena raro en voz alta.
      var apertura = index === 0 ? 'Empezamos. ' : '';
      push('titular', story.radioHeadline || (apertura + story.title + '.'), ESENCIAL);
      push('desarrollo', story.radioSummary, IMPORTANTE);
    });

    deportes.forEach(function (story) {
      push('separador', 'Y vamos a los deportes.', ESENCIAL);
      // El titular lleva incorporado el aviso de ficción: es esencial y nunca
      // se recorta, así que el aviso no puede quedar afuera del boletín.
      push('deportes', story.radioHeadline || story.shortSummary, ESENCIAL);
      push('desarrollo', story.radioSummary, IMPORTANTE);
    });

    /* 11. Qué seguir durante el día. */
    var actualidad = Canillita.content.get('ruta22_actualidad');
    if (actualidad && actualidad.pendingQuestions.length) {
      push('seguimiento', 'Durante el día vamos a estar siguiendo esto: ' +
        lowerFirst(actualidad.pendingQuestions[0]), AMPLIACION);
    }

    /* 12 y 13. Invitación y cierre. */
    push('invitacion', 'Si querés profundizar en alguna de estas noticias, preguntame por el chat y te la explico con las fuentes.', AMPLIACION);
    push('cierre', 'Fue Tu Canillita Digital, que sigue la historia con vos. Buen día.', ESENCIAL);

    return fitToDuration(segments, opts.targetSeconds);
  }

  /**
   * Recorta el guion hasta que entre en la duración elegida.
   * Nunca toca los segmentos esenciales: si aun así no entra, se avisa.
   */
  function fitToDuration(segments, targetSeconds) {
    var kept = segments.slice();
    var trimmed = false;

    function total() {
      return seconds(kept.reduce(function (sum, segment) {
        return sum + countWords(segment.text);
      }, 0));
    }

    if (targetSeconds) {
      // Se saca primero el bloque más corto de la prioridad en juego: así se
      // pierde lo mínimo necesario para entrar en la duración pedida.
      [AMPLIACION, IMPORTANTE].forEach(function (priority) {
        while (total() > targetSeconds) {
          var candidato = -1;
          for (var i = 0; i < kept.length; i++) {
            if (kept[i].priority !== priority) continue;
            if (candidato === -1 ||
                countWords(kept[i].text) < countWords(kept[candidato].text)) {
              candidato = i;
            }
          }
          if (candidato === -1) break;   // no queda nada recortable en este nivel
          kept.splice(candidato, 1);
          trimmed = true;
        }
      });
    }

    var words = kept.reduce(function (sum, segment) {
      return sum + countWords(segment.text);
    }, 0);

    var duration = seconds(words);

    return {
      segments: kept,
      words: words,
      seconds: duration,
      trimmed: trimmed,
      // Con pocas noticias no siempre se puede bajar a 30 segundos: en vez de
      // mentir la duración, se avisa.
      overTarget: Boolean(targetSeconds) && duration > targetSeconds
    };
  }

  /** El guion como texto plano, para mostrarlo o copiarlo. */
  function scriptText(script) {
    return script.segments.map(function (segment) {
      return segment.text;
    }).join('\n\n');
  }


  /* --------------------------------------------------------- prosodia */

  /*
   * Un boletín no se dice todo igual. El titular baja un poco la velocidad
   * para que se entienda; el separador cambia de tono para marcar el corte;
   * y después de cada bloque hay una respiración.
   *
   * pause está en milisegundos: es el silencio DESPUÉS de ese bloque.
   */
  var PROSODIA = {
    identificacion: { rate: 0.97, pitch: 0.98, pause: 500 },
    saludo:         { rate: 1.00, pitch: 1.02, pause: 380 },
    fecha:          { rate: 1.02, pitch: 1.00, pause: 320 },
    presentacion:   { rate: 1.00, pitch: 1.00, pause: 450 },
    titular:        { rate: 0.94, pitch: 1.04, pause: 520 },
    desarrollo:     { rate: 1.02, pitch: 1.00, pause: 560 },
    separador:      { rate: 0.95, pitch: 0.96, pause: 620 },
    deportes:       { rate: 0.96, pitch: 1.03, pause: 480 },
    seguimiento:    { rate: 1.00, pitch: 1.00, pause: 420 },
    invitacion:     { rate: 1.02, pitch: 1.00, pause: 380 },
    cierre:         { rate: 0.93, pitch: 0.97, pause: 0 }
  };

  var PROSODIA_DEFECTO = { rate: 1, pitch: 1, pause: 400 };

  function prosodiaDe(kind) {
    return PROSODIA[kind] || PROSODIA_DEFECTO;
  }


  /* ------------------------------------------------- boletín grabado */

  /*
   * El boletín generado por Piper es un archivo de audio publicado en el
   * repositorio. Si existe, se usa: suena igual en todos los dispositivos y
   * es el mismo archivo que después se manda por WhatsApp.
   *
   * La voz del navegador queda como respaldo, no como plan principal.
   */
  var grabado = null;

  function loadRecorded() {
    var base = (Canillita.router && Canillita.router.base()) || '';
    return fetch(base + 'assets/audio/boletin.json')
      .then(function (res) {
        if (!res.ok) throw new Error('sin boletín grabado');
        return res.json();
      })
      .then(function (meta) {
        meta.absoluteUrl = base + meta.url;
        grabado = meta;
        return meta;
      })
      .catch(function () {
        grabado = null;
        return null;
      });
  }

  function recorded() {
    return grabado;
  }

  /** Antigüedad del boletín grabado, en horas. */
  function recordedAgeHours() {
    if (!grabado || !grabado.generatedAt) return null;
    return (Date.now() - new Date(grabado.generatedAt).getTime()) / 3600000;
  }

  /* ----------------------------------------------------------- reproductor */

  function isSupported() {
    return typeof global.speechSynthesis !== 'undefined' &&
      typeof global.SpeechSynthesisUtterance !== 'undefined';
  }

  /** Mejor voz disponible en español, con preferencia rioplatense. */
  function pickVoice() {
    if (!isSupported()) return null;
    var voices = global.speechSynthesis.getVoices() || [];
    var order = ['es-AR', 'es-419', 'es-MX', 'es-US', 'es-ES', 'es'];
    for (var i = 0; i < order.length; i++) {
      var match = voices.filter(function (voice) {
        return voice.lang && voice.lang.toLowerCase().indexOf(order[i].toLowerCase()) === 0;
      });
      if (match.length) return match[0];
    }
    return null;
  }

  /**
   * Parte un segmento en frases cortas.
   * Chrome corta las locuciones largas alrededor de los 15 segundos, así que
   * se habla de a pedazos de menos de 180 caracteres.
   */
  function chunk(text) {
    var sentences = String(text).match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    var chunks = [];
    var current = '';
    sentences.forEach(function (sentence) {
      if ((current + sentence).length > 180 && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    });
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  var player = (function () {
    var state = 'idle';           // idle | playing | paused | ended
    var queue = [];               // { segmentIndex, text }
    var position = 0;
    var handlers = {};
    var voice = null;
    var baseRate = 1.15;   // más ágil que la lectura por defecto
    var pauseTimer = null;
    var audio = null;      // elemento <audio> cuando hay boletín grabado
    var mode = 'speech';   // 'file' | 'speech'

    function emit(name, value) {
      if (typeof handlers[name] === 'function') handlers[name](value);
    }

    function setState(next) {
      state = next;
      emit('onState', next);
    }

    function speakNext() {
      if (position >= queue.length) {
        setState('ended');
        emit('onSegment', -1);
        return;
      }
      var item = queue[position];
      var utterance = new global.SpeechSynthesisUtterance(item.text);
      utterance.lang = (voice && voice.lang) || 'es-AR';
      if (voice) utterance.voice = voice;
      utterance.rate = baseRate * (item.rate || 1);
      utterance.pitch = item.pitch || 1;

      utterance.onstart = function () {
        emit('onSegment', item.segmentIndex);
      };
      utterance.onend = function () {
        if (state !== 'playing') return;   // se detuvo mientras hablaba
        position++;
        // El silencio entre bloques es lo que separa un boletín de una lectura.
        pauseTimer = global.setTimeout(function () {
          if (state === 'playing') speakNext();
        }, item.pause || 0);
      };
      utterance.onerror = function (event) {
        // 'interrupted' y 'canceled' son consecuencia de stop(): no son fallas.
        if (event.error === 'interrupted' || event.error === 'canceled') return;
        setState('ended');
        emit('onError', event.error);
      };

      global.speechSynthesis.speak(utterance);
    }

    /* Reproduce el archivo generado por Piper. */
    function playFile(callbacks) {
      handlers = callbacks || {};
      stop();
      mode = 'file';

      // 'el' es la referencia local: los eventos que llegan tarde, después de
      // un stop(), se descartan comparando contra el elemento actual.
      var el = new global.Audio(grabado.absoluteUrl);
      audio = el;
      // El archivo se generó a una velocidad conocida; el control del lector
      // ajusta sobre esa base.
      el.playbackRate = baseRate / (grabado.baseRate || 1);

      el.addEventListener('timeupdate', function () {
        if (audio !== el) return;
        var actual = -1;
        (grabado.marks || []).forEach(function (mark) {
          if (el.currentTime >= mark.start) actual = mark.segment;
        });
        emit('onSegment', actual);
      });
      el.addEventListener('ended', function () {
        if (audio !== el) return;
        setState('ended');
        emit('onSegment', -1);
      });
      el.addEventListener('error', function () {
        if (audio !== el) return;
        setState('ended');
        emit('onError', 'No se pudo cargar el audio');
      });

      setState('playing');
      var promesa = el.play();
      if (promesa && promesa.catch) {
        promesa.catch(function () {
          setState('idle');
          emit('onError', 'El navegador bloqueó la reproducción');
        });
      }
      return true;
    }

    function play(script, callbacks) {
      // Primero el archivo grabado; la voz del navegador es el respaldo.
      if (grabado) return playFile(callbacks);
      mode = 'speech';
      if (!isSupported()) {
        handlers = callbacks || {};
        setState('unsupported');
        return false;
      }
      handlers = callbacks || {};
      stop();

      voice = pickVoice();
      emit('onVoice', voice);

      queue = [];
      script.segments.forEach(function (segment, index) {
        var perfil = prosodiaDe(segment.kind);
        var trozos = chunk(segment.text);
        trozos.forEach(function (text, posicion) {
          queue.push({
            segmentIndex: index,
            text: toSpeech(text),
            rate: perfil.rate,
            pitch: perfil.pitch,
            // La pausa larga va solo al final del bloque; entre frases del
            // mismo bloque alcanza con una respiración corta.
            pause: posicion === trozos.length - 1 ? perfil.pause : 140
          });
        });
      });
      position = 0;
      setState('playing');
      speakNext();
      return true;
    }

    function pause() {
      if (state !== 'playing') return;
      if (mode === 'file') audio.pause();
      else global.speechSynthesis.pause();
      setState('paused');
    }

    function resume() {
      if (state !== 'paused') return;
      if (mode === 'file') audio.play();
      else global.speechSynthesis.resume();
      setState('playing');
    }

    function stop() {
      var wasActive = state === 'playing' || state === 'paused';
      state = 'idle';
      global.clearTimeout(pauseTimer);

      if (audio) {
        audio.pause();
        audio.src = '';
        audio = null;
      }
      if (!isSupported()) {
        if (wasActive) { emit('onSegment', -1); emit('onState', 'idle'); }
        return;
      }
      global.speechSynthesis.cancel();
      position = 0;
      queue = [];
      if (wasActive) {
        emit('onSegment', -1);
        emit('onState', 'idle');
      }
    }

    function toggle(script, callbacks) {
      if (state === 'playing') return pause();
      if (state === 'paused') return resume();
      return play(script, callbacks);
    }

    function current() {
      return state;
    }

    /** Velocidad base del boletín. Cada bloque la ajusta con su prosodia. */
    function setRate(value) {
      baseRate = Math.min(2, Math.max(0.6, Number(value) || 1));
      if (audio && grabado) {
        audio.playbackRate = baseRate / (grabado.baseRate || 1);
      }
      return baseRate;
    }

    function rate() {
      return baseRate;
    }

    return {
      play: play,
      pause: pause,
      resume: resume,
      stop: stop,
      toggle: toggle,
      state: current,
      setRate: setRate,
      rate: rate,
      mode: function () { return mode; }
    };
  })();

  /**
   * Las voces se cargan de forma asíncrona en varios navegadores.
   * Este aviso permite que la interfaz se actualice cuando aparecen.
   */
  function onVoicesReady(callback) {
    if (!isSupported()) return;
    if (global.speechSynthesis.getVoices().length) {
      callback(pickVoice());
      return;
    }
    var answered = false;
    function answer() {
      if (answered) return;
      answered = true;
      callback(pickVoice());
    }
    global.speechSynthesis.addEventListener('voiceschanged', function once() {
      global.speechSynthesis.removeEventListener('voiceschanged', once);
      answer();
    });
    // Algunos navegadores nunca emiten el evento: no esperamos para siempre.
    global.setTimeout(answer, 1500);
  }

  Canillita.radio = {
    buildScript: buildScript,
    scriptText: scriptText,
    isSupported: isSupported,
    loadRecorded: loadRecorded,
    recorded: recorded,
    recordedAgeHours: recordedAgeHours,
    prosodiaDe: prosodiaDe,
    toSpeech: toSpeech,
    numberToWords: numberToWords,
    pickVoice: pickVoice,
    onVoicesReady: onVoicesReady,
    player: player
  };
  /*
   * Este módulo corre en dos lados: en el navegador y en Node, donde lo usa
   * tools/build-boletin.js para generar el mismo guion que después dice Piper.
   * Una sola fuente de verdad para el texto del boletín.
   */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.radio;
  }
})(typeof window !== 'undefined' ? window : globalThis);
