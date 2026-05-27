import { getUserAndProfile, roleLabels } from '@/lib/supabase/auth'
import { logout } from '@/app/auth/actions'

export default async function DashboardPage() {
  const { profile } = await getUserAndProfile()

  const displayName = profile.full_name || 'usuario'
  const roleLabel = roleLabels[profile.role]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Chiste Stand App</h1>
        <p className="text-xl mb-2">¡Hola, {displayName}! 👋</p>

        <div className="inline-block bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-sm mb-2">
          {roleLabel}
        </div>

        <p className="text-gray-400 mb-8">{profile.email}</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-400 mb-2">Próximamente:</p>
          <p>Dashboard con shows, comediantes, ventas y más.</p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="px-6 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md hover:bg-zinc-700 transition"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  )
}