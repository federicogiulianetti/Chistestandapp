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
3. **🪑 Formatos especiales** — "Taburete"/"Longchamps" (Nico), "Evento Privado" (Campa/otros). Layout distinto; quedaron en `skip: formato`.
4. **👯 Shows de elenco** — "Hay Rabas" y "Los demás son un montón" son de **Campa + Agus** (dúo). Hoy están como solistas. Hay que: crear el elenco, reasignar esas fechas a `performer_type='elenco'`, y hacer que el Wrapped/RLS de cada comediante **incluya las fechas de elenco donde es miembro** (policy nueva en `shows` por `ensemble_members`).
5. Teatros de años viejos quedaron como "Ciudad (sala)" (placeholder) — el borderó viejo no traía el nombre. Unificar con los reales cuando se quiera.

## ⚙️ Config pendiente de Fede
- Cargar `SUPABASE_SERVICE_ROLE_KEY` en Vercel (ya está en `.env.local` local) para que las invitaciones funcionen en producción.
- Agregar redirect URLs en Supabase (Auth → URL Configuration): `http://localhost:3000/**` y `https://chistestandapp.vercel.app/**`.

## 🔧 Notas técnicas
- Índice `shows_theater_datetime_unique` es **parcial**: excluye importados (`notes not like 'import:%'`), así dos comediantes pueden compartir teatro+fecha en el histórico; las fechas reales siguen protegidas contra doble-booking.
- Borrar/recargar un comediante: `delete from account_movements where party_id='<id>'; delete from shows where comedian_id='<id>' and notes like 'import:%';` y re-correr el load (idempotente).
