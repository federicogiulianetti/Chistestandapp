import Link from 'next/link'
import { generarAsistente } from '@/lib/ai/assistant'

type Profile = { id: string; role: string; full_name: string | null; email: string | null }

export function AsistenteSkeleton({ variant = 'full' }: { variant?: 'dashboard' | 'full' }) {
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/40 border border-zinc-800 rounded-2xl p-6 animate-pulse">
      <div className="h-6 w-2/3 bg-zinc-800 rounded mb-4" />
      <div className="h-4 w-full bg-zinc-800/70 rounded mb-2" />
      <div className="h-4 w-5/6 bg-zinc-800/70 rounded mb-2" />
      {variant === 'full' && (
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <div className="h-20 bg-zinc-800/50 rounded-xl" />
          <div className="h-20 bg-zinc-800/50 rounded-xl" />
        </div>
      )}
      <p className="text-xs text-gray-500 mt-4">🤖 Pensando en tu día…</p>
    </div>
  )
}

// Async server component: llama a la IA al renderizar. Envolvelo en <Suspense> con
// <AsistenteSkeleton/> como fallback para no bloquear el resto de la página.
export default async function AsistenteIA({ profile, variant = 'full' }: { profile: Profile; variant?: 'dashboard' | 'full' }) {
  const r = await generarAsistente(profile)
  const isAdmin = profile.role === 'admin'

  // Sin key configurada: solo el admin ve el recordatorio; el resto no ve nada raro.
  if (r.status === 'no-key') {
    if (!isAdmin) return null
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="font-semibold">🤖 Asistente IA</p>
        <p className="text-sm text-gray-400 mt-1">
          Falta configurar la <code className="text-gray-300">ANTHROPIC_API_KEY</code> para activar los consejos automáticos.
          Creá una key en console.anthropic.com y agregala en el entorno (local y Vercel).
        </p>
      </div>
    )
  }
  // Error puntual del modelo: el admin ve el aviso; al resto no le mostramos UI rota.
  if (r.status === 'error') {
    if (!isAdmin) return null
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="font-semibold">🤖 Asistente IA</p>
        <p className="text-sm text-amber-400/80 mt-1">No pude generar el panorama ahora mismo. Probá recargar en un rato.</p>
      </div>
    )
  }

  const equipoBlock = r.equipo.length > 0 ? (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Cómo viene el equipo</h3>
      <div className="space-y-2">
        {r.equipo.map((e, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-900/50 border border-indigo-800 flex items-center justify-center text-xs font-semibold">{e.persona.charAt(0).toUpperCase()}</span>
            <div>
              <p className="text-sm font-semibold">{e.persona}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{e.comentario}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900 border border-indigo-900/40 rounded-2xl p-6">
      <h2 className="text-2xl font-bold">{r.saludo}</h2>
      {r.resumen && <p className="text-gray-300 mt-2 leading-relaxed">{r.resumen}</p>}

      {r.destacados.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {r.destacados.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-emerald-900/30 border border-emerald-800/50 text-emerald-200 text-xs px-3 py-1.5 rounded-full">
              ✨ {d}
            </span>
          ))}
        </div>
      )}

      {variant === 'full' ? (
        <>
          {r.consejos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">En qué enfocarte</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {r.consejos.map((c, i) => (
                  <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <p className="font-semibold text-sm">{c.titulo}</p>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">{c.detalle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.pendientes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Lo que no se te puede pasar</h3>
              <ul className="space-y-1.5">
                {r.pendientes.map((p, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">›</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {equipoBlock}
        </>
      ) : (
        <>
          {equipoBlock}
          {(r.consejos.length > 0 || r.pendientes.length > 0) && (
            <Link href="/asistente" className="inline-block mt-5 text-sm text-indigo-300 hover:text-indigo-200">
              Ver consejos y dónde poner el foco →
            </Link>
          )}
        </>
      )}
    </div>
  )
}
