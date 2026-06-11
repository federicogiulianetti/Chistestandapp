import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getAnthropic } from '@/lib/ai/anthropic'
import { arDateKey } from '@/lib/shows'
import { buildRateLookup, usdBalances, type UsdRate } from '@/lib/usd'
import { roleLabels } from '@/lib/supabase/auth'

export interface AsistenteConsejo { titulo: string; detalle: string }
export interface AsistenteEquipo { persona: string; comentario: string }
export interface AsistenteResult {
  status: 'ok' | 'no-key' | 'error'
  saludo: string
  resumen: string
  destacados: string[]
  consejos: AsistenteConsejo[]
  pendientes: string[]
  equipo: AsistenteEquipo[]
  error?: string
}

type Profile = { id: string; role: string; full_name: string | null; email: string | null }

const MODEL = 'claude-opus-4-8'

const SYSTEM = `Sos el asistente de Chiste Stand App, la plataforma operativa de Chiste Stand Up, una productora de stand-up comedy argentina.
Tu trabajo es darle a cada persona del equipo, cuando entra al programa, un saludo cálido y un panorama claro de cómo viene todo, con foco en lo que tiene que hacer.

Tono: humano, cálido y cercano, como un buen jefe de producción que conoce a cada uno. Argentino, informal pero profesional. Nada de sonar robótico ni corporativo. Podés usar algún emoji con moderación. Tuteá (vos).

Qué tenés que producir, a partir de los DATOS que te paso (en JSON):
- saludo: una línea cálida saludando a la persona por su nombre.
- resumen: 2 a 4 oraciones sobre cómo vinieron los últimos días, RESALTANDO las buenas noticias (shows que vendieron bien, llenos, récords de público, plata cobrada). Si no hay nada bueno reciente, sé honesto pero alentador.
- destacados: lista corta (0 a 4) de hitos o buenas noticias puntuales, cada uno en una frase.
- consejos: lista de 2 a 5 recomendaciones concretas y accionables adaptadas al ROL de la persona y a lo que está pasando: dónde poner el foco, qué fechas reforzar, estrategias de venta/comunicación según cómo vienen las ventas, qué conviene cerrar o liquidar. Cada uno con titulo (corto) y detalle (1-2 oraciones, concreto).
- pendientes: lista corta (0 a 5) de cosas importantes propias que faltan o vencen pronto (tus tareas, fechas a liquidar, plata por cobrar/pagar). Priorizá lo que vence HOY o MAÑANA. Frases cortas.
- equipo: SOLO si la persona es admin o de producción Y el contexto trae "equipo_tareas". Una línea por cada integrante que tenga algo cargado, contando cómo viene y qué tiene pendiente (persona = nombre; comentario = 1-2 oraciones cálidas y concretas, mencionando si tiene cosas que vencen pronto o si está al día). Si la persona NO ve al equipo, devolvé equipo: [].

Reglas:
- Hablá SOLO de lo que está en los datos. No inventes nombres, números ni fechas.
- Si una fecha viene con baja ocupación y faltan pocos días, marcala como prioridad de venta y sugerí acción (más pauta, comunicación, etc.).
- Para comedianes, hablá de SUS fechas y SU plata. Para admin/producción, del equipo y la operación. Para productores, de sus asignados.
- Sé concreto y breve. Calidad sobre cantidad.`

const SCHEMA = {
  type: 'object',
  properties: {
    saludo: { type: 'string' },
    resumen: { type: 'string' },
    destacados: { type: 'array', items: { type: 'string' } },
    consejos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titulo: { type: 'string' }, detalle: { type: 'string' } },
        required: ['titulo', 'detalle'],
        additionalProperties: false,
      },
    },
    pendientes: { type: 'array', items: { type: 'string' } },
    equipo: {
      type: 'array',
      items: {
        type: 'object',
        properties: { persona: { type: 'string' }, comentario: { type: 'string' } },
        required: ['persona', 'comentario'],
        additionalProperties: false,
      },
    },
  },
  required: ['saludo', 'resumen', 'destacados', 'consejos', 'pendientes', 'equipo'],
  additionalProperties: false,
}

// Junta el contexto relevante según el rol. La RLS de Supabase ya filtra (admin ve todo,
// comediante solo lo suyo), así que las mismas queries devuelven el alcance correcto por rol.
async function buildContext(profile: Profile) {
  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const ago = new Date(now.getTime() - 21 * 86400_000).toISOString() // últimos 21 días
  const isAdmin = profile.role === 'admin'
  const sel = 'id, show_date, status, city, spectacle, capacity, theater:theater_id(name, city, capacity_platea, capacity_pullman), comedian:comedian_id(stage_name), ensemble:ensemble_id(name)'

  const [{ data: upRaw }, { data: recRaw }, { data: tasksRaw }] = await Promise.all([
    supabase.from('shows').select(sel).is('deleted_at', null).gte('show_date', nowIso).order('show_date', { ascending: true }).limit(12),
    supabase.from('shows').select(sel).is('deleted_at', null).lt('show_date', nowIso).gte('show_date', ago).order('show_date', { ascending: false }).limit(12),
    supabase.from('tasks').select('title, status, due_date, priority, assignee_id, created_at, assignee:assignee_id(full_name, email)').is('deleted_at', null).neq('status', 'hecha').order('due_date', { ascending: true, nullsFirst: false }).limit(40),
  ])

  type ShowRow = { id: string; show_date: string | null; status: string | null; city: string | null; spectacle: string | null; capacity: number | null; theater: { name: string | null; city: string | null; capacity_platea: number | null; capacity_pullman: number | null } | null; comedian: { stage_name: string | null } | null; ensemble: { name: string | null } | null }
  const up = (upRaw ?? []) as unknown as ShowRow[]
  const rec = (recRaw ?? []) as unknown as ShowRow[]
  const ids = [...up, ...rec].map(s => s.id)

  // sumar entradas vendidas por show
  const sold = new Map<string, number>()
  if (ids.length) {
    const { data: ts } = await supabase.from('ticket_sales').select('show_id, qty_sold').in('show_id', ids)
    for (const t of ts ?? []) sold.set(t.show_id, (sold.get(t.show_id) ?? 0) + (Number(t.qty_sold) || 0))
  }

  const capOf = (s: ShowRow) => s.capacity ?? (((s.theater?.capacity_platea ?? 0) + (s.theater?.capacity_pullman ?? 0)) || null)
  const perfOf = (s: ShowRow) => s.ensemble?.name ?? s.comedian?.stage_name ?? null
  const diasFalta = (d: string | null) => d ? Math.round((new Date(d).getTime() - now.getTime()) / 86400_000) : null
  const fmtShow = (s: ShowRow) => {
    const cap = capOf(s); const vend = sold.get(s.id) ?? 0
    return {
      fecha: s.show_date ? arDateKey(s.show_date) : null,
      ciudad: s.city ?? s.theater?.city ?? null,
      teatro: s.theater?.name ?? null,
      espectaculo: s.spectacle ?? null,
      comediante: isAdmin ? perfOf(s) : undefined,
      estado: s.status,
      capacidad: cap,
      vendidas: vend,
      ocupacion_pct: cap ? Math.round((vend / cap) * 100) : null,
    }
  }

  type TaskRow = { title: string; due_date: string | null; priority: string | null; assignee_id: string | null; created_at: string | null; assignee: { full_name: string | null; email: string } | null }
  const tasks = (tasksRaw ?? []) as unknown as TaskRow[]
  const fmtTask = (t: TaskRow) => ({ titulo: t.title, vence: t.due_date, prioridad: t.priority, cargada: t.created_at ? arDateKey(t.created_at) : null })

  const ctx: Record<string, unknown> = {
    hoy: arDateKey(nowIso),
    persona: { nombre: profile.full_name || 'equipo', rol: roleLabels[profile.role as keyof typeof roleLabels] ?? profile.role },
    proximas_fechas: up.map(s => ({ ...fmtShow(s), dias_para_la_fecha: diasFalta(s.show_date) })),
    fechas_recientes: rec.map(fmtShow),
    // las tareas propias de quien mira (para admin, las asignadas a él)
    tareas_pendientes: (isAdmin ? tasks.filter(t => t.assignee_id === profile.id) : tasks).map(fmtTask),
  }

  if (isAdmin) {
    // panorama del equipo: pendientes agrupados por persona
    const grupos = new Map<string, TaskRow[]>()
    for (const t of tasks) {
      const nombre = t.assignee?.full_name || t.assignee?.email || 'Sin asignar'
      if (!grupos.has(nombre)) grupos.set(nombre, [])
      grupos.get(nombre)!.push(t)
    }
    ctx.equipo_tareas = [...grupos.entries()].map(([persona, ts]) => ({ persona, pendientes: ts.map(fmtTask) }))

    const [{ data: hechas }, { data: cerrados }] = await Promise.all([
      supabase.from('shows').select('id, notes').eq('status', 'hecha').is('deleted_at', null),
      supabase.from('borderos').select('show_id'),
    ])
    const cerradosSet = new Set((cerrados ?? []).map(b => b.show_id))
    // solo fechas REALES (no la precarga histórica) sin borderó cerrado
    ctx.fechas_a_liquidar = (hechas ?? []).filter(h => !cerradosSet.has(h.id) && !String(h.notes ?? '').startsWith('import:')).length
  } else {
    // saldo de la persona (en USD real)
    const { data: com } = await supabase.from('comedians').select('id').eq('profile_id', profile.id).maybeSingle()
    const partyType = com ? 'comedian' : 'profile'
    const partyId = com ? com.id : profile.id
    const [{ data: movs }, { data: rates }] = await Promise.all([
      supabase.from('account_movements').select('direction, amount, currency, movement_date').eq('party_type', partyType).eq('party_id', partyId),
      supabase.from('usd_rates').select('rate_date, blue_sell, oficial_sell'),
    ])
    const usd = usdBalances((movs ?? []) as { direction: string; amount: number; currency: string; movement_date: string | null }[], buildRateLookup((rates ?? []) as UsdRate[]))
    ctx.mi_cuenta = { falta_cobrar_usd: Math.round(usd.saldo), ganado_usd: Math.round(usd.ganado), cobrado_usd: Math.round(usd.cobrado) }
  }

  return ctx
}

export async function generarAsistente(profile: Profile): Promise<AsistenteResult> {
  const client = getAnthropic()
  const base: AsistenteResult = { status: 'ok', saludo: '', resumen: '', destacados: [], consejos: [], pendientes: [], equipo: [] }
  if (!client) return { ...base, status: 'no-key' }

  try {
    const ctx = await buildContext(profile)
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Estos son los datos de hoy. Generá el panorama para esta persona.\n\n${JSON.stringify(ctx, null, 2)}` }],
    })
    const text = msg.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('Respuesta vacía del modelo')
    const parsed = JSON.parse(text.text) as Omit<AsistenteResult, 'status'>
    return { status: 'ok', ...parsed }
  } catch (e) {
    return { ...base, status: 'error', error: e instanceof Error ? e.message : String(e) }
  }
}
