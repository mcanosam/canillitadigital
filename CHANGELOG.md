# Historial de versiones

Formato de fecha: día-mes-año. La versión que corre está en `js/version.js` y
se muestra al pie de cada pantalla.

Criterio de numeración:

- **tercer número** — correcciones y ajustes menores
- **segundo número** — funcionalidad nueva o cambios visibles
- **primer número** — cambio de fondo en el producto

---
## v1.6.1 · 07-08-2026

- Corrección: si `js/version.js` no está presente, la aplicación seguía sin
  arrancar. La versión es informativa y ahora no puede tumbar la carga.

---
## v1.7.0 · 07-08-2026

- Los clips de audio salen del chat: ahora hay una barra de escucha en cada
  noticia de la edición y en cada tramo de la historia viva. Reutilizan los
  clips que ya se generaban; no hay audio nuevo que producir.
- El turno de reproducción se comparte entre el boletín y los clips: arrancar
  uno detiene el otro y devuelve su botón al estado inicial.

---
## v1.8.0 · 07-08-2026

- Bot de Telegram: `bot/worker.js` corre en Cloudflare Workers y responde con
  el mismo motor que usa la web. `bot/telegram.js` traduce la respuesta del
  motor al formato del canal; la lógica no se toca.
- El boletín y las respuestas grabadas llegan como notas de voz. Para eso,
  `tts-respuestas.sh` genera además de MP3 un OGG/Opus por clip.
- Despliegue automático con `.github/workflows/bot.yml`: no hace falta instalar
  nada en la máquina.
- Se descartó WhatsApp para esta etapa: el envío por iniciativa propia exige
  plantillas pagas, cuenta de empresa verificada y un número dedicado.

---
## v1.8.1 · 07-08-2026

- Bot: los botones viajan pegados a la nota de voz en vez de ir en un mensaje
  aparte. El audio queda al final del hilo, que es donde el lector lo busca.
- Bot: el aviso de "escribiendo" no se muestra antes del boletín. Telegram ya
  indica que se está enviando una nota de voz, y el aviso doble solo demoraba
  la llegada.

---
## v1.8.1 · 07-08-2026

- Bot: los botones viajan pegados a la nota de voz en vez de ir en un mensaje
  aparte. El audio queda al final del hilo, que es donde el lector lo busca.
- Bot: el aviso de "escribiendo" no se muestra antes del boletín. Telegram ya
  indica que se está enviando una nota de voz, y el aviso doble solo demoraba
  la llegada.

---
## v1.9.0 · 10-08-2026

- **Pedidos compuestos.** `detectAll()` reconoce varias intenciones en una
  misma frase cuando están unidas por un conector, y `respondToAll()` las
  responde en orden. "El resumen por audio y abrime la edición" son dos cosas.
  Sin conector se sigue respondiendo una sola, para no partir en dos una
  pregunta común.
- **El lector puede hablarle al bot.** Las notas de voz se transcriben con
  Whisper de Workers AI, dentro de la asignación gratuita. El bot muestra lo
  que entendió antes de responder, así una transcripción errada se ve.
- Los tramos de la ruta entran en la detección múltiple: "la sección 3 y qué
  pasa en Cipolletti" devuelve las dos fichas.

---
## v1.9.0 · 12-08-2026

- Nueva historia viva en Deportes: **el hilo de Messi**, de Rosario a la final
  del Mundial 2026. Cronología de trece hitos, hechos confirmados y preguntas
  abiertas (si sigue en la Selección, si Scaloni continúa).
- Contenido real y verificado con fuentes: La Nación, Telemundo, Prensa Libre,
  Sports Illustrated y Olympics.com. La noticia deportiva ficticia se mantiene
  aparte, marcada como tal.
- Cuatro intenciones nuevas en el chat: el hilo, la final, el retiro y los
  Balones de Oro. Tres tienen clip de audio.

---
## v1.10.0 · 12-08-2026

- El hilo de Messi sube al tercer lugar de la edición, antes de la nota
  ficticia: el contenido real va primero.
- Menú ampliado a seis opciones, con "El hilo de Messi" como entrada propia.
  Antes solo se llegaba escribiendo la pregunta.
- **Seguir una historia ahora sirve para algo.** Las historias seguidas
  aparecen encabezando el menú del chat y como primer botón. Al tocar el botón
  de seguir, la edición avisa dónde queda.
- `mockups/portadas.html`: las dos maquetas de portada como página navegable,
  para verlas en el teléfono en vez de como imagen.

---

## v1.6.0 · 07-08-2026

**Contenido**

- La nota de actualidad de la Ruta 22 pasa a encabezarse con el estado de la
  calzada tras las lluvias: pozos destapados, bacheo en frío lavado por el
  agua, talleres desbordados y el pedido de una Mesa Regional de Emergencia.
- Siete fuentes nuevas, fechadas entre el 30-07 y el 06-08-2026.
- La cronología encadena la noticia del día con la historia larga: el tramo que
  se inunda entre Cervantes y Roca es el mismo que nunca se ejecutó.

**Interfaz**

- Se quita el recuadro "Qué podés probar" del chat.
- Se quita el botón "Ver el guion": el guion aparece solo al reproducir.
- Barra de secciones fija con "Mi edición" y "Ruta 22", presente en las tres
  pantallas. La edición dejó de depender de un botón que aparecía a veces.

---

## v1.5.0 · 07-08-2026

- Rediseño completo: identidad de diario de provincia. Chapa en negativo con
  el nombre en condensada, filetes horizontales, volantas en recuadro ocre,
  bajadas en cursiva, letra capitular y texto de lectura en serifa.
- Paleta nueva: tinta sobre papel con el ocre de las bardas como único acento.
  Se eliminan las esquinas redondeadas.
- Las burbujas del chat se convierten en bloques de papel con filete.

---

## v1.4.0 · 07-08-2026

- Las diecisiete respuestas del motor de reglas se generan como clips de audio
  con Piper. En el chat aparece un botón para escuchar cada respuesta.
- `responses.js`, `intents.js` y `content.js` pasan a correr también en Node,
  para que los clips salgan del mismo motor que responde en pantalla.
- El workflow se dispara además al editar `content/*.json`: publicar una
  noticia regenera el audio.
- Corrección: al reproducir un clip mientras sonaba otro, el botón pausaba el
  anterior en vez de arrancar el nuevo.

---

## v1.3.0 · 07-08-2026

- El boletín pasa a generarse con **Piper TTS** (voz `es_AR-daniela-high`) en
  GitHub Actions y se publica como MP3 y OGG en el repositorio.
- El reproductor prioriza el archivo grabado; la voz del navegador queda como
  respaldo.
- Marcas de tiempo por bloque para resaltar el guion mientras suena.
- Corrección: el archivo se reproducía a 1,15× por arrastrar un multiplicador
  pensado para la voz del navegador.

---

## v1.2.0 · 06-08-2026

- Fase 3: generador de guion radial separado del contenido, prosodia y pausas
  por bloque, normalizador de números y controles de velocidad.
- Reproducción con Web Speech API y guion siempre visible como texto.

---

## v1.1.0 · 06-08-2026

- Fase 2: edición personalizada (`pages/edicion.html`) e historia viva de la
  Ruta 22 (`pages/ruta22.html`), conectadas con el chat en las dos direcciones.
- `router.js` para las rutas relativas y `render.js` para las piezas de HTML
  compartidas.
- Corrección: los mensajes escritos mientras el agente respondía se perdían en
  silencio; ahora se encolan.

---

## v1.0.0 · 06-08-2026

- Fase 1: estructura del proyecto, las tres historias en JSON, simulador del
  canal WhatsApp y motor conversacional por reglas con dieciocho intenciones.
- Contenido de la Ruta 22 verificado con fuentes periodísticas y oficiales.
- La noticia deportiva queda marcada como ficticia en todos los formatos.

---

*Las versiones 1.0 a 1.5 se numeraron en retrospectiva, al incorporar este
historial en la 1.6. Las fechas corresponden al día de trabajo, no a
publicaciones separadas.*
