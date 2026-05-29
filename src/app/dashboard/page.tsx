import Link from 'next/link'
import { getUserAndProfile, roleLabels } from '@/lib/supabase/auth'
import { logout } from '@/app/auth/actions'

type ModuleCard = {
  title: string
  description: string
  href: string
  icon: string
  available: boolean
}

const modules: ModuleCard[] = [
  {
    title: 'Comediantes y Elencos',
    description: 'Gestioná comediantes solistas y elencos.',
    href: '/comedians',
    icon: '🎤',
    available: true,
  },
  {
    title: 'Teatros',
    description: 'Salas, acuerdos y condiciones por teatro.',
    href: '/theaters',
    icon: '🎭',
    available: false,
  },
  {
    title: 'Shows',
    description: 'Fechas, programación y estado de cada show.',
    href: '/shows',
    icon: '📅',
    available: false,
  },
  {
    title: 'Ventas',
    description: 'Curva diaria de ventas y métricas por show.',
    href: '/sales',
    icon: '💰',
    available: false,
  },
]

export default async function DashboardPage() {
  const { profile } = await getUserAndProfile()
  const displayName = profile.full_name || 'usuario'
  const roleLabel = roleLabels[profile.role]

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold">Chiste Stand App</h1>
            <p className="text-gray-400 mt-2">¡Hola, {displayName}! 👋</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-block bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-xs">
                {roleLabel}
              </span>
              <span className="text-gray-500 text-xs">{profile.email}</span>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md hover:bg-zinc-700 transition"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        {/* Módulos */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Módulos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              if (mod.available) {
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 hover:bg-zinc-800/50 transition group"
                  >
                    <div className="text-3xl mb-3">{mod.icon}</div>
                    <h3 className="font-semibold mb-1 group-hover:text-white">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-gray-400">{mod.description}</p>
                  </Link>
                )
              }
              return (
                <div
                  key={mod.href}
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-6 opacity-50 cursor-not-allowed"
                >
                  <div className="text-3xl mb-3">{mod.icon}</div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    {mod.title}
                    <span className="text-xs bg-zinc-800 text-gray-400 px-2 py-0.5 rounded-full">
                      Próximamente
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500">{mod.description}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}