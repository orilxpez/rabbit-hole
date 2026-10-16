# Prompt: MVP de Rabbit Hole

Lee primero `CLAUDE.md`. Vamos a construir el MVP de Rabbit Hole. Antes de escribir código, preséntame un plan breve (estructura de carpetas, módulos, orden de trabajo) y espera mi confirmación. Después trabaja por fases y para al final de cada una para que pueda revisar.

## Objetivo del MVP

Validar que la lectura engancha: que el usuario lee, llega a las sugerencias y encadena artículos. Todo lo demás es secundario.

## Funcionalidades

### 1. Onboarding visual
- Primera visita: rejilla de 8-10 artículos con imagen, título y una línea de descripción.
- El usuario marca los que le llaman (mínimo 3).
- Los artículos salen de `src/data/seeds.json`, cada uno con una etiqueta de interés (`architecture`, `history`, `science`...).
- La selección define los intereses iniciales del perfil.
- Crea `seeds.json` con unos 40 artículos de ejemplo variados; yo lo curaré después.

### 2. Semilla del día
- Pantalla de inicio para usuarios que vuelven: artículo del día (de una lista en `seeds.json`, rotando por fecha) y botón para continuar el último hilo.

### 3. Lector integrado
- Por defecto muestra solo la introducción del artículo (resumen de la REST API) con imagen principal.
- Botón "Leer artículo completo" que despliega el resto con las secciones plegadas.
- Limpieza del HTML de Wikipedia: quitar o simplificar infoboxes, navboxes, referencias y elementos de edición. Tipografía cuidada y legible en móvil.
- Los enlaces internos del texto no navegan a Wikipedia: abren el artículo dentro de la app (cuenta como elección del usuario).
- Atribución al pie: enlace al original y licencia.

### 4. Sugerencias
- Bloque de 3-4 sugerencias visible tras la introducción y al final del artículo.
- Cada tarjeta: título, imagen si existe, descripción corta, etiqueta de relación (ver motor) y la frase del artículo actual donde aparece el enlace, si la hay.

### 5. Motor de sugerencias (núcleo del MVP)
Funciones puras en `src/engine/`, con tests.

**Candidatos**
- Enlaces salientes del artículo (namespace 0).
- Resultados de `morelike:` para el artículo.

**Filtros (descartar)**
- Páginas de desambiguación, listas, años, fechas, países, estados soberanos. Usar `pageprops` y P31 de Wikidata. Verifica los Q-ids que uses.
- Artículos ya visitados por el usuario.

**Puntuación (pesos en `src/engine/weights.ts`)**
- Reciprocidad: el candidato enlaza de vuelta al artículo actual (señal fuerte). Comprobarlo solo para los mejores N candidatos para limitar peticiones.
- Posición: enlaces de la introducción puntúan más que los del final o "See also".
- Aparece también en `morelike:`: bonus.
- Popularidad media: penalizar candidatos con muy pocas visitas y también hubs extremadamente populares o enlazados.
- Afinidad: coincidencia con los intereses del perfil.
- Sugerido y no elegido: cada vez que un artículo se muestra como sugerencia y el usuario no lo elige, su puntuación futura se multiplica por un factor de decaimiento (por ejemplo 0,7 por cada vez). Persistir este contador.

**Selección final**
- Elegir 3-4 forzando diversidad: evitar dos sugerencias con el mismo tipo P31 cuando haya alternativa.
- Una de ellas, siempre que sea posible, fuera del perfil de intereses.

**Etiqueta de relación**
- Derivada de Wikidata cuando exista relación directa (mismo movimiento, influencia, creador, parte de, ubicación...). Si no, "Relacionado".

### 6. Historial como grafo
- Cada artículo visitado es un nodo: `title`, `qid`, `visitedAt`, `parentId`, `threadId`, `chosenFrom` (sugerencia, enlace del texto, semilla).
- Guardar también las sugerencias mostradas en cada nodo y cuál se eligió. Esto alimentará el mapa y las ramas no tomadas en la siguiente fase.
- Botón "Nuevo hilo": abre un hilo nuevo a partir de una semilla sin borrar nada.

### 7. Señales de lectura
- Registrar por artículo: tiempo activo de lectura (pausar si la pestaña no está visible), profundidad máxima de scroll, si abrió el artículo completo y qué secciones desplegó.
- Por ahora solo se guardan, salvo un ajuste suave de afinidad de intereses. Limitar el tamaño del log en `localStorage`.

### 8. Métricas locales
Una vista de depuración oculta (`/debug`) con: porcentaje de artículos en los que el usuario llegó a las sugerencias, artículos por sesión, número de hilos y el estado del almacenamiento.

## Fases

1. Estructura, capa de almacenamiento versionada, cliente de APIs con caché y `Api-User-Agent`.
2. Lector integrado y navegación entre artículos.
3. Motor de sugerencias con tests.
4. Onboarding, semilla del día, hilos.
5. Señales de lectura, vista `/debug`, pulido móvil y despliegue en Vercel.

## Criterios de aceptación

- Funciona en móvil y escritorio sin errores de consola.
- Ninguna petición sin caché se repite al volver a un artículo ya cargado.
- Las sugerencias nunca incluyen desambiguaciones, años ni países.
- Un artículo mostrado varias veces sin elegirse deja de aparecer en primeras posiciones.
- Los tests del motor pasan.

Si algo de este documento choca con una limitación técnica real, avísame y propón alternativa antes de cambiarlo.
