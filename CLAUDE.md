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

- Wikipedia REST API (`en.wikipedia.org/api/rest_v1/`): resumen e HTML de artículos
- MediaWiki Action API (`en.wikipedia.org/w/api.php`, siempre con `origin=*`): enlaces, búsqueda `morelike:`, `pageprops`
- Wikidata (`wbgetentities`): tipo de entidad (P31) a partir del Q-id
- Wikimedia Pageviews API: popularidad

Reglas obligatorias:
- Enviar la cabecera `Api-User-Agent` identificando la app y un contacto.
- Cachear respuestas (memoria + `localStorage` con TTL) y no lanzar ráfagas de peticiones.
- Verificar los endpoints en la documentación oficial actual antes de usarlos; algunos endpoints REST de Wikimedia están en migración.
- Atribución visible en cada artículo: enlace al original y licencia CC BY-SA. Las imágenes de Commons, con su autor y licencia.

## Convenciones

- Código, nombres y comentarios en inglés. Textos de interfaz en español.
- Lógica del motor de sugerencias en funciones puras y testeadas (Vitest).
- Pesos del scoring en un único archivo de configuración, fácil de ajustar.
- Toda escritura en `localStorage` pasa por una capa de almacenamiento con versión de esquema.
- No usar rayas largas (em dash) en ningún texto de interfaz.

## Fuera de alcance del MVP

Búsqueda, LLM, login/cuentas, pestaña de mapa, bifurcaciones, animaciones, exportar mapa, multidioma, monetización. El modelo de datos sí debe estar preparado para mapa y bifurcaciones.
