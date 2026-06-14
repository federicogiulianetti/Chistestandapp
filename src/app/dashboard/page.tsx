import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import {
  Mic2,
  Drama,
  CalendarDays,
  Calendar,
  BedDouble,
  TrendingUp,
  ReceiptText,
  Wallet,
  Lock,
  BadgeDollarSign,
  Megaphone,
  ListChecks,
  Network,
  Users,
  BarChart3,
  CalendarClock,
  Sparkles,
  Share2,
  Link2,
  Award,
  type LucideIcon,
} from 'lucide-react'
import { getUserAndProfile, roleLabels } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { getModuleAccess } from '@/lib/access'
import { logout } from '@/app/auth/actions'
import AsistenteIA, { AsistenteSkeleton } from '@/components/AsistenteIA'

type ModuleCard = {
  title: string
  description: string
  href: string
  Icon: LucideIcon
}

type ModuleGroup = {
  label: string
  modules: ModuleCard[]
}

const adminGroups: ModuleGroup[] = [
  {
    label: 'Operación',
    modules: [
      { title: 'Comediantes y Elencos', description: 'Gestioná comediantes solistas y elencos.', href: '/comedians', Icon: Mic2 },
      { title: 'Teatros', description: 'Salas, acuerdos y condiciones por teatro.', href: '/theaters', Icon: Drama },
      { title: 'Shows', description: 'Fechas, programación y estado de cada show.', href: '/shows', Icon: CalendarDays },
      { title: 'Calendario', description: 'Todas las fechas en una vista mensual.', href: '/calendar', Icon: Calendar },
      { title: 'Hoteles', description: 'Hoteles por ciudad, canjes y preferencias.', href: '/hotels', Icon: BedDouble },
    ],
  },
  {
    label: 'Plata',
    modules: [
      { title: 'Ventas', description: 'Curva diaria de ventas y métricas por show.', href: '/sales', Icon: TrendingUp },
      { title: 'Bordereaux', description: 'Todas las liquidaciones cerradas, con descarga.', href: '/borderos', Icon: ReceiptText },
      { title: 'Cuentas corrientes', description: 'Ganado, cobrado y saldo de cada persona.', href: '/cuentas', Icon: Wallet },
      { title: 'Mis ganancias', description: 'Lo que gana la productora por comediante. Privado.', href: '/ganancias', Icon: Lock },
      { title: 'Argentores', description: 'Lo que cada comediante cobra de Argentores.', href: '/argentores', Icon: BadgeDollarSign },
      { title: 'Ads / Publicidad', description: 'Gasto de pauta (Meta / Google) por fecha.', href: '/ads', Icon: Megaphone },
    ],
  },
  {
    label: 'Equipo y contenido',
    modules: [
      { title: 'Tareas del equipo', description: 'Asigná y seguí las tareas de cada integrante.', href: '/tareas', Icon: ListChecks },
      { title: 'Organigrama', description: 'Quién es quién y qué productores tiene cada comediante.', href: '/organigrama', Icon: Network },
      { title: 'Equipo y accesos', description: 'Invitá comediantes y equipo, y gestioná accesos.', href: '/equipo', Icon: Users },
      { title: 'Campañas / Ads', description: 'Campañas de publicidad por fecha y comediante.', href: '/campanias', Icon: BarChart3 },
      { title: 'Planificar año', description: 'Calendario tentativo del año que viene sin pisar ciudades.', href: '/planificacion', Icon: CalendarClock },
    ],
  },
  {
    label: 'IA e integraciones',
    modules: [
      { title: 'Asistente', description: 'Resumen de tareas, fechas y dónde poner el foco.', href: '/asistente', Icon: Sparkles },
      { title: 'Métricas de redes', description: 'Crecimiento en redes de cada comediante (requiere conexión).', href: '/redes', Icon: Share2 },
      { title: 'Google Calendar', description: 'Crear eventos por fecha en el calendar de cada uno (requiere conexión).', href: '/calendar-sync', Icon: Link2 },
    ],
  },
]

const comedianGroups: ModuleGroup[] = [
  {
    label: 'Tu actividad',
    modules: [
      { title: 'Asistente', description: 'Tu resumen: tareas, próximas fechas y saldo.', href: '/asistente', Icon: Sparkles },
      { title: 'Mis fechas', description: 'Tus shows con teatro, fecha y estado.', href: '/mis-fechas', Icon: CalendarDays },
      { title: 'Mis tareas', description: 'Lo que tenés pendiente.', href: '/tareas', Icon: ListChecks },
      { title: 'Mi Wrapped', description: 'Tu historial: salas, ciudades, público y más.', href: '/mi-wrapped', Icon: Award },
    ],
  },
  {
    label: 'Tu plata',
    modules: [
      { title: 'Mi cuenta corriente', description: 'Lo que llevás ganado, cobrado y lo que falta cobrar.', href: '/mi-cuenta', Icon: Wallet },
      { title: 'Mis borderós', description: 'Las liquidaciones cerradas de tus fechas.', href: '/mis-borderos', Icon: ReceiptText },
    ],
  },
]

export default async function DashboardPage() {
  const { profile } = await getUserAndProfile()
  const displayName = profile.full_name || 'usuario'
  const roleLabel = roleLabels[profile.role]

  let groups: ModuleGroup[]
  if (profile.role === 'admin') {
    groups = adminGroups
  } else if (profile.role === 'comediante') {
    groups = comedianGroups
  } else {
    // Resto de los roles: solo los módulos que el admin le habilitó (module_access)
    const supabase = await createClient()
    const allowed = await getModuleAccess(supabase, profile.id)
    groups = adminGroups
      .map(g => ({ ...g, modules: g.modules.filter(m => allowed.has(m.href.slice(1))) }))
      .filter(g => g.modules.length > 0)
  }

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="sr-only">Chiste Stand App — panel</h1>

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Image
              src="/chiste-logo-neon.png"
              alt="Chiste Stand App"
              width={150}
              height={66}
              priority
              className="h-12 w-auto rounded-lg"
            />
            <div>
              <p className="text-[15px]">
                ¡Hola, {displayName}!{' '}
                <span className="text-faint">Esto es lo que está pasando hoy.</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                  {roleLabel}
                </span>
                <span className="text-faint text-[11px]">{profile.email}</span>
              </div>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-md border border-line text-[13px] text-muted hover:text-white hover:border-zinc-600 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        {/* Asistente IA: saludo + resumen de cómo viene todo */}
        <section className="mb-10">
          <Suspense fallback={<AsistenteSkeleton variant="dashboard" />}>
            <AsistenteIA profile={profile} variant="dashboard" />
          </Suspense>
        </section>

        {/* Módulos agrupados */}
        <div className="space-y-9">
          {groups.length === 0 && (
            <div className="bg-surface border border-line rounded-xl p-10 text-center text-faint">
              Todavía no tenés módulos asignados. Pedile al admin que te dé acceso desde Equipo.
            </div>
          )}
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-3">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.modules.map(({ title, description, href, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-[#2a3d31] hover:bg-[#16201a]"
                  >
                    <Icon
                      className="h-[22px] w-[22px] text-muted transition-colors group-hover:text-brand"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-[13px] font-semibold mt-2.5 mb-1 text-body">{title}</h3>
                    <p className="text-[11px] leading-snug text-faint">{description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
