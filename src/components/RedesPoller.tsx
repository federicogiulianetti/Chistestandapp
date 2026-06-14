'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkScrape } from '@/app/redes/actions'

/** Mientras hay scrapes corriendo, chequea cada 8s y refresca la página sola. */
export default function RedesPoller({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    let stop = false
    const tick = async () => {
      try { await checkScrape() } catch { /* noop */ }
      if (!stop) router.refresh()
    }
    const t = setInterval(tick, 8000)
    return () => { stop = true; clearInterval(t) }
  }, [active, router])

  if (!active) return null
  return (
    <div className="bg-amber-900/20 border border-amber-800 text-amber-200 rounded-xl px-4 py-3 mb-6 text-sm">
      Actualizando datos en segundo plano… puede tardar 1-2 minutos. La página se refresca sola.
    </div>
  )
}
