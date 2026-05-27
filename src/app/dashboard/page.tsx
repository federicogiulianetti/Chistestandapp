import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = user.user_metadata?.full_name || 'usuario'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Chiste Stand App</h1>
        <p className="text-xl mb-2">¡Hola, {fullName}! 👋</p>
        <p className="text-gray-400 mb-8">Estás logueado como <span className="text-white">{user.email}</span></p>

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