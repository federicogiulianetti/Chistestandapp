import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, arTime } from '@/lib/shows'
import CalendarView, { CalShow } from '@/components/CalendarView'

export default async function CalendarPage() {
  const { profile } = await getUserAndProfile()
  const canManage = profile.role === 'admin'

  const supabase = await createClient()
  const { data: shows } = await supabase
    .from('shows')
    .select('id, show_date, status, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name), city')
    .is('deleted_at', null)

  type Raw = {
    id: string
    show_date: string | null
    status: string | null
    performer_type: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
    theater: { name: string | null } | null
    city: string | null
  }

  const calShows: CalShow[] = ((shows ?? []) as unknown as Raw[]).map(s => ({
    id: s.id,
    dateKey: arDateKey(s.show_date),
    time: arTime(s.show_date),
    performer: s.performer_type === 'elenco'
      ? (s.ensemble?.name ?? '—')
      : (s.comedian?.stage_name ?? '—'),
    performer_type: s.performer_type,
    theater: s.theater?.name ?? '—',
    city: s.city,
    status: s.status,
  }))

  // Mes/día actual en hora de Argentina
  const todayKey = arDateKey(new Date().toISOString())
  const [ty, tm] = todayKey.split('-')
  const initialYear = Number(ty)
  const initialMonth = Number(tm) - 1

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-muted hover:text-body text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">Calendario</h1>
          </div>
          {canManage && (
            <Link
              href="/shows/new"
              className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition flex-shrink-0"
            >
              + Nueva fecha
            </Link>
          )}
        </div>

        <CalendarView
          shows={calShows}
          initialYear={initialYear}
          initialMonth={initialMonth}
          todayKey={todayKey}
        />
      </div>
    </main>
  )
}
