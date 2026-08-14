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
## v1.11.0 · 12-08-2026

- **El diario pasa a llamarse "Tu Canillita".** Se saca "digital", que en 2026
  no dice nada y estorbaba en el boletín hablado. El repositorio y la URL
  quedan como están: la dirección técnica no tiene por qué coincidir.
- **Portada nueva (opción A).** `index.html` deja de ser el simulador de chat y
  pasa a ser la portada del diario: franja de temas arriba, nota principal con
  capitular, secundarias abajo y el boletín del día.
- Los temas se eligen tocando: la portada se rearma en el acto y la elección
  queda guardada. Los temas sin contenido se muestran apagados como "pronto",
  para no prometer secciones vacías.
- El simulador de chat se muda a `pages/chat.html`. La conversación de verdad
  vive en Telegram, y la portada la ofrece con "Conversá con el diario".
- `js/portada.js` y `js/router.js` con `homeUrl()`.

---
## v1.12.0 · 12-08-2026

- **Aparece el concepto de HILO**, distinto del de historia: la Ruta 22 son dos
  historias y un solo hilo. Seguir, navegar y personalizar pasan a hacerse por
  hilo. La tabla está en `js/content.js`.
- **`pages/hilo.html` + `js/hilo.js`**: página de historia viva genérica. Messi
  ya tiene la suya, y cualquier hilo nuevo la tiene con solo agregarlo a la
  tabla. La Ruta 22 conserva página propia porque funde dos historias.
- **Portada con dos vistas**: "Todo" muestra lo publicado; "Mi edición" filtra
  por los temas elegidos y es la que trae la franja de chips.
- **Barra de secciones dinámica**: se arma con los hilos cargados y se desliza
  cuando no entran. "Chat" pasa a llamarse "Conversá con el diario".
- **Un solo botón de seguir por hilo.** Antes la Ruta 22 ofrecía dos.
- Se saca el desplegable "Profundizar en esta historia": duplicaba el camino a
  la nota completa. Queda "Leer la historia completa", que abre la página del
  hilo.
- En la edición, los temas de "Tus temas" ahora llevan a su hilo.
- "Volver al chat" pasa a "Volver al inicio" en todas las páginas.
- El bot suma "Contame el hilo de Messi" a las opciones de arranque.

---
## v1.12.1 · 12-08-2026

- "Conversá con el diario" se separa del resto de la barra de secciones: no es
  una sección más, es la acción que distingue al producto. Va al final, con
  filete separador y en ocre.
- El chat suma la barra del canal con "Abrir en Telegram", igual que la
  portada: el simulador aclara que es una demostración y ofrece el canal real.

---
## v1.13.0 · 12-08-2026

**Fotos**

- Cada historia declara su foto en el JSON (`image`). Mientras el archivo no
  exista, se dibuja un espacio reservado que dice **qué foto hay que sacar**:
  más útil que un hueco y más honesto que una imagen de relleno.
- La nota principal lleva foto grande; las secundarias, miniatura al costado.
- La ficha de Messi aclara que requiere foto con licencia: no se usan imágenes
  de prensa sin autorización.

**Tipografía y color**

- Se saca la mayúscula de casi toda la interfaz: navegación, chips, botones,
  fechas, metadatos y velocidad pasan a caja baja. Queda solo donde comunica
  jerarquía: la chapa, las volantas y los títulos de bloque.
- La volanta deja de ser un recuadro ocre relleno y pasa a texto ocre. El ocre
  estaba en tantos lugares que había dejado de funcionar como acento.
- Los chips activos, el botón de seguir y las etiquetas de tema pasan a tinta.
- Jerarquía real en la portada: la principal casi duplica el cuerpo del título
  y las secundarias se achican de verdad.

---
## v1.14.0 · 12-08-2026

- Primeras fotos reales en las dos historias de la Ruta 22: los pozos con agua
  y la fila de vehículos sobre el tramo de calzada simple.
- Ilustración propia para el hilo de Messi
  (`assets/images/messi-tres-finales.svg`): las tres finales del mundo, con la
  de 2022 marcada como la única ganada. Se dibuja en vez de usar una foto de
  agencia, que requeriría licencia.
- Cuando una foto no tiene crédito cargado, el pie lo marca en rojo. Publicar
  una imagen sin autoría es un error, y el diseño ahora lo hace visible.
- "Abrir en Telegram" pasa a la barra superior del simulador, donde se ve sin
  tener que bajar hasta el pie.

---
## v1.14.1 · 14-08-2026

- Se agrega `.gitattributes` con `text=auto eol=lf`. Sin esto, los archivos
  guardados en Windows y los que genera el workflow en Linux se veían como si
  hubiera cambiado cada línea, y al unir las historias Git marcaba conflictos
  en todo el proyecto aunque el contenido fuera idéntico.

---
## v1.15.0 · 14-08-2026

**Contenido: de 4 a 7 historias**

- **La obra de agua más grande de Río Negro se hará en Roca** (Municipio):
  38.552 millones de pesos financiados por el CAF, cinco empresas en carrera.
  Fuente: LCR, 11-08-2026.
- **Menos fruta, mejores precios** (Fruticultura): la cosecha cayó 14%, los
  precios subieron hasta 87% y producir un kilo cuesta USD 0,34. Fuentes:
  LM Neuquén, Diario Río Negro, Diario Neuquino, Noti Río, Infocampo.
- **Frío polar, viento y hielo** (Clima y rutas): alertas del SMN, ráfagas de
  78 km/h en el valle y riesgo de hielo en las rutas 22, 23, 40 y 237.
  Fuentes: Diario Río Negro, NoticiasNQN.
- Los temas pasan a ser cinco: Ruta 22, Municipio, Fruticultura, Clima y
  Deportes. Policiales y Cultura siguen como "pronto".

**La personalización se vuelve visible**

- "Mi edición" muestra 4 de 7 historias: por primera vez filtrar cambia algo.
- Cada nota explica por qué está ahí: *"porque elegiste Ruta 22"* o *"porque
  seguís Agua en Roca"*. Solo en "Mi edición"; en "Todo" no hay criterio que
  explicar.
- Recuento arriba de la portada: *"De las 7 historias publicadas, estas 4 son
  las tuyas"*. El número sale del contenido cargado, así que no puede mentir.
- `storyReply()` en `responses.js`: plantilla genérica para hilos nuevos. Sumar
  un hilo ya no obliga a escribir una función por historia.

---
## v1.16.0 · 14-08-2026

- **Lectores de ejemplo** (`js/personas.js`): Mauro, vecino de Roca; Jorge,
  productor frutícola de Cervantes; y Diego, hincha de Cipolletti. Cambiar de
  lector reescribe las preferencias reales, así que la portada, la edición, el
  boletín y el chat cambian de verdad, no simulan cambiar.
  - Mauro ve 5 de 7 historias, boletín de 1 minuto.
  - Jorge ve 4: fruticultura, clima y Ruta 22. Boletín de 3 minutos, porque
    escucha en la camioneta.
  - Diego ve 2, las dos deportivas, con boletín de 30 segundos.
- La barra aparece en las cinco pantallas, sobre fondo tinta y con el rótulo
  "Ver la demo como", para que se lea como ayuda de demostración y no como una
  función del diario.
- Tocar los temas a mano desactiva la persona y pasa a "Yo".

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
