# Sismos MX

Últimos sismos en México en vivo.

## Qué muestra

- **Mapa** de México con un círculo por sismo: el tamaño indica la magnitud y el color la profundidad. Se acerca con los botones + y − o con Ctrl/Cmd + rueda, y se mueve arrastrando. Al pasar el puntero o al hacer clic aparece el detalle del sismo con enlace a su página en el EMSC.
- **Serie temporal** de las últimas 24 h: eventos por hora y magnitud de cada sismo. Al arrastrar sobre la gráfica se acota el periodo, y la selección se aplica al mapa, a la lista y a las estadísticas.
- **Lista** de los últimos 20 sismos; al elegir uno, el mapa se enfoca en él.
- **Estadísticas**: sismos visibles, magnitud máxima, eventos de la última hora y profundidad mediana.
- **Filtros**: magnitud, rango de fechas (con atajos de Última hora, 6 h, 12 h y 24 h), profundidad y región (Pacífico Sur, Occidente, Golfo de California y Baja California, Centro y Golfo de México).
- **Tema claro y oscuro**: sigue la preferencia del sistema y recuerda la elección.
- **Vista móvil** (menos de 768 px): panel inferior plegable con las pestañas «Últimos 20» y «Filtros».

Las horas se muestran en hora del centro de México.

## Fuente de datos

Los datos vienen del [EMSC](https://www.seismicportal.eu) (servicio de eventos `fdsnws` de seismicportal.eu, en JSON). La ruta `/api/sismos` consulta el servicio desde el servidor, normaliza los eventos y responde con una lista; el navegador nunca llama al EMSC directamente.

- **Rango consultado.** Según el rango de fechas del filtro: hasta 1 día pide las últimas 24 h, de 2 a 7 días la última semana y más de 7 días el último mes. El rango por defecto (ayer y hoy) usa las últimas 24 h. La consulta pide como máximo 2000 eventos.
- **Recorte a México.** Se piden los eventos de la caja entre las longitudes −118.5 y −86 y las latitudes 14 y 33. Después se descartan los que caen en tierra de Estados Unidos, Guatemala, Belice, Honduras o El Salvador (con los polígonos de `public/geo/mexico.topo.json`) y los que el EMSC nombra como un estado de Estados Unidos o un país vecino cuando no están sobre tierra mexicana.
- **Actualización.** Cada 60 s mientras la pestaña está visible y la actualización no está en pausa. Si una consulta falla se conservan los últimos datos y se reintenta a los 15, 30, 60 y 120 s (hasta 5 intentos); también se puede reintentar a mano. El servidor guarda cada respuesta 60 s.

Límites conocidos:

- Los polígonos de frontera están simplificados: un evento a pocos kilómetros de la frontera terrestre puede quedar del lado equivocado.
- En el mar solo se juzga por el nombre de la región que da el EMSC, así que un evento en aguas cercanas de Estados Unidos puede quedar si el nombre no lo delata.
- Los sismos pequeños están poco cubiertos (en las pruebas, la gran mayoría de los eventos mexicanos eran de M2 a M4). El filtro de magnitud mínima arranca en 2.5, por lo que los menores se ven al bajarlo hasta 2.0.
- Un mes muy activo podría superar el máximo de 2000 eventos por consulta; en ese caso se muestran los más recientes.

## Stack

| | Versión |
|---|---|
| Next.js (App Router) | 16.4.5 |
| React | 19.3.1 |
| TypeScript | 6.0.3 |
| D3 modular | d3-geo 3.1.2, d3-scale 4.0.3, d3-selection 3.0.1, d3-zoom 3.0.1, d3-transition 3.0.2, d3-ease 3.0.2, d3-interpolate 3.0.2, d3-shape 3.2.1, d3-brush 3.0.1, d3-quadtree 3.0.2 |
| Fronteras | topojson-client 3.1.0 |
| Lint | ESLint 9.39.5 |

Las versiones están fijas en `package.json`. Las pruebas usan el ejecutor integrado de Node (`node:test`).

**Arquitectura.** React es dueño del diseño y del estado; D3 es dueño de los nodos dentro del mapa y de la serie temporal. Cada actualización pasa datos nuevos a los módulos de D3 mediante referencias, sin volver a montar el árbol. Los filtros viven en la URL, de modo que recargar o compartir el enlace restaura la vista. Las agregaciones (eventos por hora y estadísticas) se calculan en un Web Worker.

```
app/            páginas, estilos y la ruta /api/sismos
components/     Dashboard, Header, mapa, serie temporal, lista, filtros, panel móvil
hooks/          useQuakeFeed, useFilters, useAggregation, useTheme, useD3, useMediaQuery
lib/            tipos y normalización (quakes.ts), recorte (clip.ts), filtros, estadísticas
lib/d3/         mapa SVG y Canvas, escalas, serie temporal, tooltip
workers/        aggregate.worker.ts
public/geo/     mexico.topo.json (fronteras simplificadas)
```

Las pruebas están junto al código, en `lib/**/*.test.ts`.

## Correrlo en local

Se desarrolló con Node 24.16 y npm 11.13; `package.json` no declara una versión mínima. No hacen falta variables de entorno, pero sí conexión a internet para que el servidor llegue al EMSC.

```bash
npm ci          # instala las dependencias
npm run dev     # servidor de desarrollo en http://localhost:3000
npm run build   # compilación de producción
npm start       # sirve la compilación (requiere build)
npm run lint
npm test
```

### Parámetros de la URL

Los filtros se guardan en la URL. Los valores mal formados se sustituyen por los de por defecto. En `mag` y `depth` los números se ajustan al rango y al paso, y si los dos extremos quedan iguales o invertidos se usa el valor por defecto; `w` se ignora si el inicio no es menor que el fin. Si falta una fecha, es inválida o `from` es posterior a `to`, se usa el rango por defecto (un solo día, con `from` igual a `to`, sí es válido).

| Parámetro | Formato | Por defecto | Significado |
|---|---|---|---|
| `mag` | `mín-máx`, por ejemplo `3-6.5` | `2.5-8` | Magnitud, entre 2 y 8, en pasos de 0.1 |
| `depth` | `mín-máx`, por ejemplo `0-70` | `0-700` | Profundidad en km, en pasos de 5 |
| `from` | `AAAA-MM-DD` | ayer | Primer día del rango |
| `to` | `AAAA-MM-DD` | hoy | Último día del rango |
| `region` | `sur`, `occ`, `golfo` o `centro` | todo México | Región; si falta se muestra todo México |
| `w` | `inicio-fin` en milisegundos Unix | sin selección | Periodo elegido en la serie temporal |

Ejemplo: `/?mag=3-8&region=sur`.

## Rendimiento

- Las agregaciones corren en un Web Worker; si el worker falla o no responde en 2 s, se calculan en el hilo principal.
- El mapa dibuja con SVG hasta 10 000 eventos visibles y con Canvas por encima de esa cifra; la etiqueta «Render» de la barra del mapa indica cuál se usa. El Canvas guarda la escena en una capa y solo redibuja los anillos de pulso.

## Accesibilidad

- Se puede recorrer la lista con el teclado: cada sismo es un botón, y elegirlo enfoca el mapa y fija el detalle, que se cierra con Esc.
- Los controles de filtro son elementos nativos y las pestañas del panel móvil responden a las flechas.
- Una región con `aria-live` anuncia los sismos nuevos de magnitud 4 o mayor.
- Con «reducir movimiento» activado se detienen el parpadeo del indicador, los pulsos del mapa, los esqueletos de carga y la transición del panel móvil.

## Despliegue

La producción se despliega desde la rama `main`.

## Licencia y atribución

Datos: [EMSC](https://www.seismicportal.eu). Los límites de países de `public/geo/mexico.topo.json` provienen de Natural Earth (dominio público), simplificados. Este repositorio todavía no declara una licencia.
