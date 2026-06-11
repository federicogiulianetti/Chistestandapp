import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import AsistenteIA, { AsistenteSkeleton } from '@/components/AsistenteIA'

function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const inner = (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition h-full">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default async function AsistentePage() {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  const todayKey = arDateKey(new Date().toISOString())
  const isAdmin = profile.role === 'admin'

  // Tareas pendientes (RLS: admin todas, otros las suyas)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date')
    .is('deleted_at', null)
    .neq('status', 'hecha')
    .order('due_date', { ascending: true, nullsFirst: false })

  const openTasks = tasks ?? []

  // Próximas fechas (RLS filtra por rol)
  const { data: shows } = await supabase
    .from('shows')
    .select('id, show_date, status, theater:theater_id(name)')
    .is('deleted_at', null)
    .gte('show_date', new Date().toISOString())
    .order('show_date', { ascending: true })

  const upcoming = (shows ?? []) as unknown as { id: string; show_date: string | null; status: string | null; theater: { name: string | null } | null }[]

  // Para comediante / equipo: su saldo
  let saldoText = '—'
  if (!isAdmin) {
    const { data: com } = await supabase.from('comedians').select('id').eq('profile_id', user.id).maybeSingle()
    const partyType = com ? 'comedian' : 'profile'
    const partyId = com ? com.id : user.id
    const { data: movs } = await supabase
      .from('account_movements')
      .select('id, party_type, party_id, direction, amount, currency, movement_date, concept, source, show_id')
      .eq('party_type', partyType).eq('party_id', partyId)
    const bals = balancesByCurrency((movs ?? []) as Movement[])
    saldoText = bals.length ? bals.map(b => fmt(b.balance, b.currency)).join(' · ') : '$0'
  }

  // Para admin: fechas hechas sin borderó cerrado
  let pendientesLiquidar = 0
  if (isAdmin) {
    const [{ data: hechas }, { data: cerrados }] = await Promise.all([
      supabase.from('shows').select('id, notes').eq('status', 'hecha').is('deleted_at', null),
      supabase.from('borderos').select('show_id'),
    ])
    const cerradosSet = new Set((cerrados ?? []).map(b => b.show_id))
    // solo fechas reales (no la precarga histórica) sin borderó cerrado
    pendientesLiquidar = (hechas ?? []).filter(h => !cerradosSet.has(h.id) && !String(h.notes ?? '').startsWith('import:')).length
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">🤖 Tu asistente</h1>
          <p className="text-gray-400 mt-1">Resumen de cómo venís. Hoy es {todayKey}.</p>
        </div>

        {/* Panorama generado por IA */}
        <Suspense fallback={<AsistenteSkeleton variant="full" />}>
          <AsistenteIA profile={profile} variant="full" />
        </Suspense>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Tareas pendientes" value={openTasks.length} href="/tareas" />
          <Stat label="Próximas fechas" value={upcoming.length} href={isAdmin ? '/shows' : '/mis-fechas'} />
          {isAdmin
            ? <Stat label="Fechas a liquidar" value={pendientesLiquidar} href="/shows" />
            : <Stat label="Te falta cobrar" value={saldoText} href="/mi-cuenta" />}
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">📋 Tus tareas pendientes</h2>
          {openTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">¡Nada pendiente! 🎉</p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 8).map(t => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                  <span>{t.title}</span>
                  {t.due_date && <span className="text-gray-400 text-xs">📅 {t.due_date}</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">🗓️ Lo que se viene</h2>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay fechas próximas.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 6).map(s => (
                <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                  <span>{formatShowDate(s.show_date)} — {s.theater?.name ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-500">
          💡 El panorama de arriba lo arma un asistente con IA a partir de tus datos reales (ventas, fechas, tareas y cuentas).
        </p>
      </div>
    </main>
  )
}
