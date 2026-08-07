# Tu Canillita Digital

Agente de noticias locales del Alto Valle. El lector conversa con el diario,
elige qué quiere recibir y obtiene la misma información en tres formatos:
resumen conversacional, boletín de audio con estilo radial y edición visual.

Este repositorio es una **demostración funcional**, sin servicios pagos, sin
claves y sin dependencias externas. Todo corre en el navegador.

---

## Estado: Fase 3 de 4

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Estructura, contenido en JSON, simulador de WhatsApp, motor de respuestas por reglas | ✅ listo |
| 2 | Edición HTML personalizada + página de historia viva de la Ruta 22 | ✅ listo |
| 3 | Generador de guion radial + reproducción con Web Speech API | ✅ listo |
| 4 | Panel de preferencias, accesibilidad y documentación final | ⏳ pendiente |

El boletín ya se genera, se adapta a la duración elegida y se reproduce con la
voz del navegador, con controles de reproducir, pausar y detener. El guion
queda visible como texto pase lo que pase con la voz.

---

## Cómo ejecutarlo

### Opción A — abrir el archivo (más rápido)

Doble clic en `index.html`. Funciona porque el proyecto incluye una copia
embebida del contenido en `content/content.bundle.js`.

### Opción B — servidor local (recomendada)

Con un servidor local la aplicación lee los JSON directamente, así que los
cambios de contenido se ven al recargar, sin regenerar nada.

```bash
cd tu-canillita-digital
python3 -m http.server 8000
```

Después, abrir <http://localhost:8000> en el navegador.

No hace falta instalar nada más: no hay npm, ni build, ni claves de API.

---

## Cómo editar las noticias

Las tres historias viven en `content/`:

| Archivo | Historia |
|---|---|
| `ruta22-actualidad.json` | Ruta 22: qué cambió recientemente |
| `ruta22-historia.json` | Ruta 22: por qué la obra sigue incompleta |
| `deportes.json` | Noticia deportiva **ficticia** de demostración |

Cada historia tiene tres versiones del mismo hecho, escritas para canales
distintos: `whatsappSummary` (breve, con emojis), `radioSummary` (oral, para
leer en voz alta) y `articleBody` (nota completa para la edición HTML).
Además guarda `confirmedFacts`, `pendingQuestions`, `timeline`, `sections` y
`sources`, que es lo que permite responder diferenciando **lo confirmado** de
**lo que falta definir**.

Después de editar un JSON, si vas a usar la Opción A, regenerá la copia
embebida:

```bash
python3 tools/build-bundle.py
```

Los JSON son la fuente de verdad. `content.bundle.js` se genera, no se edita.

---

## Estructura

```text
tu-canillita-digital/
├── index.html                  Simulador del canal WhatsApp
├── css/
│   ├── styles.css              Tokens y estilos del chat
│   └── pages.css               Estilos de las páginas largas
├── js/
│   ├── router.js               Rutas y prefijos relativos
│   ├── content.js              Carga y consulta de las historias
│   ├── preferences.js          Preferencias en localStorage
│   ├── render.js               Piezas de HTML compartidas por las páginas
│   ├── intents.js              Detección de intenciones por reglas
│   ├── responses.js            Armado de respuestas desde el contenido
│   ├── radio.js                Guion radial y reproductor de voz
│   ├── chat.js                 Render de la conversación
│   ├── edicion.js              Arma la edición personalizada
│   ├── ruta22.js               Arma la historia viva
│   └── app.js                  Arranque
├── content/
│   ├── ruta22-actualidad.json
│   ├── ruta22-historia.json
│   ├── deportes.json
│   └── content.bundle.js       Copia generada (para abrir sin servidor)
├── assets/
│   ├── images/
│   └── audio/
├── pages/
│   ├── edicion.html            Edición personalizada del día
│   └── ruta22.html             Historia viva de la Ruta 22
├── tools/
│   ├── build-bundle.py         Copia embebida del contenido
│   ├── build-boletin.js        Guion → plan de audio
│   └── tts-boletin.sh          Plan → MP3 con Piper
├── .github/workflows/
│   └── boletin.yml             Generación diaria automática
└── README.md
```

Dos diferencias con la estructura original propuesta, ambas deliberadas:

- `chat.js` se ocupa solo de mostrar; decidir qué responder quedó separado en
  `intents.js` (detectar) y `responses.js` (redactar). Mezclarlo hacía un
  archivo difícil de leer.
- `render.js` existe porque la edición y la historia viva comparten piezas
  (cronología, tramos, fuentes). Escribirlas dos veces garantizaba que se
  fueran separando con el tiempo.
- `radio.js` separa adentro dos cosas que no deben mezclarse: armar el guion y
  reproducirlo. El guion tiene que existir aunque la voz falle.

---

## Qué se puede probar

**Flujo 1 — resumen diario**
`Hola` → menú → `Mi resumen de hoy` → `Escuchar resumen` (aparece el
reproductor con el guion) → `Ver edición completa`

**Flujo 2 — Ruta 22**
`¿Por qué se frenó la Ruta 22?` → `¿Qué pasó en General Roca?` → `Ver la historia de la Ruta 22`

**Flujo 3 — deportes**
`Ver deportes` → `¿Cuándo juega Deportivo Roca?`

**Flujo 4 — fuera de alcance**
`¿Qué pasa con el dólar?` → el agente avisa que no tiene información validada.

También responde por tramo: `sección 3`, `Allen`, `Cervantes`, `Cipolletti`,
`isla Jordán`, y explica conceptos del expediente: `contratos neutralizados`,
`peaje`, `traspaso`.

Escribí `configurar` para cargar nombre, localidad, temas, formato, duración
del audio y horario.

---

## Cómo responde (y qué no es)

El motor conversacional es **por reglas**, no es inteligencia artificial.
Compara el mensaje contra listas de frases en `js/intents.js` y elige la
coincidencia más larga. Ventajas: gratuito, sin conexión, auditable y
predecible. Límite: solo entiende lo previsto.

Cuando no encuentra nada, responde:

> No tengo información validada sobre ese tema dentro de esta demostración.
> Por ahora puedo responder sobre la Ruta 22 y la noticia deportiva disponible.

Nunca inventa datos. Toda respuesta sale de los JSON, con su fecha y sus
fuentes a la vista.

---

## El boletín de audio se genera solo

El navegador puede leer el guion en voz alta, pero **no produce un archivo**.
Y WhatsApp manda archivos: un mensaje de voz es un archivo de audio. Por eso el
boletín se genera del lado del servidor con **Piper TTS** y se publica como MP3
en el propio repositorio.

Ventajas de tener un archivo: suena igual en todos los dispositivos, se puede
mandar por WhatsApp tal cual, y la calidad la controlás vos y no el teléfono
del lector.

### Cómo funciona

```text
content/*.json  →  js/radio.js  →  build/plan.json  →  Piper  →  assets/audio/boletin.mp3
   noticias         guion            frases + pausas     voz         boletín publicado
```

`js/radio.js` es el mismo archivo que usa el navegador. Corre también en Node,
así que el guion que se escucha y el que se lee en pantalla no se pueden
separar: son el mismo.

### La voz

`es_AR-daniela-high`, una de las pocas voces neuronales de español argentino
disponibles gratis. Pesa unos 60 MB y corre en CPU. Se puede cambiar por
cualquier otra del catálogo de Piper.

La velocidad y los silencios entre bloques se aplican con ffmpeg, no con los
flags de Piper: los flags cambiaron entre versiones y ffmpeg no.

## Las respuestas del chat también se escuchan

El motor conversacional es de reglas, así que el conjunto de respuestas
posibles es **finito**: diecisiete, contando las seis secciones de la ruta y la
respuesta de "no tengo ese dato". Se pueden grabar todas de antemano.

`tools/build-respuestas.js` recorre el mismo motor que responde en pantalla y
arma el texto de cada una; `tools/tts-respuestas.sh` las convierte en clips.
Cuando en el chat aparece una respuesta que tiene clip, debajo sale un botón
para escucharla.

Si mañana agregás una intención nueva a `js/intents.js`, sumás la pregunta a la
lista de `build-respuestas.js` y el clip se genera solo. Si la pregunta no
matchea ninguna intención, el script falla en vez de generar audio de una
respuesta equivocada.

Antes de sintetizar, el texto se prepara para ser dicho: los emojis se sacan,
los números en círculo se convierten en "Primero, Segundo, Tercero", las
flechas de los tramos se dicen "hasta", y cada salto de línea se cierra con un
punto para que no se encadenen las frases.

### Generación automática

`.github/workflows/boletin.yml` corre todos los días a las 07:00 de Argentina,
genera el audio y lo sube al repositorio.

**También se dispara al editar el contenido.** Si hacés commit de un cambio en
`content/*.json`, el audio se regenera en unos minutos: publicar la noticia es
el disparador, no hay que acordarse de apretar nada. **GitHub Actions no cobra minutos en
repositorios públicos**, así que no hay costo ni hace falta tarjeta.

También se puede disparar a mano desde la pestaña *Actions* del repositorio,
con el botón *Run workflow*, sin esperar al horario.

### Generarlo en tu computadora

```bash
pip install piper-tts
sudo apt-get install ffmpeg jq        # en Mac: brew install ffmpeg jq

node tools/build-boletin.js --seconds 300
tools/tts-boletin.sh es_AR-daniela-high
```

Deja `assets/audio/boletin.mp3`, `boletin.ogg` y `boletin.json`.

### Qué pasa si el boletín no está

La página sigue funcionando. Si no encuentra `assets/audio/boletin.json`, usa
la voz del navegador como respaldo y lo dice en pantalla. Si tampoco hay voz,
muestra el guion escrito. Nunca se queda sin nada que ofrecer.


## El boletín de audio: cómo está escrito

El guion **no lee el artículo**: lo reescribe con estructura de radio.
Identificación, saludo con la hora dicha en palabras ("son las siete y cuarto
de la mañana"), presentación, noticia, contexto, separador, deportes, qué
seguir durante el día, invitación a preguntar y cierre.

Cada bloque tiene una prioridad. Si el boletín no entra en la duración elegida
—30 segundos, 1, 3 o 5 minutos— se recortan primero las ampliaciones y después
los desarrollos, empezando por el bloque más corto que haga entrar el resto.
Nunca se recortan el saludo, los titulares ni el aviso de contenido ficticio de
deportes: ese aviso viaja dentro del titular justamente para que no pueda
quedar afuera de una versión corta.

Con las tres historias cargadas, el mínimo real ronda los 32 segundos y la
versión completa unos 3 minutos y medio. Si elegís una duración que no se puede
alcanzar, la interfaz muestra la duración real en vez de fingirla.

No hay cortina musical: nada con derechos de autor. La identificación es
hablada.

### Velocidad

El control de la edición es un multiplicador sobre el ritmo natural del
boletín: 1 es la velocidad a la que Piper lo generó. El archivo no se acelera
salvo que el lector lo pida.

La voz del navegador, en cambio, arranca de fábrica más lenta que un boletín,
así que en ese modo se le aplica internamente un 1,15 antes del multiplicador
del lector. Son dos escalas distintas para dos fuentes distintas.

### Voz de respaldo

Cuando no hay boletín grabado se usa la **Web Speech API** del navegador. El
texto se dice en frases de menos de 180 caracteres porque Chrome corta las
locuciones largas alrededor de los quince segundos.

En los dos modos, el bloque que se está escuchando queda resaltado en el guion:
con el archivo, gracias a las marcas de tiempo que calcula el generador.

---

## Publicar en GitHub Pages

El proyecto es estático, así que el despliegue se configura una vez y después
cada actualización es subir los archivos.

1. Crear un repositorio **público** en GitHub llamado `tu-canillita-digital`.
   El plan gratuito solo publica desde repositorios públicos. Acá no hay claves
   ni datos personales, así que no es un problema.
2. Subir el contenido de la carpeta. Se puede arrastrar los archivos desde la
   web de GitHub, sin usar la terminal. Con Git:

   ```bash
   cd tu-canillita-digital
   git init
   git add .
   git commit -m "Tu Canillita Digital"
   git branch -M main
   git remote add origin https://github.com/TUUSUARIO/tu-canillita-digital.git
   git push -u origin main
   ```

3. En **Settings → Pages**, elegir *Deploy from a branch*, rama `main`, carpeta
   `/ (root)`. Guardar.
4. En dos o tres minutos queda publicado en
   `https://TUUSUARIO.github.io/tu-canillita-digital/`.

Después de la primera vez, actualizar es `git add . && git commit -m "..." &&
git push`.

**No hace falta configurar nada más.** Todas las rutas del proyecto son
relativas, así que funciona igual en la raíz de un dominio o en un
subdirectorio. Servido por HTTPS, la app lee los JSON directamente y el bundle
embebido queda como red de seguridad.

Límites del plan gratuito: 1 GB de sitio y 100 GB de tráfico por mes. No hay
cuenta de facturación asociada, así que no existe la posibilidad de un consumo
inesperado.

**Un detalle de la voz:** los navegadores solo permiten reproducir audio
después de que la persona toca algo. Como acá siempre se dispara con un botón,
funciona sin problema.

---

## Limitaciones actuales

1. **No hay WhatsApp real.** Es un simulador visual del canal. No envía ni
   recibe mensajes.
2. **El boletín se genera una vez por día.** No hay generación a pedido con la
   duración que elige cada lector: el archivo publicado es uno solo. La
   duración personalizada solo aplica al guion escrito y a la voz de respaldo.
3. **No hay inteligencia artificial.** Reglas y palabras clave. Si preguntás
   algo con otras palabras, puede no entender.
5. **Tres historias, cargadas a mano.** No hay scraping, ni búsqueda web, ni
   panel de carga para periodistas.
6. **Sin envío automático a las 7:00.** El horario se guarda pero no dispara
   nada.
7. **Las preferencias viven en un solo navegador.** Si cambiás de dispositivo o
   borrás datos del sitio, se pierden.
8. **La noticia deportiva es ficticia** y está marcada como tal en pantalla, en
   el resumen y en el guion de radio.
9. **Dos fuentes de la historia larga tienen fecha sin verificar.** Están
   marcadas con `dateNote` en el JSON y aparecen como "fecha a verificar".
   Verificarlas antes de cualquier publicación real.
10. **Sin analítica ni registro.** No se guarda nada fuera del navegador.

---

## Próximos pasos para conectar WhatsApp de verdad

La arquitectura ya está preparada: `responses.js` devuelve mensajes en un
formato neutro (texto, botones, fuentes) que no depende del canal. Conectar
WhatsApp es reemplazar `chat.js` por un adaptador, no reescribir la lógica.

1. **Elegir proveedor.** La API oficial (WhatsApp Business Platform) requiere
   una cuenta de Meta Business, un número dedicado y verificación del negocio.
   Tiene conversaciones de servicio sin costo por mes, pero exige tarjeta y
   puede generar consumo. Antes de avanzar, verificar las condiciones vigentes:
   cambian seguido.
2. **Montar un webhook.** Un pequeño servidor recibe los mensajes entrantes,
   llama a `respondTo()` y devuelve la respuesta. La lógica actual se puede
   correr tal cual en Node.
3. **Traducir el formato.** Escribir un adaptador que convierta cada mensaje al
   formato de la API: `text`, `interactive.button`, `interactive.list`.
   Los `quickReplies` mapean directo a botones (máximo tres por mensaje).
4. **Mover las preferencias.** Reemplazar `localStorage` por un almacenamiento
   asociado al número de teléfono, manteniendo la misma interfaz de
   `preferences.js`.
5. **Guardar las claves fuera del frontend.** Ningún token en el navegador.
6. **Plantillas para el envío de las 7:00.** Los mensajes iniciados por el
   negocio requieren plantillas aprobadas previamente por Meta.
7. **Audio.** Generar el archivo con Piper TTS en el servidor y enviarlo como
   mensaje de voz, en lugar de sintetizarlo en el navegador.

Mientras tanto, el simulador permite recorrer y mostrar la experiencia completa
sin gastar un peso.

---

## Contenido y verificación

- Las dos historias de la Ruta 22 son reales y citan fuentes periodísticas y
  oficiales con fecha, incluidas Vialidad Nacional, Diario Río Negro, ANRoca,
  LM Cipolletti, LCR y Diario Neuquino.
- Cuando un dato está confirmado y cuando todavía está en discusión se muestran
  por separado, en las secciones "Qué sabemos" y "Qué falta definir".
- La noticia deportiva es inventada. Está marcada en el JSON con
  `"isFiction": true` y con un aviso que aparece antes del contenido en todos
  los formatos.
- Antes de publicar cualquier cosa fuera de la demo, revisar cada fuente.
