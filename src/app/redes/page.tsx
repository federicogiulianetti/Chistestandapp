import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'

export default async function RedesPage() {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-black text-white p-8"><p className="text-red-400">Sin permisos.</p></main>
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-3xl font-bold">Métricas de redes</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-3">
          <p className="text-gray-300">📊 Acá vas a ver, semana a semana, cómo crecen las redes de cada comediante (seguidores, engagement por publicación, en qué plataforma conviene postear más) y tips para crecer.</p>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-200">
            ⚠️ <strong>Requiere integración externa.</strong> Necesita conectar las APIs de Meta (Instagram), TikTok y YouTube — cada una pide registro de app y revisión de permisos. Es la integración más restrictiva, por eso quedó para una fase aparte.
          </div>
          <p className="text-xs text-gray-500">Cuando tengamos los accesos, este módulo guarda snapshots semanales por comediante y arma la comparación.</p>
        </div>
      </div>
    </main>
  )
}
