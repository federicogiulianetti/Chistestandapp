# Estado del proyecto — nota de continuidad

> Para retomar en una sesión nueva. Última actualización: jun 2026.
> Todo el código está en GitHub y la base en Supabase (proyecto `prphhtjuqjwcjdfujuug`).

## ✅ Módulos construidos y desplegados
- **Fase 0:** Comediantes/Elencos, Teatros.
- **Fase 1:** Shows/Fechas (con validaciones: bloqueo doble-booking + aviso ±20 días misma ciudad), Hoteles, Calendario interno.
- **Fase 2:** Ventas (curva día a día, ocupación, indicador), `/sales`.
- **Fase 3 (plata):** Gastos (lista fija + sueltas + reparto entre fechas), Ads (Meta/Google + 30% impuestos digitales), **Borderós** (motor de liquidación verificado contra planilla real: impuestos → reparto sala → gastos → reparto artista, con cierre/snapshot), Cuentas corrientes (ganado/cobrado/saldo + pagos manuales), Ganancias (admin), Campañas.
- **Fase 4 (permisos):** Invitaciones por email (`/equipo`, requiere `SUPABASE_SERVICE_ROLE_KEY`), RLS por rol (admin total; comediante ve solo lo suyo), dashboards por rol, `/mi-cuenta`, `/mis-fechas`, `/mis-borderos` (vista segura), `/mi-wrapped`.
- **Otros:** Tareas, Organigrama/Asignaciones, Planificación (conflictos de ciudad), Asistente (resumen real), `spectacle` por fecha + filtro en Wrapped.
- **Placeholders (requieren integración externa):** Métricas de redes, Google Calendar, Agente IA.

## 📦 Precarga histórica de borderós (en curso)
Pipeline en `C:\Users\feder\AppData\Local\Temp\xlsxtool\import-all.js` (Node + SheetJS, usa service-role de `.env.local`). **Idempotente** (re-correr no duplica). Marca las fechas con `notes = 'import:<año>'`. Loads con `node import-all.js load <comediante>`.

**Cargado y validado (saldo $0 cada uno):**
| Comediante | id | Fechas | Espectáculos (size→nombre) |
|---|---|---|---|
| Nicolás De Tracy | 9d44b74b-cca2-45bd-a823-ace7af3e9c7a | 576 (2020-25) | 11887=Crónico, 1024735=Artesanal, 150953/20807/34224=Anécdotas, 32379=Probando material |
| Ezequiel Campa | 10e70a61-ce7b-41b3-a90b-9873c8e2c0cf | 514 (2020-25) | 414824=Cheto y Choto, 58408/29531/71201=Sí pero no, 47833=Todo Navidad, 270980=Hay Rabas |
| Lucas Upstein | b5aea018-ed4f-4f18-8741-c17e759550dd | 382 (2021-25) | 248947=Atropelló mató y huyó, 22606=Ya no se puede decir todo, 76451/68481=Ángel Caído |
| Juan Barraza | eefbdf39-cc86-4728-8741-1924b8e19382 | 224 (2023-25) | 34584=En un confuso episodio, 509685=Deslices y desmanes |
| Agustina Aguilar | a75b3e6d-f7c1-44fe-a961-5c1cfe7d2ec6 | 109 (2024-25) | 97970=Metanoia |
| Guillermo Selci | 33386b51-0c80-4950-bbc0-ebf25e2cbc9b | 24 (2023-25) | (flyer = solo su nombre → sin espectáculo) |
| Xamila Denise | 6d61f73e-ae8d-4e1e-a1b0-f41656d8b8dc | 39 (2024) | (flyer = solo su nombre → sin espectáculo) |

**Total: 1.868 fechas.** El espectáculo se identifica por el **tamaño de byte del flyer pegado** en cada tab (`xl/media/`). El parser banca 3 formatos (etiquetas en col A, col B corrida, y layout viejo 2020); calcula el neto desde el % del artista; detecta moneda; recupera funciones dobles (mismo día/sala → distinto horario).

## ⬜ Pendientes de la precarga (para la pasada de limpieza)
1. **Confirmar nombres de espectáculos** con Fede (sobre todo Selci/Xamila: ¿tienen título o actúan a secas?).
2. **🌎 Internacionales** (moneda extranjera) — excluidos en todos (`skip: moneda`). Falta: confirmar moneda por país (Chile, Uruguay, Perú, Colombia, México, España…) y cargarlos con su `currency`.
3. ~~**🪑 Formatos especiales**~~ ✅ **HECHO (jun 2026).** Loader aparte `load-formato.js` (extracción flexible: bruto + reparto de abajo artista/Producción). Shows con `notes='import:formato:<año>'`. Cargados:
   - **Campa: 13 eventos** (Evento Privado / Longchamps / bares como Pope Bar, Emily Daniels) — cachet fijo, Campa cobra su 80% (va a su cuenta). Total ganado ~$2,35M (con Nico).
   - **Nico: 24** = 2 donde cobra (Escobar 50% / Canning 60%) + **22 Taburete**. **Taburete** = ciclo en Taburete Bar donde Nico actúa para **probar material** pero **elige no cobrar** (su parte se la da al invitado que figura en el borderó; la productora cobra normal). Se cargan como fechas de Nico con `spectacle='Probando material'`, **ganancia $0** (sin movimiento de cuenta), pero **cuentan público y lugar** en su Wrapped. La parte de la productora queda en `productora_share`.
   - **Quedan para revisión manual (~7):** Barraza (Paseo La Plaza, Pacheco, Junín, Tigre) y Nico (NUN Rose, Wilde) — el parser agarró mal la línea del artista por layout corrido. **NY / CMX** (Nico) son internacionales que se colaban en formato → van al pendiente #2.
   - Idempotente (saltea por comediante+teatro+fecha existente). Fix relacionado: el skip `/podcast/i` del importador ahora aplica **solo a Campa/Agus** (Lucas tiene su propio podcast).
4. ~~**👯 Shows de elenco**~~ ✅ **HECHO (jun 2026).** Elenco **"Campa y Agus"** (id `63ab7aad-e4c1-4b2d-a5c6-fdb5af95acb4`, miembros Campa + Agus). Es el nombre del **grupo**; el nombre del show vive en `shows.spectacle` ("Hay Rabas" / "Los demás son un montón"). Renombrable en `/ensembles`.
   - **4 fechas de dúo**, todas `performer_type='elenco'`, `comedian_id=null`, `ensemble_id` del elenco, `artist_percentage=80`:
     - **Hay Rabas**: 2024-01-17 San Bernardo y 2024-01-18 Villa Gesell (solo en planilla de Campa).
     - **Los demás son un montón** (podcast en vivo): 2024-10-27 y 2025-08-20.
   - **Arreglo real del dúo = 40% Campa + 40% Agus + 20% producción** (lo confirmó Fede; figura así en cada borderó). Cada uno cobra **solo su 40% limpio** (la línea "Campa + Argentores" del borderó es informativa, no va a la cuenta — ver corrección argentores en Notas técnicas). Plata por fecha (saldo $0 c/u, ya cobrado):
     - Hay Rabas San Bernardo: Campa $117.287,94 · Agus $117.287,94.
     - Hay Rabas Villa Gesell: Campa $196.536,23 · Agus $196.536,23.
     - Podcast 2024: Campa $77.920 · Agus $77.920.
     - Podcast 2025: Campa $596.930,02 · Agus $596.930,02.
   - **El podcast estaba duplicado** (cargado en la planilla de Campa y la de Agus, mismo evento) → se **fusionó en un solo show** por fecha (se borró el duplicado de Agus con sus ventas/borderó/movimientos) para no doble-contar recaudación ni público.
   - **Bug de la precarga corregido:** los montos importados de "Hay Rabas" estaban mal parseados (layout de doble neto); se recalcularon desde la planilla real.
   - **Visibilidad (RLS):** policies nuevas en `shows` (comediante y productor por `ensemble_members`), `ticket_sales` extendida con `union`, y vista `my_borderos` extendida (para elenco muestra **la parte propia** del miembro vía `account_movements`, no el total). Cada miembro ve la fecha/borderó/ventas en su Wrapped, Mis fechas y Mis borderós.
   - `cerrarBordero` ahora reparte `artista_final` en partes iguales entre los miembros del elenco (con `artist_percentage=80` → 40% c/u).
   - ⚠️ **El importador (`import-all.js`) NO debe recrear estos shows:** se parchearon `extract()` (saltea tabs `/podcast/i` → `skip:'elenco'`) y el loop (saltea `spectacle==='Hay Rabas'`). Si se re-corre `load campa`/`load agus`, estos 4 eventos quedan en "revisar" y no se re-insertan como solista.
5. Teatros de años viejos quedaron como "Ciudad (sala)" (placeholder) — el borderó viejo no traía el nombre. Unificar con los reales cuando se quiera.

## ⚙️ Config pendiente de Fede
- Cargar `SUPABASE_SERVICE_ROLE_KEY` en Vercel (ya está en `.env.local` local) para que las invitaciones funcionen en producción.
- Agregar redirect URLs en Supabase (Auth → URL Configuration): `http://localhost:3000/**` y `https://chistestandapp.vercel.app/**`.

## 🔧 Notas técnicas
- Índice `shows_theater_datetime_unique` es **parcial**: excluye importados (`notes not like 'import:%'`), así dos comediantes pueden compartir teatro+fecha en el histórico; las fechas reales siguen protegidas contra doble-booking.
- Borrar/recargar un comediante: `delete from account_movements where party_id='<id>'; delete from shows where comedian_id='<id>' and notes like 'import:%';` y re-correr el load (idempotente).
- **Ganancias en USD real (jun 2026):** `/ganancias` ahora convierte cada borderó a dólares con la cotización (venta) de la **semana de la fecha** del show, para descontar la inflación (sumar pesos de años distintos no sirve). Regla: **blue hasta el 13/04/2025, oficial desde el 14/04/2025** (salida del cepo). Tabla `usd_rates(rate_date, blue_sell, oficial_sell)` precargada desde **Bluelytics** (`api.bluelytics.com.ar/v2/evolution.csv`, diario 2020→hoy) vía `load-usd.js` (idempotente; re-correr actualiza). Helper `src/lib/usd.ts` (`buildRateLookup` busca la última cotización ≤ fecha; `dateKeyOf`, `fmtUsd`). El módulo muestra USD real (principal) + ARS nominal (referencia). **Para mantener al día:** re-correr `load-usd.js` para sumar cotizaciones nuevas a medida que se cierran borderós nuevos.
- **Cuenta de Argentores (jun 2026):** tabla nueva `argentores_entries` (`show_id`, `comedian_id`, `amount`, `collected`, `collected_at`, `marked_by`, unique `(show_id, comedian_id)`). Es una **cuenta corriente aparte** por comediante: el argentores lo recauda Argentores y el comediante lo cobra por trámite (no es plata de la productora ni va a la cuenta principal). El **productor acompañante** y el **admin** marcan "cobrado"; el comediante lo ve read-only. UI: sección en `/cuentas/comedian/[id]` (admin), sección read-only en `/mi-cuenta` (comediante), y página `/argentores` (admin = todos; productor = sus asignados, vía `assignments`) con `ArgentoresLedger` + server action `toggleArgentoresCobrado`. RLS: admin todo; comediante lee lo suyo; productor lee/actualiza sus asignados. El motor del borderó (`cerrarBordero`) ahora manda el `%` del artista a la cuenta principal y el argentores (deducción `goes_to_artist`) a `argentores_entries` (upsert, conserva `collected`). **Argentores "por fuera"** (`por_fuera`): cuando el teatro no paga a la oficina y se lo da directo al comediante (8% en vez de 10%; el 2% era el costo del trámite). Se detecta por la etiqueta "Argentores por fuera/afuera" en la planilla; en la UI se muestra con badge 🔸 y leyenda para que **no se reclame en la oficina** (ya está cobrado directo). Hoy solo Nico tiene "por fuera" (29 fechas). **Precarga:** ~1.174 entradas extraídas de la línea "Argentores" de cada borderó (`import-all.js` → `findArgentores`, toma el monto, no el %); las 2 de Hay Rabas (dúo) van a Campa (hace el trámite). Re-correr `load <comediante>` re-vuelca argentores idempotente.
- **Corrección argentores (jun 2026):** la precarga había cargado en la cuenta corriente la línea **"Nombre + Argentores"** del borderó (% del comediante **+** el argentores que él paga), que es **solo informativa**. Lo correcto en la cuenta es **solo el % del comediante**. Se corrigieron **~1.171 borderós** de los 7 comediantes: `artista_final` y los dos movimientos (crédito + débito) se llevaron al **% limpio** = `total_neto × artist_percentage / 100`. Los saldos siguen en $0 (no cambia deudas); baja el "ganado" inflado. Root cause parcheado en `import-all.js` (usa `artistShare`, no `artistFinal`). Para re-detectar: `where notes like 'import:%' and performer_type='comedian' and abs(artista_final - total_neto*artist_percentage/100) > 0.01`.
- **Elenco / RLS:** un show de elenco se modela con `performer_type='elenco'`, `ensemble_id` seteado y `comedian_id=null`. La visibilidad de cada miembro sale de `ensemble_members` vía policies en `shows` ("comedian reads ensemble shows", "producer reads assigned ensemble shows"), `ticket_sales` ("comedian reads own ticket_sales", con `union` de fechas de elenco) y la vista `my_borderos` (rama `ensemble_id in (...)`). Al cerrar el borderó de un elenco, `cerrarBordero` acredita `artista_final / nº de miembros` a cada miembro (`source='bordero'`, mismo `bordero_id`), así re-cerrar mantiene el reparto.
