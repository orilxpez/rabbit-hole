# Rabbit Hole

Herramienta web de descubrimiento de conocimiento a partir de la Wikipedia en inglés. El usuario no busca: parte de una semilla (onboarding o artículo del día), lee y va eligiendo por dónde seguir. Cada recorrido se guarda como un grafo que más adelante se visualizará como mapa.

## Principios de producto

- Lo principal es **leer**. Nada debe interrumpir la lectura.
- No hay búsqueda. El punto de entrada son semillas.
- No se usa ningún LLM. Toda recomendación sale de datos de Wikipedia y Wikidata y debe poder justificarse con ellos.
- Sin login en el MVP. Todo se guarda en `localStorage`, con el esquema versionado para migrar a Supabase más adelante.
- Mobile first.

## Stack

- Vite + React + TypeScript
- CSS propio o CSS Modules (sin librerías de componentes pesadas)
- Despliegue estático en Vercel
- Sin backend: todas las llamadas a APIs públicas se hacen desde el navegador

## Fuentes de datos (gratuitas, sin clave)

- Wikipedia REST API (`en.wikipedia.org/api/rest_v1/`): resumen de artículos. El HTML de RESTBase (`page/html`) está migrando a `w/rest.php/v1/page/{title}/html`.
- MediaWiki Action API (`en.wikipedia.org/w/api.php`, siempre con `origin=*`): enlaces, búsqueda `morelike:`, `pageprops` y popularidad (`prop=pageviews`, por lotes de 50 títulos).
- Wikidata Query Service (SPARQL, `query.wikidata.org/sparql`): tipo de entidad (P31) y relaciones. No usar `wbgetentities` con claims: pesa unos 8 MB por cada 20 entidades.
- No usar la Pageviews REST API (`wikimedia.org/api/rest_v1/metrics/...`): su preflight CORS rechaza `Api-User-Agent` y pide una petición por título.

Reglas obligatorias:
- Enviar la cabecera `Api-User-Agent` identificando la app y un contacto.
- Cachear respuestas (memoria + `localStorage` con TTL) y no lanzar ráfagas de peticiones.
- Verificar los endpoints en la documentación oficial actual antes de usarlos; algunos endpoints REST de Wikimedia están en migración.
- Atribución visible en cada artículo: enlace al original y licencia CC BY-SA. Las imágenes de Commons, con su autor y licencia.

## Convenciones

- Código, nombres y comentarios en inglés. Interfaz en inglés por defecto, con selector EN/ES (`src/i18n.ts`); todo texto de interfaz nuevo va en ambos idiomas. Los artículos son siempre de la Wikipedia en inglés (`lang="en"`). La vista `/debug` es interna y está en español.
- Lógica del motor de sugerencias en funciones puras y testeadas (Vitest).
- Pesos del scoring en un único archivo de configuración, fácil de ajustar.
- Toda escritura en `localStorage` pasa por una capa de almacenamiento con versión de esquema.
- No usar rayas largas (em dash) en ningún texto de interfaz.

## Diseño

- Tema claro único, sin modo oscuro. Tokens en `:root` de `src/styles.css`.
- Fuentes de Fontshare: Switzer (interfaz y titulares) y Sentient (lectura).
- Página blanca y tinta negra pura. El marco clásico de las miniaturas de Wikipedia (`#F8F9FA`, borde `#C8CCD1`) es el elemento visual principal: imágenes, tarjetas y nodos del mapa. Las imágenes con transparencia siempre llevan fondo blanco.
- Un único acento: amarillo rotulador `#F0E000`, solo para selección, "estás aquí" y la palabra enlazada.
- Un solo elemento llamativo por pantalla: el título gigante en mayúsculas, justificado como un cartel (`<Display>` en `src/ui.tsx`). Etiquetas en minúscula, nunca en mayúsculas espaciadas.
- Imagen de marca: la "Liebre joven" de Durero (1502, dominio público, Commons) como trama de puntos (`src/data/hare.txt`), siempre con su crédito.
- Movimiento: View Transitions nativas entre pantallas (la miniatura elegida se convierte en la imagen del artículo), el mapa se dibuja en orden de lectura, los otros caminos se despliegan. Siempre se respeta `prefers-reduced-motion`.

## Recorrido

- Onboarding: una semilla entre 6 (una por interés, rotando cada día). Con un toque empieza el hilo.
- Tras leer, una sola salida ("down the hole") con la mejor sugerencia; las alternativas, plegadas en "otros caminos". Solo cuenta como mostrado lo que el lector ha visto.
- "Stop" cierra el hilo y lleva al mapa (`/map`). Volver a un nodo del mapa reabre el hilo desde ahí.

## Fuera de alcance del MVP

Búsqueda, LLM, login/cuentas, exportar mapa, monetización. Traducción de artículos al español: pendiente (propuesta: Microsoft Translator detrás de una función de Vercel). El modelo de datos sí debe estar preparado para mapa y bifurcaciones.
