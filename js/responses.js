/*
 * responses.js
 * ------------
 * Traduce una intención detectada en una respuesta concreta, usando SOLO el
 * contenido de los archivos JSON. Si el dato no está en el JSON, no se responde.
 *
 * Formato de respuesta:
 *   {
 *     messages: [ { text, sources, dataDate, kind } ],
 *     quickReplies: [ 'texto del botón', ... ]
 *   }
 * Cada botón envía su propio texto al chat, así que siempre pasa por el mismo
 * motor de intenciones que la escritura manual.
 */
(function (global) {
  'use strict';

  var Canillita = global.Canillita = global.Canillita || {};
  var content = Canillita.content;
  var prefs = Canillita.preferences;

  /* ------------------------------------------------------------- utilidades */

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /** '2026-08-02' -> '2 de agosto de 2026' */
  function longDate(isoDate) {
    if (!isoDate) return '';
    var parts = String(isoDate).slice(0, 10).split('-');
    if (parts.length !== 3) return isoDate;
    return Number(parts[2]) + ' de ' + MONTHS[Number(parts[1]) - 1] + ' de ' + parts[0];
  }

  function todayLabel() {
    var now = new Date();
    var days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return days[now.getDay()] + ' ' + now.getDate() + ' de ' + MONTHS[now.getMonth()];
  }

  function clockLabel() {
    var now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  /** Saludo acorde a la hora. La definición vive en render.js, una sola vez. */
  function timeGreeting() {
    return Canillita.render.timeGreeting();
  }

  function message(text, options) {
    return Object.assign({ text: text, kind: 'text' }, options || {});
  }

  /*
   * audioId enlaza la respuesta con su clip pregrabado por Piper, si existe.
   * Los ids son los mismos que enumera tools/build-respuestas.js.
   */
  function reply(messages, quickReplies, audioId) {
    return {
      messages: Array.isArray(messages) ? messages : [messages],
      quickReplies: quickReplies || [],
      audioId: audioId || null
    };
  }

  /* Botones que aparecen casi siempre al final de una respuesta. */
  var BASE_REPLIES = ['Mi resumen de hoy', 'Ver deportes', 'Menú'];

  /* ------------------------------------------------------------- respuestas */

  function menuText() {
    return [
      '¿Qué querés recibir?',
      '',
      '1️⃣ Mi resumen de hoy',
      '2️⃣ Escuchar las noticias',
      '3️⃣ Ver la historia de la Ruta 22',
      '4️⃣ Ver deportes',
      '5️⃣ Configurar mis preferencias',
      '',
      'Podés tocar un botón, escribir el número o preguntarme directamente.'
    ].join('\n');
  }

  var MENU_REPLIES = [
    'Mi resumen de hoy',
    'Escuchar las noticias',
    'Ver la historia de la Ruta 22',
    'Ver deportes',
    'Configurar mis preferencias'
  ];

  function greeting() {
    var name = prefs.isConfigured() ? ', ' + prefs.get().name : '';
    return reply([
      message('¡' + timeGreeting() + name + '! Soy Tu Canillita Digital.\n\nPuedo contarte las noticias locales de manera breve, leértelas como un programa de radio o prepararte una edición visual.'),
      message(menuText())
    ], MENU_REPLIES);
  }

  function help() {
    return reply(message(menuText()), MENU_REPLIES);
  }

  function dailySummary() {
    var stories = content.forDailySummary(prefs.get().topics);
    if (!stories.length) {
      return reply(message('Todavía no tenés temas elegidos. Escribí “configurar” y lo resolvemos en un minuto.'), MENU_REPLIES);
    }

    var header = '📰 *TU RESUMEN DE HOY*\n' + todayLabel() + ' · ' + clockLabel() +
      (prefs.get().locality ? ' · ' + prefs.get().locality : '');

    var body = stories.map(function (story) {
      return story.whatsappSummary;
    }).join('\n\n───\n\n');

    return reply([
      message(header + '\n\n' + body),
      message('Podés elegir:\n\n🎧 Escuchar resumen\n🌐 Ver edición completa\n💬 Preguntar sobre una noticia', {
        links: [{ label: 'Abrir mi edición', href: Canillita.router.editionUrl() }]
      })
    ], ['Escuchar resumen', 'Ver edición completa', '¿Por qué se frenó la Ruta 22?']);
  }

  function listenSummary() {
    var settings = prefs.get();   // 'prefs' es el módulo; 'settings', los datos
    var stories = content.forDailySummary(settings.topics);
    var script = Canillita.radio.buildScript(stories, {
      name: settings.name,
      targetSeconds: settings.audioSeconds
    });

    /*
     * Si existe el boletín grabado del día, es ESE el que se reproduce.
     * Entonces el guion que se muestra tiene que ser el suyo, no el que
     * armamos recién con la duración elegida: si no, la voz sigue hablando
     * después de que se terminó el texto en pantalla.
     */
    var grabado = Canillita.radio.recorded();
    var intro;

    if (grabado && grabado.segments && grabado.segments.length) {
      script = {
        segments: grabado.segments,
        seconds: Math.round(grabado.duration),
        trimmed: false
      };
      intro = '🎧 Boletín del día, con voz ' + grabado.voice + ': ' +
        script.seconds + ' segundos.';
    } else {
      intro = '🎧 Boletín listo: ' + script.seconds + ' segundos de lectura.';
      if (script.trimmed) {
        intro += '\nLo ajusté a los ' + prefs.audioLabel() +
          ' que elegiste, así que va la versión corta.';
      }
    }

    return reply([
      message(intro),
      message(Canillita.radio.scriptText(script), {
        kind: 'audio',
        script: script,
        links: [{ label: 'Escucharlo en mi edición', href: Canillita.router.editionUrl() }]
      })
    ], ['Ver edición completa', 'Mi resumen de hoy', 'Menú']);
  }

  function openHtml() {
    var prefs = Canillita.preferences.get();
    var saludo = prefs.name
      ? 'Tu edición está lista, ' + prefs.name + '.'
      : 'Tu edición está lista.';
    return reply(message(
      '🌐 ' + saludo + '\n\n' +
      'Ahí vas a encontrar las tres noticias con su resumen y el texto completo, el guion del boletín, la cronología de la Ruta 22 y el estado de cada tramo.',
      {
        links: [
          { label: 'Abrir mi edición', href: Canillita.router.editionUrl() },
          { label: 'Ver la historia viva de la Ruta 22', href: Canillita.router.route22Url() }
        ]
      }
    ), ['Mi resumen de hoy', 'Configurar mis preferencias', 'Menú']);
  }

  function route22Current() {
    var story = content.get('ruta22_actualidad');
    var facts = story.confirmedFacts.slice(0, 4).map(function (item) {
      return '✔️ ' + item.fact + ' _(' + longDate(item.date) + ')_';
    }).join('\n');
    var pending = story.pendingQuestions.slice(0, 3).map(function (item) {
      return '❓ ' + item;
    }).join('\n');

    return reply([
      message('🛣️ *' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary),
      message('*Qué sabemos*\n' + facts + '\n\n*Qué falta definir*\n' + pending, {
        sources: content.sourcesFor(story, ['anroca_demora', 'anroca_neutralizadas', 'rionegro_decreto253']),
        dataDate: story.eventDate
      })
    ], ['¿Por qué se frenó la Ruta 22?', '¿Va a haber peaje?', 'Ver la historia de la Ruta 22'], 'ruta22-actualidad');
  }

  function route22History() {
    var story = content.get('ruta22_historia');
    var sections = content.sections().map(function (section) {
      return statusIcon(section.status) + ' *' + section.name + '* (' + section.from + ' → ' + section.to + '): ' + section.statusLabel;
    }).join('\n');

    return reply([
      message('🛣️ *' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary),
      message('*Estado por tramo*\n' + sections, {
        sources: content.sourcesFor(story, ['argentina_obras', 'rionegro_27km', 'mejorinformado_tramos']),
        dataDate: story.lastUpdated
      }),
      message('Preguntame por cualquier tramo: “sección 3”, “Allen”, “Cipolletti”, “Cervantes”. O abrí la historia completa, con la cronología y las fuentes.', {
        links: [{ label: 'Abrir la historia viva', href: Canillita.router.route22Url() }]
      })
    ], ['¿Qué pasó en General Roca?', '¿Qué tramo está terminado?', 'Ver edición completa'], 'ruta22-historia');
  }

  function statusIcon(status) {
    if (status === 'done') return '🟢';
    if (status === 'partial') return '🟡';
    return '🔴';
  }

  function route22ReasonStopped() {
    var story = content.get('ruta22_historia');
    var actualidad = content.get('ruta22_actualidad');

    return reply([
      message(
        'La obra no se frenó por una sola razón, sino por tres que se encadenaron:\n\n' +
        '1️⃣ *El diseño.* El proyecto original planteaba una autopista elevada. En General Roca se rechazó porque funcionaba como una muralla que partía la ciudad en dos. Hubo audiencia pública y un amparo judicial municipal en 2016.\n\n' +
        '2️⃣ *El reemplazo que no llegó a obra.* En mayo de 2021 Vialidad Nacional, Roca y Cipolletti firmaron actas para hacer una avenida urbana a nivel, con semáforos y sin cruces elevados. El acuerdo se firmó, la obra no arrancó.\n\n' +
        '3️⃣ *Los contratos congelados.* Hoy las obras están “neutralizadas”: el contrato sigue vigente pero los trabajos están parados. Nadie trabaja y nadie más puede entrar a trabajar.',
        {
          sources: content.sourcesFor(story, ['diarioneuquino_paralizada', 'rionegro_actas'])
            .concat(content.sourcesFor(actualidad, ['anroca_neutralizadas'])),
          dataDate: '2026-07-14'
        }
      )
    ], ['¿Qué pasó en General Roca?', '¿Qué tramo está terminado?', '¿Río Negro ya se hizo cargo?'], 'ruta22-por-que');
  }

  function route22Status() {
    var story = content.get('ruta22_historia');
    var done = [];
    var pendingList = [];
    content.sections().forEach(function (section) {
      var line = '• *' + section.name + '* — ' + section.from + ' → ' + section.to +
        (section.lengthKm ? ' (' + String(section.lengthKm).replace('.', ',') + ' km)' : '') +
        '\n  ' + section.statusLabel;
      if (section.status === 'blocked') pendingList.push(line);
      else done.push(line);
    });

    return reply([
      message('🟢 *Habilitado o parcialmente habilitado*\n' + done.join('\n')),
      message('🔴 *Sin ejecutar*\n' + pendingList.join('\n') +
        '\n\nOjo con una diferencia importante: “habilitado al tránsito” no es lo mismo que “obra terminada”. En las secciones abiertas quedaron pendientes colectoras, desagües y garitas.', {
          sources: content.sourcesFor(story, ['rionegro_inauguran', 'mejorinformado_tramos']),
          dataDate: story.lastUpdated
        })
    ], ['¿Qué pasó en General Roca?', 'Sección 4', 'Ver la historia de la Ruta 22'], 'ruta22-tramos');
  }

  function route22Section(section) {
    var story = content.get('ruta22_historia');
    var source = content.sourceById(story, section.sourceId);
    return reply([
      message(
        statusIcon(section.status) + ' *' + section.name + '*\n' +
        section.from + ' → ' + section.to +
        (section.lengthKm ? '\nLongitud: ' + String(section.lengthKm).replace('.', ',') + ' km' : '') +
        '\nEstado: ' + section.statusLabel + '\n\n' + section.detail,
        {
          sources: source ? [source] : [],
          dataDate: story.lastUpdated,
          links: [{
            label: 'Ver este tramo en la historia viva',
            href: Canillita.router.route22Url(section.id)
          }]
        }
      )
    ], ['¿Qué tramo está terminado?', '¿Por qué se frenó la Ruta 22?', 'Menú'], section.id);
  }

  function route22Roca() {
    var section = content.get('ruta22_historia').sections.filter(function (item) {
      return item.id === 'seccion3';
    })[0];
    var story = content.get('ruta22_historia');

    return reply([
      message(
        '📍 *Lo que pasó en General Roca*\n\n' +
        'El proyecto original cruzaba la ciudad con una autopista elevada y pasos a distinto nivel en los accesos. Desde 2012 hubo cuestionamientos: técnicos y vecinos advirtieron que esa traza iba a funcionar como una muralla, cortando la conexión norte-sur.\n\n' +
        'Se propuso una alternativa: dejar la ruta a nivel y elevar solamente los cruces vecinales —San Juan, Mendoza y avenida Roca— con espacio para ciclovía y veredas.\n\n' +
        'En 2016 el municipio presentó un amparo judicial contra lo que en la ciudad se llamó “la muralla de piedra”. La intendenta María Emilia Soria sostuvo después que no se rechazó la ampliación sino el proyecto original, que ignoraba las particularidades urbanas.\n\n' +
        'En mayo de 2021 se firmaron las actas que descartaron los pasos elevados. Desde entonces, el tramo sigue sin ejecutarse.',
        {
          sources: content.sourcesFor(story, ['diarioneuquino_paralizada', 'rionegro_actas', 'rionegro_acuerdo_roca']),
          dataDate: '2025-05-18'
        }
      ),
      message('Estado actual del tramo: ' + section.statusLabel)
    ], ['¿Qué pasa en Cipolletti?', '¿Río Negro ya se hizo cargo?', 'Ver la historia de la Ruta 22'], 'ruta22-roca');
  }

  function route22Province() {
    var story = content.get('ruta22_actualidad');
    return reply([
      message(
        'Todavía no. Está negociado, no firmado.\n\n' +
        '✔️ *Confirmado:* el Decreto 253/2026, del 16 de abril, habilita a nueve provincias —entre ellas Río Negro— a concesionar por peaje tramos de rutas nacionales. Para que sea efectivo hace falta un convenio con Vialidad Nacional.\n\n' +
        '✔️ *Confirmado:* el gobernador Weretilneck planteó formalmente que la Provincia asuma las rutas 22 y 151.\n\n' +
        '⏳ *Sin cerrar:* al 2 de agosto de 2026 el convenio seguía sin firmarse. Las diferencias son la modalidad (uno o dos documentos), las obras inconclusas, los contratos vigentes y la exigencia nacional de aprobar previamente los proyectos.',
        {
          sources: content.sourcesFor(story, ['anroca_demora', 'rionegro_decreto253', 'lmc_weretilneck']),
          dataDate: '2026-08-02'
        }
      )
    ], ['¿Qué son los contratos neutralizados?', '¿Va a haber peaje?', 'Ruta 22 hoy'], 'ruta22-traspaso');
  }

  function route22Neutralized() {
    var story = content.get('ruta22_actualidad');
    return reply([
      message(
        '🧊 *Contrato neutralizado* es una figura administrativa que congela el contrato de obra sin rescindirlo.\n\n' +
        'En la práctica: la obra está parada, pero el vínculo con la empresa sigue vigente. Eso impide que otro organismo entre a trabajar en esa traza.\n\n' +
        'La Provincia relevó cinco contratos en esa situación sobre las rutas 22 y 151. “Es un escándalo que estén durante años neutralizadas”, dijo el ministro de Obras Públicas, Alejandro Echarren. De los 518 kilómetros que abarcan ambas rutas, unos 213 siguen alcanzados por compromisos contractuales.',
        {
          sources: content.sourcesFor(story, ['anroca_neutralizadas', 'anroca_demora']),
          dataDate: '2026-07-14'
        }
      )
    ], ['¿Río Negro ya se hizo cargo?', '¿Va a haber peaje?', 'Menú'], 'ruta22-neutralizados');
  }

  function route22Toll() {
    var story = content.get('ruta22_actualidad');
    return reply([
      message(
        'No hay peaje confirmado, pero está sobre la mesa.\n\n' +
        '✔️ El Decreto 253/2026 autoriza a las provincias a otorgar concesiones por peaje y a cobrarlo para financiar obras, con criterios de “razonabilidad tarifaria”. Cada provincia debe presentar el peaje máximo proyectado en su convenio con Vialidad Nacional.\n\n' +
        '⏳ Todavía no están definidos ni la tarifa, ni la ubicación de las estaciones, ni la fecha. Río Negro adelantó que su estrategia no dependería solo de la recaudación por peaje y que aportaría recursos propios.\n\n' +
        'Cuando haya números oficiales, te los traigo con la fuente.',
        {
          sources: content.sourcesFor(story, ['rionegro_decreto253', 'lmc_concesiones']),
          dataDate: '2026-04-22'
        }
      )
    ], ['¿Río Negro ya se hizo cargo?', 'Ruta 22 hoy', 'Menú'], 'ruta22-peaje');
  }

  function sports() {
    var story = content.get('deportes_demo');
    var match = story.match;
    return reply([
      message(story.fictionNotice),
      message(
        '⚽ *' + story.title + '*\n\n' +
        match.home + ' ' + match.homeScore + ' - ' + match.awayScore + ' ' + match.away +
        '\n' + match.competition + ' · ' + match.round +
        '\n\nGoles: ' + match.scorers.join(' · ') +
        '\n\n' + story.standingsNote,
        { dataDate: story.eventDate }
      ),
      message('📅 Próxima fecha: ' + story.nextMatch.homeAway + ' ante ' + story.nextMatch.opponent + ', ' + story.nextMatch.dateLabel + '.')
    ], ['¿Cuándo juega Deportivo Roca?', 'Mi resumen de hoy', 'Menú'], 'deportes');
  }

  function sportsNext() {
    var story = content.get('deportes_demo');
    var next = story.nextMatch;
    return reply([
      message(
        '📅 Próximo partido (dato ficticio de demostración):\n\n' +
        'Deportivo Roca juega de ' + next.homeAway + ' ante ' + next.opponent + '.\n' +
        next.dateLabel + ' · ' + next.competition,
        { dataDate: story.eventDate }
      ),
      message(story.fictionNotice)
    ], ['Ver deportes', 'Mi resumen de hoy', 'Menú'], 'deportes-proximo');
  }


  /* ------------------------------------------------------------- Messi */

  function messi() {
    var story = content.get('messi_hilo');
    var hitos = story.timeline.slice(-4).map(function (item) {
      return '• *' + item.date.slice(0, 4) + '* · ' + item.title;
    }).join('\n');

    return reply([
      message('⚽ *' + story.title + '*\n_' + story.subtitle + '_\n\n' + story.shortSummary),
      message('*Lo último del hilo*\n' + hitos, {
        sources: content.sourcesFor(story, ['lanacion_final', 'si_regreso']),
        dataDate: story.eventDate,
        links: [{ label: 'Ver el hilo completo', href: Canillita.router.editionUrl() }]
      })
    ], ['¿Messi se retira de la Selección?', '¿Cómo salió la final del Mundial 2026?', 'Ver deportes'], 'messi');
  }

  function messiFinal() {
    var story = content.get('messi_hilo');
    return reply([
      message(
        '🏆 *España 1 - Argentina 0*\nFinal del Mundial 2026 · 19 de julio · MetLife Stadium, Nueva Jersey\n\n' +
        'Terminó 0 a 0 los noventa minutos. A los 93, Enzo Fernández se fue expulsado por doble amarilla. ' +
        'A los 106, ya en el segundo tiempo suplementario, Ferran Torres marcó el único gol.\n\n' +
        'Emiliano Martínez fue la figura del equipo argentino. Messi terminó el torneo con ocho goles y cuatro asistencias, ' +
        'pero sin premios individuales: el mejor jugador fue Rodri y la Bota de Oro quedó para Mbappé.',
        {
          sources: content.sourcesFor(story, ['lanacion_final', 'telemundo_final']),
          dataDate: '2026-07-19'
        }
      )
    ], ['¿Messi se retira de la Selección?', 'Contame el hilo de Messi', 'Menú'], 'messi-final');
  }

  function messiRetiro() {
    var story = content.get('messi_hilo');
    return reply([
      message(
        'No lo dijo, y esa es la respuesta honesta.\n\n' +
        '✔️ *Confirmado:* después de la final se quebró al saludar a la hinchada, y al día siguiente escribió que el dolor era muy grande. No anunció nada sobre la Selección y volvió a Rosario con su familia.\n\n' +
        '✔️ *Confirmado:* tiene contrato con Inter Miami hasta fines de 2028, así que jugar va a seguir jugando.\n\n' +
        '⏳ *Sin definir:* si vuelve a jugar en la Selección. Scaloni, consultado después del partido, dijo que no tenía idea y que la pregunta era para Messi. La continuidad del propio entrenador también quedó en duda.',
        {
          sources: content.sourcesFor(story, ['prensalibre_futuro', 'olympics_retiro', 'si_regreso']),
          dataDate: '2026-07-21'
        }
      )
    ], ['¿Cómo salió la final del Mundial 2026?', 'Contame el hilo de Messi', 'Menú'], 'messi-retiro');
  }

  function messiPremios() {
    var story = content.get('messi_hilo');
    return reply([
      message(
        '🏅 *Ocho Balones de Oro*, más que ningún otro futbolista en la historia.\n\n' +
        '2009, 2010, 2011, 2012, 2015, 2019, 2021 y 2023.\n\n' +
        'Cristiano Ronaldo, su contemporáneo, tiene cinco. Desde 2024 Messi no figura entre los nominados: ese año ganó Rodri y en 2025, Dembélé.',
        {
          sources: content.sourcesFor(story, ['lanacion_balones']),
          dataDate: '2025-09-22'
        }
      )
    ], ['Contame el hilo de Messi', '¿Messi se retira de la Selección?', 'Menú']);
  }

  function thanks() {
    return reply(message('De nada. Acá estoy cuando quieras seguir alguna historia.'), BASE_REPLIES);
  }

  function unknown() {
    return reply([
      message('No tengo información validada sobre ese tema dentro de esta demostración. Por ahora puedo responder sobre la Ruta 22 y la noticia deportiva disponible.'),
      message('Probá con alguna de estas:')
    ], ['¿Por qué se frenó la Ruta 22?', '¿Qué tramo está terminado?', 'Ver deportes', 'Menú'], 'fuera-de-alcance');
  }

  /* ------------------------------------------------- configuración guiada */

  /*
   * Flujo de preferencias: una pregunta por vez. El chat consulta si hay un
   * paso pendiente antes de pasar el mensaje al motor de intenciones.
   */
  var flowStep = null;

  var FLOW = {
    name: {
      question: '¿Cómo querés que te llame?',
      quickReplies: [],
      save: function (text) { prefs.set({ name: text.trim().slice(0, 40) }); },
      next: 'locality'
    },
    locality: {
      question: '¿En qué localidad vivís?',
      quickReplies: ['General Roca', 'Cipolletti', 'Allen', 'Villa Regina'],
      save: function (text) { prefs.set({ locality: text.trim().slice(0, 40) }); },
      next: 'topics'
    },
    topics: {
      question: '¿Qué temas te interesan?',
      quickReplies: ['Ruta 22 y deportes', 'Solo Ruta 22', 'Solo deportes', 'Todo'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var topics = ['ruta22', 'deportes'];
        if (normalized.indexOf('solo ruta') !== -1) topics = ['ruta22'];
        else if (normalized.indexOf('solo deporte') !== -1) topics = ['deportes'];
        else if (normalized.indexOf('todo') !== -1) topics = ['ruta22', 'regionales', 'deportes'];
        prefs.set({ topics: topics });
      },
      next: 'format'
    },
    format: {
      question: '¿Cómo preferís recibir el resumen?',
      quickReplies: ['Texto', 'Audio', 'Texto y audio', 'Los tres formatos'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var format = 'texto';
        if (normalized.indexOf('tres') !== -1) format = 'todos';
        else if (normalized.indexOf('texto y audio') !== -1) format = 'texto_audio';
        else if (normalized.indexOf('audio') !== -1) format = 'audio';
        else if (normalized.indexOf('visual') !== -1) format = 'html';
        prefs.set({ format: format });
      },
      next: 'duration'
    },
    duration: {
      question: '¿Cuánto querés que dure el boletín de audio?',
      quickReplies: ['30 segundos', '1 minuto', '3 minutos', '5 minutos'],
      save: function (text) {
        var normalized = Canillita.intents.normalize(text);
        var seconds = 60;
        if (normalized.indexOf('30') !== -1) seconds = 30;
        else if (normalized.indexOf('3 min') !== -1) seconds = 180;
        else if (normalized.indexOf('5 min') !== -1) seconds = 300;
        prefs.set({ audioSeconds: seconds });
      },
      next: 'hour'
    },
    hour: {
      question: '¿A qué hora te gustaría recibirlo?',
      quickReplies: ['07:00', '08:00', '13:00', '20:00'],
      save: function (text) {
        var match = String(text).match(/(\d{1,2})[:.]?(\d{2})?/);
        if (match) {
          var hours = String(Math.min(23, Number(match[1]))).padStart(2, '0');
          var minutes = match[2] ? match[2] : '00';
          prefs.set({ hour: hours + ':' + minutes });
        }
      },
      next: null
    }
  };

  function startPreferences() {
    flowStep = 'name';
    return reply([
      message('Vamos a configurar tu edición. Son seis preguntas cortas y se guardan solo en este navegador.'),
      message(FLOW.name.question)
    ], FLOW.name.quickReplies);
  }

  function isAwaitingPreference() {
    return flowStep !== null;
  }

  function continuePreferences(text) {
    var step = FLOW[flowStep];
    var normalized = Canillita.intents.normalize(text);

    // Escape del flujo en cualquier momento.
    if (normalized === 'cancelar' || normalized === 'salir') {
      flowStep = null;
      return reply(message('Listo, dejamos la configuración como estaba.'), MENU_REPLIES);
    }

    step.save(text);
    flowStep = step.next;

    if (flowStep) {
      return reply(message(FLOW[flowStep].question), FLOW[flowStep].quickReplies);
    }

    return reply([
      message('✅ Guardado. Así quedó tu configuración:\n\n' + prefs.summaryText()),
      message('El horario todavía no dispara envíos automáticos: en esta demo se usa para personalizar el saludo y la edición.')
    ], ['Mi resumen de hoy', 'Escuchar las noticias', 'Menú']);
  }

  /* --------------------------------------------------------------- router */

  var HANDLERS = {
    greeting: greeting,
    help: help,
    daily_summary: dailySummary,
    listen_summary: listenSummary,
    open_html: openHtml,
    route22_current: route22Current,
    route22_history: route22History,
    route22_reason_stopped: route22ReasonStopped,
    route22_status: route22Status,
    route22_roca: route22Roca,
    route22_province: route22Province,
    route22_neutralized: route22Neutralized,
    route22_toll: route22Toll,
    sports: sports,
    sports_next: sportsNext,
    messi: messi,
    messi_final: messiFinal,
    messi_retiro: messiRetiro,
    messi_premios: messiPremios,
    preferences: startPreferences,
    thanks: thanks,
    unknown: unknown
  };

  /**
   * Punto de entrada: recibe el texto del usuario y devuelve la respuesta.
   */
  function respondTo(text) {
    if (isAwaitingPreference()) {
      return continuePreferences(text);
    }
    var detection = Canillita.intents.detect(text);
    if (detection.intent === 'route22_section' && detection.section) {
      return route22Section(detection.section);
    }
    var handler = HANDLERS[detection.intent] || unknown;
    return handler();
  }

  Canillita.responses = {
    respondTo: respondTo,
    greeting: greeting,
    longDate: longDate,
    todayLabel: todayLabel,
    clockLabel: clockLabel
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canillita.responses;
  }
})(typeof window !== 'undefined' ? window : globalThis);
