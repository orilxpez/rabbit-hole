# Rabbit Hole: hipótesis y experimentos

Hipótesis de fondo (del prompt del MVP): **la lectura engancha**. El usuario lee, llega a las sugerencias y encadena artículos.

Se descompone en tres eslabones. Si cualquiera falla, el producto falla, así que se prueban en orden de riesgo.

| Eslabón | Pregunta | Señal de comportamiento |
|---|---|---|
| 1. Leer | ¿Lee la introducción o rebota? | tiempo activo > 30 s, scroll hasta las sugerencias |
| 2. Seguir | ¿Elige una sugerencia o un enlace? | clic en sugerencia / enlace interno |
| 3. Volver | ¿Vuelve otro día sin que se lo pidan? | sesión nueva en día distinto |

## Hipótesis XYZ

**Mercado (Y):** lectores curiosos que ya caen en "rabbit holes" de Wikipedia por su cuenta. Reclutamiento concreto: 30 personas del círculo propio + un post en r/wikipedia o r/InternetIsBeautiful.

- **H1 (seguir):** al menos el **40 %** de los usuarios que completan el onboarding **encadenan 3 o más artículos** en su primera sesión.
- **H2 (leer):** en al menos el **50 %** de los artículos abiertos el usuario **llega a las sugerencias** (scroll o tiempo activo > 30 s).
- **H3 (volver, skin in the game = tiempo):** al menos el **25 %** de los usuarios **vuelven otro día** en los 7 días siguientes.

H3 es la única que mide compromiso real; H1 y H2 pueden salir bien por novedad.

## Experimentos

### E1. Mago de Oz: hilo curado a mano (antes del motor)

- **Prueba:** H1 y H2, aislando la calidad de las sugerencias del coste de construir el motor.
- **Método:** el lector (fases 1-2) con sugerencias **escritas a mano** en un JSON para ~10 artículos semilla y sus vecinos (3 niveles). Mismo diseño final, cero motor.
- **Métrica:** artículos encadenados por sesión; % de artículos donde se llega a las sugerencias.
- **Umbral:** ≥ 40 % encadena 3+. Si **ni con sugerencias curadas** se encadena, el problema es la lectura o el formato, no el algoritmo: no construir el motor todavía.
- **Coste:** 1-2 tardes de curación.

### E2. Semilla del día por correo (pretotipo de retorno)

- **Prueba:** H3 sin construir nada de retención.
- **Método:** durante 2 semanas, enviar a mano un correo diario a los 30 reclutados: imagen, primer párrafo de la semilla y 3 enlaces a la app.
- **Métrica:** CTR diario y % de personas que hacen clic 3+ días distintos.
- **Umbral:** CTR ≥ 20 % sostenido en la semana 2; ≥ 25 % con 3+ días de clic.
- **Coste:** 10 min/día.

### E3. MVP instrumentado (motor real vs. curación)

- **Prueba:** H1, H2 y H3 con el motor real, comparado con E1.
- **Método:** el MVP completo con las métricas de `/debug`. Como no hay backend, cada tester pulsa **"Copiar métricas"** en `/debug` y lo envía (JSON agregado, sin títulos leídos).
- **Métrica:** las de H1-H3, más la tasa de elección de sugerencias del motor frente a la de E1.
- **Umbral:** el motor alcanza ≥ 75 % de la tasa de encadenamiento de E1. Si no, ajustar `weights.ts` antes de añadir nada.

## Lo que no medimos a propósito

- Opiniones ("¿te gustaría...?"): no se pregunta, se observa.
- Datos de otros (tráfico de Wikipedia, apps parecidas): no dicen nada de esta idea.

## Limitación detectada

Las métricas viven en el `localStorage` de cada usuario, así que **no hay forma de agregarlas sin que el tester las envíe**.

Decisión: Vercel Web Analytics, con estos límites:
- Cada artículo es una ruta propia (`/a/<título>`), así que "páginas por visita" aproxima H1 incluso en el plan Hobby.
- H2 ("llegó a las sugerencias") necesita `track()`, que solo existe en los planes Pro y Enterprise.
- H3 (volver otro día) no se puede medir con Vercel: identifica visitantes con un hash que se renueva a diario. Se mide con "Copiar métricas" en `/debug` y con E2.
