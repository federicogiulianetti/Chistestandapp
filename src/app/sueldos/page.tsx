import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { staffBalance, fmtMoney, type StaffMovement } from '@/lib/staff'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'
import { createStaff } from './actions'

export default async function SueldosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-ink text-body p-8"><p className="text-red-400">Sueldos es privado (solo admin).</p></main>
  }

  const supabase = await createClient()
  const [{ data: staff }, { data: movements }] = await Promise.all([
    supabase.from('staff').select('id, name, role, is_active').order('name'),
    supabase.from('staff_movements').select('staff_id, amount, direction, currency'),
  ])

  const byStaff = new Map<string, StaffMovement[]>()
  for (const m of (movements ?? []) as (StaffMovement & { staff_id: string })[]) {
    const arr = byStaff.get(m.staff_id) ?? []
    arr.push(m)
    byStaff.set(m.staff_id, arr)
  }

  const inp = 'w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body'

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Sueldos</h1>
          <p className="text-faint mt-1">Cuenta corriente de cada persona de la productora. Lo que se le debe = cargos − pagos.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        <form action={createStaff} className="bg-surface border border-line rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Nueva persona</label>
            <input name="name" type="text" required placeholder="Nombre" className={inp} />
          </div>
          <input name="role" type="text" placeholder="Rol (ej: Filmmaker)" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <input name="alias_cbu" type="text" placeholder="Alias / CBU" className={inp} />
            <button type="submit" className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Crear</button>
          </div>
        </form>

        {(staff ?? []).length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">Todavía no cargaste a nadie.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(staff ?? []).map(s => {
              const color = comedianColor(s.name)
              const bals = staffBalance(byStaff.get(s.id) ?? [])
              return (
                <Link key={s.id} href={`/sueldos/${s.id}`} className="group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2" style={{ borderTopColor: color }}>
                  <PerformerAvatar name={s.name} size={42} />
                  <div className="text-[14px] font-semibold mt-3 truncate text-body">{s.name}</div>
                  {s.role && <div className="text-[11px] text-faint truncate">{s.role}</div>}
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-[10px] uppercase tracking-wide text-faint">Se le debe</div>
                    <div className="text-[14px] font-semibold text-body">
                      {bals.length === 0 ? '—' : bals.map(b => fmtMoney(b.balance, b.currency)).join(' · ')}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
