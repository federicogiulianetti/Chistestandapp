import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'

export default async function CalendarSyncPage() {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-ink text-body p-8"><p className="text-red-400">Sin permisos.</p></main>
  }

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
        <h1 className="text-2xl font-bold">Sincronizar con Google Calendar</h1>
        <div className="bg-surface border border-line rounded-lg p-6 space-y-3">
          <p className="text-muted">Por cada fecha cerrada se crea un evento en el Google Calendar de cada comediante y productor, con toda la info: día, ciudad, teatro, arreglo, flyers, pasajes, hotel, restaurantes y datos de emergencia.</p>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-200">
<strong>Requiere integración externa.</strong> Necesita configurar OAuth de Google (cada persona autoriza escribir en su calendario). Es una fase aparte por la complejidad del consentimiento.
          </div>
          <p className="text-xs text-faint">El calendario interno del programa (todas las fechas) ya está funcionando en el módulo «Calendario».</p>
        </div>
      </div>
    </main>
  )
}
