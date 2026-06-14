import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { createTask, setTaskStatus, deleteTask } from './actions'

const STATUS = {
  pendiente: { label: '⏳ Pendiente', badge: 'bg-yellow-900/40 text-yellow-300' },
  en_curso: { label: '🔵 En curso', badge: 'bg-blue-900/40 text-blue-300' },
  hecha: { label: '✅ Hecha', badge: 'bg-green-900/40 text-green-300' },
} as const

const PRIORITY = {
  alta: { label: '🔴 Alta', badge: 'bg-red-900/40 text-red-300' },
  normal: { label: 'Normal', badge: 'bg-zinc-800 text-gray-400' },
  baja: { label: 'Baja', badge: 'bg-zinc-800 text-gray-500' },
} as const

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assignee: { full_name: string | null; email: string } | null
  show: { show_date: string | null; theater: { name: string | null } | null } | null
}

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  const isAdmin = profile.role === 'admin'

  const supabase = await createClient()
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assignee:assignee_id(full_name, email), show:show_id(show_date, theater:theater_id(name))')
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  const tasks = (tasksData ?? []) as unknown as TaskRow[]

  // Para el form (solo admin): asignables + shows
  let assignees: { id: string; label: string }[] = []
  let shows: { id: string; label: string }[] = []
  if (isAdmin) {
    const [{ data: profiles }, { data: showsData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
      supabase.from('shows').select('id, show_date, theater:theater_id(name)').is('deleted_at', null).order('show_date', { ascending: false }),
    ])
    assignees = (profiles ?? []).map(p => ({ id: p.id, label: p.full_name || p.email }))
    shows = ((showsData ?? []) as unknown as { id: string; show_date: string | null; theater: { name: string | null } | null }[])
      .map(s => ({ id: s.id, label: `${formatShowDate(s.show_date)} · ${s.theater?.name ?? '—'}` }))
  }

  const inp = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 text-white"

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">{isAdmin ? 'Tareas del equipo' : 'Mis tareas'}</h1>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        <form action={createTask} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
          <h2 className="text-lg font-semibold">{isAdmin ? '➕ Nueva tarea' : '➕ Anotá un pendiente'}</h2>
          {!isAdmin && <p className="text-xs text-gray-500">Lo que cargues acá es tuyo, y tu asistente te lo recuerda al día siguiente.</p>}
          <input name="title" type="text" required placeholder="¿Qué hay que hacer?" className={inp} />
          <textarea name="description" rows={2} placeholder="Detalle (opcional)" className={inp} />
          <div className={`grid grid-cols-1 gap-3 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
            {isAdmin && (
              <select name="assignee_id" className={inp}>
                <option value="">— Asignar a —</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            )}
            <select name="priority" defaultValue="normal" className={inp}>
              <option value="baja">Prioridad baja</option>
              <option value="normal">Prioridad normal</option>
              <option value="alta">Prioridad alta</option>
            </select>
            <input name="due_date" type="date" className={inp} />
            {isAdmin && (
              <select name="show_id" className={inp}>
                <option value="">— Fecha (opcional) —</option>
                {shows.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">{isAdmin ? 'Crear tarea' : 'Anotar'}</button>
          </div>
        </form>

        {tasks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-gray-400">
            {isAdmin ? 'No hay tareas cargadas.' : 'No tenés tareas asignadas.'}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => {
              const st = STATUS[t.status as keyof typeof STATUS] ?? STATUS.pendiente
              const pr = PRIORITY[t.priority as keyof typeof PRIORITY] ?? PRIORITY.normal
              return (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.description && <p className="text-sm text-gray-400 mt-0.5">{t.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded ${pr.badge}`}>{pr.label}</span>
                        {isAdmin && t.assignee && <span className="text-gray-400">👤 {t.assignee.full_name || t.assignee.email}</span>}
                        {t.due_date && <span className="text-gray-400">📅 {t.due_date}</span>}
                        {t.show && <span className="text-gray-400">🎭 {t.show.theater?.name ?? formatShowDate(t.show.show_date)}</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${st.badge}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {(['pendiente', 'en_curso', 'hecha'] as const).map(s => (
                      <form key={s} action={setTaskStatus.bind(null, t.id, s)}>
                        <button type="submit" disabled={t.status === s}
                          className={`px-2 py-1 rounded text-xs border transition ${t.status === s ? 'border-zinc-600 text-gray-500 cursor-default' : 'border-zinc-700 text-gray-300 hover:bg-zinc-800'}`}>
                          {STATUS[s].label}
                        </button>
                      </form>
                    ))}
                    <form action={deleteTask.bind(null, t.id)} className="ml-auto">
                      <ConfirmSubmit message="¿Eliminar esta tarea?" className="text-red-400 hover:text-red-300 text-xs">Eliminar</ConfirmSubmit>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
