import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { getModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { comedianColor } from '@/lib/comedianColor'
import BorderosFechas from '@/components/BorderosFechas'

type RawBordero = {
  id: string
  show_id: string
  currency: string
  recaudacion: number
  artista_final: number
  productora_share: number
  show: {
    show_date: string | null
    city: string | null
    spectacle: string | null
    performer_type: string | null
    comedian_id: string | null
    theater: { name: string | null; city: string | null } | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
  } | null
}

export default async function BorderosPage({
  searchParams,
}: {
  searchParams: Promise<{ quien?: string; anio?: string }>
}) {
  const { user, profile } = await getUserAndProfile()
  const sp = await searchParams
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  // Enforcement: módulo habilitado + (no-admin) filtra por comedianes asignados
  let assigned: Set<string> | null = null
  if (!isAdmin) {
    const allowed = await getModuleAccess(supabase, profile.id)
    if (!allowed.has('borderos')) redirect('/dashboard')
    assigned = await getAssignedComedianIds(supabase, user.id)
  }

  // Supabase limita a 1.000 filas por consulta → paginar para traer TODOS los borderós
  const raw: RawBordero[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('borderos')
      .select('id, show_id, currency, recaudacion, artista_final, productora_share, show:show_id(show_date, city, spectacle, performer_type, comedian_id, theater:theater_id(name, city), comedian:comedian_id(stage_name), ensemble:ensemble_id(name))')
      .range(from, from + 999)
    const page = (data ?? []) as unknown as RawBordero[]
    raw.push(...page)
    if (page.length < 1000) break
  }
  let rows = raw.map(b => {
    const s = b.show
    const comediante = s?.performer_type === 'elenco' ? (s?.ensemble?.name ?? '—') : (s?.comedian?.stage_name ?? '—')
    return {
      id: b.id,
      show_id: b.show_id,
      fecha: s?.show_date ?? null,
      comediante,
      comedian_id: s?.comedian_id ?? null,
      teatro: s?.theater?.name ?? null,
      ciudad: s?.city ?? s?.theater?.city ?? null,
      espectaculo: s?.spectacle ?? null,
      currency: b.currency,
      recaudacion: Number(b.recaudacion) || 0,
      artista_final: Number(b.artista_final) || 0,
      productora_share: Number(b.productora_share) || 0,
    }
  })
  // Filtro por comedianes asignados (no-admin)
  if (assigned) rows = rows.filter(r => r.comedian_id != null && assigned!.has(r.comedian_id))

  const quien = sp.quien ? decodeURIComponent(sp.quien) : null
  const anio = sp.anio ?? null

  // fotos (del módulo Comediantes / Elencos), mapeadas por nombre
  const [{ data: coms }, { data: ens }] = await Promise.all([
    supabase.from('comedians').select('stage_name, photo_url'),
    supabase.from('ensembles').select('name, photo_url'),
  ])
  const fotoDe = new Map<string, string>()
  for (const c of coms ?? []) if (c.stage_name && c.photo_url) fotoDe.set(c.stage_name, c.photo_url)
  for (const e of ens ?? []) if (e.name && e.photo_url) fotoDe.set(e.name, e.photo_url)

  // Avatar reutilizable: foto del comediante o inicial, con anillo de su color
  const avatar = (nombre: string, size = 44) => {
    const color = comedianColor(nombre)
    const foto = fotoDe.get(nombre)
    return foto ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nombre}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: `2px solid ${color}` }}
      />
    ) : (
      <span
        className="rounded-full flex items-center justify-center font-semibold shrink-0"
        style={{ width: size, height: size, border: `2px solid ${color}`, backgroundColor: color + '22', color, fontSize: size * 0.32 }}
      >
        {nombre.charAt(0)}
      </span>
    )
  }

  const cardCls = 'group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2'

  // --- Paso 3: fechas de un comediante + año (lista) ---
  if (quien && anio) {
    const color = comedianColor(quien)
    const fechas = rows.filter(r => r.comediante === quien && r.fecha?.slice(0, 4) === anio)
    return (
      <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 text-sm text-faint">
            <Link href="/borderos" className="hover:text-body">Bordereaux</Link>
            {' / '}<Link href={`/borderos?quien=${encodeURIComponent(quien)}`} className="hover:text-body">{quien}</Link>
            {' / '}<span className="text-body">{anio}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {avatar(quien, 48)}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{quien}</h1>
              <span className="text-sm font-semibold" style={{ color }}>Borderós {anio}</span>
            </div>
          </div>
          <p className="text-faint text-sm mb-6">{fechas.length} bordereau{fechas.length === 1 ? '' : 'x'}. Filtrá por teatro, ciudad o fecha.</p>
          <BorderosFechas rows={fechas} />
        </div>
      </main>
    )
  }

  // --- Paso 2: años de un comediante (tarjetas) ---
  if (quien) {
    const color = comedianColor(quien)
    const delQuien = rows.filter(r => r.comediante === quien)
    const porAnio = new Map<string, number>()
    for (const r of delQuien) {
      const y = r.fecha?.slice(0, 4) ?? '¿?'
      porAnio.set(y, (porAnio.get(y) ?? 0) + 1)
    }
    const anios = [...porAnio.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    return (
      <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-sm text-faint">
            <Link href="/borderos" className="hover:text-body">Bordereaux</Link>{' / '}<span className="text-body">{quien}</span>
          </div>
          <div className="flex items-center gap-3 mb-6">
            {avatar(quien, 48)}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{quien}</h1>
              <p className="text-faint text-sm">Elegí un año</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {anios.map(([y, n]) => (
              <Link key={y} href={`/borderos?quien=${encodeURIComponent(quien)}&anio=${y}`} className={cardCls} style={{ borderTopColor: color }}>
                <div className="text-2xl font-bold text-body">{y}</div>
                <div className="text-[11px] text-faint mt-1">{n} bordereau{n === 1 ? '' : 'x'}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // --- Paso 1: elegir comediante (tarjetas) ---
  const porQuien = new Map<string, number>()
  for (const r of rows) porQuien.set(r.comediante, (porQuien.get(r.comediante) ?? 0) + 1)
  const comedianes = [...porQuien.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Bordereaux</h1>
          <p className="text-faint mt-1">Elegí un comediante para ver sus liquidaciones.</p>
        </div>
        {comedianes.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">Todavía no hay bordereaux cerrados.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comedianes.map(([c, n]) => {
              const color = comedianColor(c)
              return (
                <Link key={c} href={`/borderos?quien=${encodeURIComponent(c)}`} className={cardCls} style={{ borderTopColor: color }}>
                  {avatar(c, 44)}
                  <div className="text-[14px] font-semibold mt-3 truncate text-body">{c}</div>
                  <div className="text-[11px] text-faint mt-0.5">{n} bordereau{n === 1 ? '' : 'x'}</div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
