/*
 * worker.js
 * ---------
 * El bot de Telegram. Corre en un Cloudflare Worker: recibe el webhook,
 * le pregunta al mismo motor conversacional que usa la web, y responde.
 *
 * Lo importante: acá no hay ninguna regla ni ningún texto de noticia. Todo
 * sale de content/*.json y js/responses.js, que son los mismos archivos que
 * usan la página y el generador de audio. Una sola fuente de verdad.
 *
 * Variables que necesita (se cargan como secretos, nunca en el repositorio):
 *   TELEGRAM_TOKEN   token que da @BotFather
 *   WEBHOOK_SECRET   cadena inventada, para verificar que el pedido es de Telegram
 *   SITIO            URL pública del sitio, para los enlaces y el audio
 */

import actualidad from '../content/ruta22-actualidad.json';
import historia from '../content/ruta22-historia.json';
import deportes from '../content/deportes.json';
import messi from '../content/messi.json';

import '../js/version.js';
import '../js/router.js';
import '../js/content.js';
import '../js/preferences.js';
import '../js/render.js';
import '../js/radio.js';
import '../js/intents.js';
import '../js/responses.js';

import { enviarTexto, enviarVoz, enviarRespuesta, mostrarEscribiendo } from './telegram.js';

const Canillita = globalThis.Canillita;

/* Las historias se cargan una vez por instancia, no en cada mensaje. */
let cargado = false;
function prepararContenido() {
  if (cargado) return;
  Canillita.content.hydrate([actualidad, historia, messi, deportes]);
  cargado = true;
}

/* Índice de clips, también cacheado por instancia. */
let clips = null;
async function prepararClips(sitio) {
  if (clips !== null) return clips;
  try {
    const respuesta = await fetch(sitio.replace(/\/$/, '') + '/assets/audio/respuestas.json');
    clips = respuesta.ok ? (await respuesta.json()).answers : {};
  } catch (error) {
    clips = {};
  }
  return clips;
}

function urlDeClip(sitio, audioId, indice) {
  if (!audioId || !indice || !indice[audioId]) return null;
  // Telegram manda notas de voz en OGG/Opus, que es el segundo formato que
  // ya genera el workflow.
  return sitio.replace(/\/$/, '') + '/assets/audio/respuestas/' + audioId + '.ogg';
}

function urlDelBoletin(sitio) {
  return sitio.replace(/\/$/, '') + '/assets/audio/boletin.ogg';
}

/* --------------------------------------------------------------- mensajes */

const BIENVENIDA =
  'Soy *Tu Canillita*, las noticias del Alto Valle.\n\n' +
  'Puedo contarte lo último de la Ruta 22, leértelo como un boletín de radio ' +
  'o abrirte la edición completa.\n\n' +
  'Escribime lo que quieras saber, o elegí una opción.';

/*
 * Las opciones de arranque se listan acá y no salen de las preferencias porque
 * "seguir una historia" se guarda en el navegador del lector: el bot no tiene
 * forma de conocerlo. Sincronizar las dos cosas requiere almacenamiento por
 * conversación (Workers KV) y está pendiente.
 */
const OPCIONES_INICIO = [
  'Mi resumen de hoy',
  'Escuchar las noticias',
  'Ver la historia de la Ruta 22',
  'Contame el hilo de Messi',
  'Ver deportes'
];

/*
 * La configuración guiada queda fuera del bot a propósito: el motor guarda ese
 * flujo en una variable del módulo, y en un Worker esa variable es compartida
 * entre todas las conversaciones. Meter a dos personas en el mismo formulario
 * sería un error grave, así que se redirige a la web.
 */
const SIN_PREFERENCIAS =
  'Las preferencias se configuran por ahora en la edición web, que guarda todo ' +
  'en tu navegador. Acá puedo responderte cualquier consulta sobre las noticias.';

/* ------------------------------------------------------------- respuesta */

async function responder(config, chatId, texto) {
  const { token, sitio } = config;

  if (texto === '/start' || texto === '/ayuda' || texto === '/help') {
    return enviarTexto(token, chatId, BIENVENIDA, {
      inline_keyboard: OPCIONES_INICIO.map((o) => [{ text: o, callback_data: o }])
    });
  }

  const deteccion = Canillita.intents.detect(texto);

  // Para el audio no mostramos "escribiendo": Telegram ya avisa que se está
  // enviando una nota de voz, y el aviso doble solo demora la llegada.
  if (deteccion.intent !== 'listen_summary') {
    await mostrarEscribiendo(token, chatId);
  }

  if (deteccion.intent === 'preferences') {
    return enviarTexto(token, chatId, SIN_PREFERENCIAS, {
      inline_keyboard: OPCIONES_INICIO.map((o) => [{ text: o, callback_data: o }])
    });
  }

  // El boletín se manda como nota de voz, que es su forma natural en un chat
  if (deteccion.intent === 'listen_summary') {
    await enviarVozDelBoletin(config, chatId);
    return;
  }

  const respuesta = Canillita.responses.respondTo(texto);
  const indice = await prepararClips(sitio);
  const clip = urlDeClip(sitio, respuesta.audioId, indice);

  return enviarRespuesta(config, chatId, respuesta, clip);
}

async function enviarVozDelBoletin(config, chatId) {
  const { token, sitio } = config;
  let duracion = null;
  try {
    const meta = await fetch(sitio.replace(/\/$/, '') + '/assets/audio/boletin.json');
    if (meta.ok) duracion = Math.round((await meta.json()).duration);
  } catch (error) { /* seguimos sin la duración */ }

  // Un solo mensaje: la voz llega con los botones puestos
  return enviarVoz(
    token,
    chatId,
    urlDelBoletin(sitio),
    'Boletín de hoy' + (duracion ? ' · ' + duracion + ' segundos' : ''),
    {
      inline_keyboard: [
        [{ text: '¿Por qué se frenó la Ruta 22?', callback_data: '¿Por qué se frenó la Ruta 22?' }],
        [{ text: 'Ver edición completa', callback_data: 'Ver edición completa' }]
      ]
    }
  );
}

/* ----------------------------------------------------------------- worker */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Tu Canillita · bot de Telegram', { status: 200 });
    }

    // Telegram reenvía este encabezado en cada webhook: si no coincide, no es él
    const secreto = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (env.WEBHOOK_SECRET && secreto !== env.WEBHOOK_SECRET) {
      return new Response('no', { status: 401 });
    }

    const config = {
      token: env.TELEGRAM_TOKEN,
      sitio: env.SITIO || 'https://mcanosam.github.io/canillitadigital'
    };

    let update;
    try {
      update = await request.json();
    } catch (error) {
      return new Response('ok');
    }

    prepararContenido();

    const mensaje = update.message || update.edited_message;
    const callback = update.callback_query;

    try {
      if (callback) {
        // Sin esto, el botón queda girando en el teléfono del lector
        await fetch('https://api.telegram.org/bot' + config.token + '/answerCallbackQuery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callback.id })
        });
        await responder(config, callback.message.chat.id, callback.data);
      } else if (mensaje && mensaje.text) {
        await responder(config, mensaje.chat.id, mensaje.text);
      }
    } catch (error) {
      // Un error nuestro no debe hacer que Telegram reintente en bucle
      console.error('Error respondiendo:', error && error.message);
    }

    return new Response('ok');
  }
};
