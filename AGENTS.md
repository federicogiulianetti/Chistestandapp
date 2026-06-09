# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Chiste Stand App — Documento Maestro del Proyecto

> Documento de base / visión completa del proyecto. Pensado para darle a Claude Code (o a cualquier Claude) como **cimiento**, para que entienda el proyecto "de raíz" antes de construir. Idioma de trabajo: **español**. Términos técnicos: **en inglés**. Última actualización: junio 2026.

---

## 1. Qué es Chiste Stand App

Es la plataforma operativa de **Chiste Stand Up** (productora de stand-up comedy de Federico Giulianetti). El objetivo es centralizar y **optimizar toda la operación** de producir shows de comedia en vivo: comediantes, salas, fechas, ventas, plata, tareas del equipo y, a futuro, automatizaciones (WhatsApp, calendario, búsqueda de pasajes, métricas de redes).

No es solo un CRM de carga de datos: la visión a largo plazo es que sea un **asistente operativo** que le diga a cada persona del equipo qué hacer cada día y ayude a tomar decisiones (qué fechas conviene reforzar, cómo armar el calendario del año, etc.).

**Es una PWA** (se usa desde el navegador, también en celular).

---

## 2. Usuarios y roles

El sistema es **multi-usuario con permisos**. Cada persona ve solo lo que le corresponde. Roles previstos:

- **Admin / Dueño (Federico)** — ve y administra todo. Único que ve el módulo de ganancias propias (punto 11).
- **Administración (ej. Aye)** — acceso amplio a operación (fechas, borderós, ventas, gastos) pero no necesariamente a la plata personal de Federico.
- **Productor / Productor acompañante** — ve sus fechas asignadas, sus tareas, los comediantes que tiene asignados, su cuenta corriente.
- **Comediante** — ve su propio historial (Wrapped), sus fechas, sus borderós, su cuenta corriente, sus métricas de redes. **Solo lo suyo.**
- **Diseñador** — ve sus tareas (ej. flyers de cada fecha).

> **Principio clave de seguridad:** los permisos se resuelven a nivel base de datos con **Row Level Security (RLS)** de Supabase, no solo escondiendo botones en la UI. Cada usuario tiene un `profile` con un `role`, y las queries filtran por lo que esa persona puede ver.

---

## 3. Stack técnico

**Ya en uso:**

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — base de datos (Postgres), autenticación (auth) y storage (fotos)
- **Vercel** — deploy automático (push a GitHub → deploy)
- **Google Maps APIs** — JavaScript, Places (autocomplete), Geocoding, Embed
- Repo: `github.com/federicogiulianetti/Chistestandapp` · Live: `chistestandapp.vercel.app`

**Integraciones externas a sumar (a futuro, por fases):**

- **Google Calendar API** — crear eventos automáticos por fecha (puntos 4 y 12)
- **WhatsApp Business API** (Meta) o proveedor tipo **Twilio** — bot de tareas (punto 13)
- **API de vuelos** (Amadeus, Kiwi/Tequila, etc.) — buscador de ofertas de pasajes
- **APIs de redes sociales** — Meta Graph (Instagram), TikTok, YouTube Data API — métricas (punto 10)
- **IA (Claude API)** — el agente que arma resúmenes y da consejos en los dashboards (punto 13)

---

## 4. Estado actual (lo que YA está construido)

### ✅ Módulo Comediantes y Elencos

- **Comediantes solistas** y **Elencos** (ensembles con miembros).
- Comediantes tienen flag `performs_solo`.
- Listado unificado `/comedians` con sección de solistas y sección de elencos (ambas como tabla: nombre, miembros/ciudad, redes, estado, acciones).
- Botones **Ver** (solo lectura, `?ver=1`) y **Editar** (solo admin).
- Confirmación antes de borrar.
- Formularios con emojis en títulos y campos.

### ✅ Módulo Teatros (Salas)

- Tabla `theaters` en Supabase con ~50 campos, organizada en secciones: general, boletería/ticketing, técnica, camarines, contactos, cartelería, acuerdo económico (arreglo), emergencias/servicios, estacionamiento, fotos, notas.
- `TheaterForm.tsx` compartido (alta + edición) con **Google Places autocomplete** en el nombre del teatro (autocompleta dirección, ciudad, provincia, país, URL de Maps).
- Campos dinámicos multi-entrada: restaurantes cercanos, estacionamientos cercanos.
- **Fotos** (fachada / sala / camarines) → bucket `theater-photos` en Supabase Storage.
- **Mapa embebido** (Google Maps Embed) y links de **"Cómo llegar"** a Google Maps y Waze, generados desde la dirección.
- Listado `/theaters` con columnas País / Provincia / Ciudad / Capacidad, **buscador y filtros** (provincia, ciudad, capacidad mínima), banderas de país (imágenes de flagcdn).
- Pantalla **Ver** (`/theaters/[id]/ver`) de solo lectura con toda la info + fotos + mapa.

### ✅ Base / infraestructura

- Auth con Supabase, `getUserAndProfile()` devuelve `{ profile }`, `profile.role === 'admin'`.
- Convenciones de UI ya establecidas (ver sección 8).

> **Nota:** los comediantes/elencos tienen el formulario inline en las páginas; los teatros usan un componente `TheaterForm` compartido. A futuro conviene unificar el patrón (componentes de formulario compartidos por entidad).

---

## 5. Modelo de datos (entidades principales)

Esta es la columna vertebral. La entidad **central y keystone es** `shows` **(Fechas)**: casi todo cuelga de tener las fechas cargadas.

### Entidades ya existentes

- `profiles` — usuarios + `role` (admin, productor, comediante, diseñador, administracion).
- `comedians` — comediantes solistas (datos, redes, `performs_solo`, `is_active`).
- `ensembles` + `ensemble_members` — elencos y sus integrantes.
- `theaters` — salas (~50 campos, ver sección 4).

### Entidades nuevas a crear (por fases)

- `hotels` — hoteles por ciudad/provincia/país; preferencias por comediante; si hay canje. (Punto 3)
- `shows` **/** `fechas` ⭐ keystone — fecha, ciudad, teatro (`theater_id`), comediante o elenco (`performer_id` + tipo), arreglo económico, estado (tentativa / confirmada / hecha / cancelada), si está pautada, capacidad de sala (viene del teatro), notas. Vincula casi todo.
- `ticket_sales` **/** `ventas` — ventas por fecha, idealmente con registro **día a día** para reconstruir la curva de venta y la ocupación. (Puntos 1 y 9)
- `borderos` — borderó por fecha (descargable). (Punto 2)
- `accounts` **/** `cuentas_corrientes` + `transactions` — saldos y movimientos por persona (comediante/productor). (Punto 2)
- `expenses` **/** `gastos` — gastos por fecha, con lógica de **repartir un gasto entre varias fechas**. (Punto 7)
- `tasks` — tareas asignadas a personas del equipo, con estado, responsable, fecha límite, vínculo opcional a un `show`. (Puntos 6 y 13)
- `ad_campaigns` **/** `campañas` — ads por fecha/comediante. (Punto 5)
- `assignments` — relación productor ↔ comediante (organigrama). (Punto 8)
- `social_metrics` — snapshots semanales de redes por comediante (seguidores, engagement, por plataforma). (Punto 10)
- `earnings` — lo que gana Federico por cada comediante (solo admin). (Punto 11)
- `calendar_links` — relación entre un `show` y los eventos creados en Google Calendar de cada persona. (Puntos 4 y 12)

### Relaciones clave

- Un **show** pertenece a un **theater** y a un **comediante o elenco**.
- Un **show** tiene muchas **ventas** (día a día), un **borderó**, muchos **gastos**, muchas **tareas**, una o varias **campañas**.
- Un **comediante** tiene muchos **shows**, una **cuenta corriente**, **métricas de redes**, **productores asignados** (assignments).
- Un **gasto** puede repartirse entre **varios shows**.

### Arquitectura de los módulos de plata (Ventas / Gastos / Borderós)

Todo en la operación cuelga de la **fecha** (`shows`, módulo keystone). Los tres módulos de plata se separan así:

- **Ventas** (tabla propia, FK a `shows`): registra las entradas vendidas por fecha, idealmente **día a día** para reconstruir la curva de venta. Distingue **vendidas** (pagas) de **cortesías** (regaladas) — las cortesías ocupan butaca pero **no cuentan para la liquidación**. De acá salen la ocupación, la curva de venta y el indicador "viene bien/mal".
- **Gastos** (tabla propia, FK a `shows`): registra las líneas de gasto por fecha (categoría + monto). Debe soportar el caso de un **gasto que se reparte entre varias fechas** (punto 7 del roadmap). Son datos de entrada que se cargan a medida que ocurren.
- **Borderós** (capa de **cálculo**, no de datos crudos): lee de `shows` (el arreglo: `deal_type`/`deal_fixed`/`deal_percentage`, ya editable por fecha), de **Ventas** y de **Gastos**, y produce la liquidación de la fecha:
  - liquidación = (entradas vendidas × precio) → aplica el arreglo (fijo o %) → resta los gastos asociados → **neto**.
  - El borderó es **descargable (PDF)** y consultable por comediantes y admin (cada uno lo suyo). No guarda datos crudos; a lo sumo guarda el **snapshot/PDF final**.

**Orden de construcción:** Ventas → Gastos → Borderós (el borderó va último porque depende de los otros dos).

**Precarga del histórico:** los datos viejos están en planillas en formato **"ancho"** (una columna por show, con filas de ventas/gastos/arreglo). La base es **"larga"** (una fila por show + filas relacionadas), así que la precarga deberá **transponer** ese formato.

---

## 6. Módulos / Funcionalidades (los 13 puntos)

> Cada punto es un módulo. Acá está qué hace, quién lo ve y qué necesita.

**1. Ventas (próximas + históricas tipo "Wrapped")**

- *Próximas:* por cada fecha que viene → % de ocupación de sala, curva de venta por día, días que faltan, si está pautada, y un indicador de **"viene bien / mal"** comparando ocupación vs. días restantes.
- *Históricas:* estilo **Spotify Wrapped** para que cada comediante vea su historial: por sala, por año, por mes, cuántas veces actuó en cada ciudad, cuánta gente metió en un período o por ciudad.
- Datos viejos: Federico los tiene en planillas → **precarga** (importar). Las fechas nuevas se suman solas.

**2. Borderós + Cuentas corrientes**

- Borderós viejos (precarga) y nuevos, que comediantes / admin puedan **ver y descargar**.
- Cuentas corrientes: cada persona ve **solo la suya** (comediantes y productores).

**3. Listado de salas + Listado de hoteles**

- Salas: ✅ hecho (por ciudad/provincia/país, con arreglos).
- Hoteles: por ciudad/provincia/país, con **preferencias de cada comediante** y registro de **canjes**.

**4. Calendario de fechas + eventos en Google Calendar**

- Calendario propio del programa con todas las fechas cerradas de todos los comediantes.
- Genera un **evento en Google Calendar** a cada comediante y productor asociado, con toda la info de la fecha (ver punto 12).

**5. Campañas de publicidad / ads**

- Módulo con los ads que se ponen a cada fecha de cada comediante.

**6. Dashboard de tareas del equipo**

- Cada integrante ve **lo que le corresponde**.

**7. Dashboard de gastos por fecha**

- Cargar gastos de cada fecha y definir **en cuántas fechas se reparte** cada gasto.

**8. Organigrama del equipo**

- Todas las personas (comediantes + productores), tipo organigrama, mostrando **qué productores tiene asignados cada comediante**.

**9. Armado de calendarios tentativos del año siguiente** *(probablemente lo último)*

- Ayudar a armar las fechas tentativas del próximo año para todos los comediantes, evitando que **se repitan comediantes en la misma ciudad con pocos días de diferencia**.
- Regla: comediantes de la productora separados **~1 mes** en cada ciudad para no competir por público.
- Federico aporta condiciones por comediante (no todos van a todas las ciudades).
- Además, priorizar ciudades donde **fue bien** este año y dejar afuera donde fue flojo (depende de tener las ventas históricas — punto 1).

**10. Métricas de redes sociales (semanal) + tips**

- Semana a semana: si subieron/bajaron seguidores, engagement por publicación, si conviene postear más seguido en Instagram / TikTok / YouTube.
- **Consejos / tips semanales** para crecer en redes.

**11. Módulo de ganancias de Federico** *(privado, solo admin)*

- Lo que gana con cada comediante, con métricas (a definir a futuro).

**12. Eventos completos en Google Calendar por fecha**

- Por cada fecha creada, generar evento(s) con: día, ciudad, teatro, arreglo, info completa de la sala, **flyers** para redes, **pasajes de avión** (si corresponde), **reservas de hotel**, info de restaurantes cercanos, hospitales/comisarías/embajadas por emergencia.

**13. Dashboard personalizado por usuario + agente IA**

- Al loguearse, cada persona (productor, diseñador, administración, comediante) va primero a **su propio dashboard**.
- Un **agente** le da: resumen de tareas pendientes, cómo viene la semana y el mes, consejos de qué hacer, recordatorios, dónde poner el foco, y **qué estrategias de venta/comunicación** tomar según cómo vienen las ventas de cada fecha.

---

## 7. Integraciones externas (honestidad sobre complejidad)

Estas son las partes "grandes". Todas son posibles, pero cada una es **su propio proyecto** con servicios externos, costos y a veces aprobaciones. No se hacen de un saque.


| Integración               | Para qué                         | Servicio                         | Nota honesta                                                                                    |
| ------------------------- | -------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Google Calendar API**   | Eventos por fecha (puntos 4, 12) | Google Cloud (OAuth)             | Media. Requiere consentimiento OAuth de cada usuario para escribir en su calendar.              |
| **WhatsApp Business API** | Bot de tareas (punto 13)         | Meta WhatsApp Business / Twilio  | Alta. Requiere número aprobado, plantillas de mensaje aprobadas y tiene **costo por mensaje**.  |
| **API de vuelos**         | Buscador de ofertas              | Amadeus / Kiwi (Tequila)         | Alta. Acceso con registro; "encontrar ofertas" es lógica no trivial. Posible costo.             |
| **Redes sociales**        | Métricas semanales (punto 10)    | Meta Graph, TikTok, YouTube Data | La más difícil. APIs restrictivas, requieren permisos/revisión de app, y limitan qué datos dan. |
| **Claude API**            | Agente de dashboards (punto 13)  | Anthropic API                    | Media. Costo por uso. Es lo que genera los resúmenes y consejos.                                |


---

## 8. Convenciones y principios (para mantener consistencia)

- **UI en español**, términos técnicos en inglés.
- **Permisos por RLS** en Supabase, no solo escondiendo botones.
- **Soft delete / Papelera**: en vez de borrar de verdad, marcar `deleted_at` y filtrar; tener una papelera para restaurar. (Pendiente de implementar en todo.)
- **Confirmación antes de borrar** (ya implementado con `ConfirmSubmit`).
- **Campos deshabilitados** (solo lectura): estilo `bg-zinc-700 text-zinc-500`.
- **Patrón Ver / Editar**: `?ver=1` fuerza solo-lectura reusando los fieldsets deshabilitados.
- Componentes de formulario **compartidos** entre alta y edición (como `TheaterForm`); ir migrando a este patrón en todas las entidades.
- Fotos a **Supabase Storage** con buckets por entidad y RLS.
- Links de navegación (Maps/Waze) generados desde la **dirección** guardada.
- Emojis en títulos y labels para que sea amigable.
- Banderas de país como **imágenes** (flagcdn), no emojis (no renderizan en Windows).
- `params` y `searchParams` de Next.js son **Promises** (hay que `await`).

---

## 9. Roadmap por fases (orden sugerido de construcción)

El criterio: primero los **cimientos de datos**, después lo que cuelga de ellos, y al final las **integraciones externas** (más caras/complejas).

**Fase 0 — Base** ✅ *(en gran parte hecho)*

- Auth + roles + RLS sólido · Comediantes/Elencos · Teatros · Papelera/soft-delete (pendiente).

**Fase 1 — Keystone: Shows / Fechas** ⭐

- Módulo de fechas (la entidad central). Sin esto, no hay ventas, borderós, calendario ni gastos.
- Sumar **Hoteles** y el **Calendario interno** (visualización propia).

**Fase 2 — Ventas + Wrapped**

- Carga de ventas (día a día), ocupación, indicador "viene bien/mal".
- **Precarga** del histórico desde planillas.
- Vista "Wrapped" para comediantes.

**Fase 3 — Plata: Borderós + Cuentas corrientes + Gastos**

- Borderós (precarga + nuevos, descargables) · Cuentas corrientes por persona · Gastos por fecha con reparto.

**Fase 4 — Equipo: Tareas + Organigrama**

- Módulo de tareas · Organigrama productor↔comediante (assignments).

**Fase 5 — Google Calendar**

- Eventos automáticos por fecha (puntos 4 y 12).

**Fase 6 — Dashboards personalizados + agente IA**

- Dashboard por rol + agente (Claude API) con resúmenes y consejos (punto 13).

**Fase 7 — Campañas / ads** (punto 5)

**Fase 8 — Métricas de redes** (punto 10)

**Fase 9 — Bot de WhatsApp** (punto 13, parte mensajería)

**Fase 10 — Buscador de pasajes**

**Fase 11 — Armado de calendarios tentativos del año siguiente** (punto 9 — necesita ventas históricas)

**Fase 12 — Módulo de ganancias de Federico** (punto 11)

> El orden es una recomendación, no una regla. Lo importante: **Fechas primero**, integraciones externas al final.

---

## 10. Decisiones abiertas / a definir

- Contactos del teatro: ¿guardar como nombre + teléfono estructurado (para futuro WhatsApp)? Hoy son teléfonos sueltos con código de país.
- Formato exacto del borderó (qué campos, cómo se genera el PDF).
- Cómo se modela "arreglo económico" para que sirva tanto al borderó como a las ganancias (punto 11).
- Qué métricas exactas quiere Federico en el módulo de ganancias (las definirá a futuro).
- Reglas finas del armado de calendario del año siguiente (condiciones por comediante).

---

*Fin del documento maestro. Este archivo está pensado para evolucionar: a medida que se construyan módulos o se tomen decisiones, conviene actualizarlo para que siga siendo el "cimiento" fiel del proyecto.*