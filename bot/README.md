# El bot de Telegram

El mismo motor que responde en la web, pero conversando por Telegram.

No hay reglas ni textos de noticias en esta carpeta: todo sale de
`content/*.json` y `js/responses.js`. Si mañana editás una noticia, el bot dice
lo nuevo sin tocar una línea de código.

---

## Por qué Telegram y no WhatsApp

En WhatsApp, responder a alguien que te escribió primero es gratis, pero
mandar un mensaje por iniciativa propia —el boletín de las 7— exige una
plantilla aprobada por Meta y se cobra por envío. Además hace falta una cuenta
de empresa verificada y un número de teléfono que no esté usando WhatsApp.

Telegram es gratis de punta a punta y el alta lleva dos minutos.

La arquitectura no se casa con ninguno de los dos: `bot/telegram.js` traduce la
respuesta del motor al formato del canal. Para sumar WhatsApp más adelante se
escribe otro archivo igual, sin tocar la lógica.

---

## Puesta en marcha

### 1. Crear el bot

En Telegram, buscá **@BotFather** y escribile `/newbot`. Te va a pedir un
nombre y un usuario terminado en `bot`. Al final te da un token, algo como
`8123456789:AAF...`. Guardalo: es la llave del bot.

**Ese token nunca va al repositorio.** Si se filtra, cualquiera puede escribir
en nombre de tu diario.

### 2. Crear la cuenta de Cloudflare

En [dash.cloudflare.com](https://dash.cloudflare.com) creás una cuenta con tu
correo. El plan gratuito de Workers da 100.000 pedidos por día y no pide
tarjeta.

Necesitás dos datos:

- **Account ID**: aparece en el panel, en la sección Workers.
- **API token**: en *My Profile → API Tokens → Create Token*, usando la
  plantilla **Edit Cloudflare Workers**.

### 3. Cargar los secretos en GitHub

En tu repositorio: *Settings → Secrets and variables → Actions →
New repository secret*. Cargá los cuatro:

| Nombre | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | el token de Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | el identificador de cuenta |
| `TELEGRAM_TOKEN` | el que te dio @BotFather |
| `WEBHOOK_SECRET` | una cadena inventada por vos, sin espacios |

El `WEBHOOK_SECRET` lo elegís vos: sirve para que el bot verifique que quien lo
llama es Telegram y no cualquiera que descubrió la dirección.

### 4. Desplegar

*Actions → Bot de Telegram → Run workflow*. Cuando termine, el panel de
Cloudflare muestra la dirección del Worker, con esta forma:

```
https://canillita-bot.TU-SUBDOMINIO.workers.dev
```

Anotala.

### 5. Avisarle a Telegram dónde está el bot

Esto se hace una sola vez, y desde el navegador. Pegá esta dirección en la
barra, reemplazando las tres partes en mayúsculas:

```
https://api.telegram.org/botTU_TOKEN/setWebhook?url=https://canillita-bot.TU-SUBDOMINIO.workers.dev&secret_token=TU_WEBHOOK_SECRET
```

Si responde `{"ok":true,...}`, ya está.

### 6. Probarlo

Buscá tu bot en Telegram por el usuario que elegiste y escribile `/start`.

---

## Qué hace

- **`/start`** — presentación y opciones.
- **Cualquier pregunta** — pasa por el mismo motor de reglas de la web:
  la Ruta 22, los tramos, el traspaso, el peaje, los deportes.
- **"Escuchar las noticias"** — manda el boletín como nota de voz, tomando el
  OGG que genera Piper.
- **Respuestas con clip** — las diecisiete respuestas grabadas llegan como nota
  de voz además del texto.
- **Botones** — los mismos `quickReplies` de la web, uno por fila.
- **Fuentes y fechas** — se mantienen en cada respuesta, igual que en la web.

## Qué no hace todavía

- **No hay envío automático de las 7.** Se puede agregar publicando el boletín
  en un canal de Telegram desde el workflow que ya genera el audio, sin costo y
  sin guardar datos de nadie.
- **No guarda preferencias.** El motor guarda el formulario guiado en una
  variable del módulo, y en un Worker esa variable es compartida entre todas
  las conversaciones: dos personas quedarían en el mismo formulario. Por eso el
  bot redirige a la edición web. Resolverlo requiere almacenamiento por
  conversación (Workers KV, gratis) y está pendiente.
- **No hay historial.** Cada mensaje se responde por sí solo.

## Costos

Cero. Telegram no cobra, el plan gratuito de Workers no pide tarjeta, y Actions
no cobra minutos en repositorios públicos.
