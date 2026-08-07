/*
 * telegram.js
 * -----------
 * Traductor entre el motor conversacional y Telegram.
 *
 * El motor devuelve un objeto neutro —mensajes, botones, fuentes, enlaces,
 * audioId— que no sabe nada del canal. Acá se convierte a las llamadas de la
 * API de Telegram, y en ningún momento se toca la lógica de las respuestas.
 *
 * El día que haya presupuesto para WhatsApp, se escribe otro archivo como este
 * y listo.
 */

const API = 'https://api.telegram.org/bot';

/* --------------------------------------------------------------- formato */

/**
 * El chat de la web usa *negrita* y _cursiva_, que es casualmente la sintaxis
 * Markdown de Telegram. Aun así se envía con reintento: si el texto tiene un
 * asterisco suelto, Telegram rechaza el mensaje entero, y es preferible
 * mandarlo sin formato antes que no mandarlo.
 */
function bloqueDeFuentes(sources) {
  if (!sources || !sources.length) return '';
  const lineas = sources.map((fuente) => {
    const fecha = fuente.publishedAt
      ? ' · ' + fuente.publishedAt.split('-').reverse().join('-')
      : '';
    return fuente.url
      ? '· [' + fuente.publisher + fecha + '](' + fuente.url + ')'
      : '· ' + fuente.publisher + fecha;
  });
  return '\n\nFuentes:\n' + lineas.join('\n');
}

function bloqueDeEnlaces(links) {
  if (!links || !links.length) return '';
  return '\n\n' + links
    .map((enlace) => '[' + enlace.label + '](' + enlace.href + ')')
    .join('\n');
}

/** Texto completo de un mensaje, con su fecha de dato, fuentes y enlaces. */
function textoDe(mensaje, sitio) {
  let texto = mensaje.text;
  if (mensaje.dataDate) {
    texto += '\n\n_Dato actualizado al ' +
      mensaje.dataDate.slice(0, 10).split('-').reverse().join('-') + '_';
  }
  texto += bloqueDeFuentes(mensaje.sources);
  texto += bloqueDeEnlaces(absolutizar(mensaje.links, sitio));
  return texto;
}

/** Los enlaces del motor son relativos: Telegram necesita la URL completa. */
function absolutizar(links, sitio) {
  if (!links) return null;
  return links.map((enlace) => ({
    label: enlace.label,
    href: /^https?:/.test(enlace.href)
      ? enlace.href
      : sitio.replace(/\/$/, '') + '/' + enlace.href.replace(/^\.\//, '')
  }));
}

/**
 * Botones. Telegram no limita a tres como WhatsApp, pero de a uno por fila se
 * leen mejor en un teléfono. El texto del botón viaja como callback_data, que
 * tiene un techo de 64 bytes.
 */
function teclado(quickReplies) {
  if (!quickReplies || !quickReplies.length) return undefined;
  const filas = quickReplies
    .filter((etiqueta) => new TextEncoder().encode(etiqueta).length <= 64)
    .map((etiqueta) => [{ text: etiqueta, callback_data: etiqueta }]);
  return filas.length ? { inline_keyboard: filas } : undefined;
}

/* ----------------------------------------------------------------- envío */

async function llamar(token, metodo, cuerpo) {
  const respuesta = await fetch(API + token + '/' + metodo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
  return respuesta.json();
}

/** Envía un texto; si Telegram rechaza el formato, reintenta sin formato. */
async function enviarTexto(token, chatId, texto, marcado) {
  const base = {
    chat_id: chatId,
    text: texto,
    disable_web_page_preview: true
  };
  const resultado = await llamar(token, 'sendMessage', {
    ...base,
    parse_mode: 'Markdown',
    reply_markup: marcado
  });
  if (resultado.ok) return resultado;

  return llamar(token, 'sendMessage', {
    ...base,
    text: texto.replace(/[*_]/g, ''),
    reply_markup: marcado
  });
}

/** Nota de voz. Telegram acepta una URL pública: usamos el OGG del sitio. */
async function enviarVoz(token, chatId, url, titulo) {
  return llamar(token, 'sendVoice', {
    chat_id: chatId,
    voice: url,
    caption: titulo
  });
}

async function mostrarEscribiendo(token, chatId) {
  return llamar(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
}

/* ------------------------------------------------------------- respuesta */

/**
 * Manda una respuesta completa del motor: los mensajes en orden, la nota de
 * voz si esa respuesta tiene clip, y los botones en el último mensaje.
 */
async function enviarRespuesta(config, chatId, respuesta, clipUrl) {
  const { token, sitio } = config;
  const mensajes = respuesta.messages;

  for (let i = 0; i < mensajes.length; i++) {
    const esUltimo = i === mensajes.length - 1;
    await enviarTexto(
      token,
      chatId,
      textoDe(mensajes[i], sitio),
      esUltimo && !clipUrl ? teclado(respuesta.quickReplies) : undefined
    );
  }

  if (clipUrl) {
    await enviarVoz(token, chatId, clipUrl, 'Escuchá esta respuesta');
    // Los botones van después de la voz para que queden al final del hilo
    if (respuesta.quickReplies && respuesta.quickReplies.length) {
      await enviarTexto(token, chatId, '¿Seguimos?', teclado(respuesta.quickReplies));
    }
  }
}

export {
  enviarTexto,
  enviarVoz,
  enviarRespuesta,
  mostrarEscribiendo,
  teclado,
  textoDe,
  llamar
};
