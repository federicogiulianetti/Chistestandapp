import { fmt } from '@/lib/accounts'
import { formatShowDate } from '@/lib/shows'
import { argentoresTotals, type ArgentoresEntry } from '@/lib/argentores'
import { toggleArgentoresCobrado } from '@/app/argentores/actions'

// Cuenta de Argentores: plata que recauda Argentores y el comediante cobra aparte (vía trámite).
// `canToggle` habilita marcar cobrado (admin / productor acompañante). El comediante lo ve read-only.
export default function ArgentoresLedger({
  entries,
  canToggle,
  revalidate,
}: {
  entries: ArgentoresEntry[]
  canToggle: boolean
  revalidate: string
}) {
  const totals = argentoresTotals(entries)

  return (
    <div className="space-y-4">
      {totals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {totals.map(t => (
            <div key={t.currency} className="contents">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-xs text-gray-400">Argentores total ({t.currency})</p>
                <p className="text-xl font-bold mt-1">{fmt(t.total, t.currency)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-xs text-gray-400">Cobrado</p>
                <p className="text-xl font-bold mt-1">{fmt(t.cobrado, t.currency)}</p>
              </div>
              <div className={`border rounded-lg p-4 ${t.pendiente > 0 ? 'bg-amber-900/20 border-amber-800' : 'bg-zinc-900 border-zinc-800'}`}>
                <p className="text-xs text-gray-400">Falta cobrar</p>
                <p className="text-xl font-bold mt-1">{fmt(t.pendiente, t.currency)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-gray-400 text-sm">
          No hay argentores cargado para estas fechas.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Sala</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Argentores</th>
                <th className="text-center px-4 py-2 text-sm font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{formatShowDate(e.show_date)}</td>
                  <td className="px-4 py-2 text-sm text-gray-300">{e.theater_name ?? e.city ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{fmt(Number(e.amount), e.currency)}</td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    {canToggle ? (
                      <form action={toggleArgentoresCobrado.bind(null, e.id, !e.collected, revalidate)}>
                        <button
                          type="submit"
                          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            e.collected
                              ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                              : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                          }`}
                        >
                          {e.collected ? '✓ Cobrado' : 'Pendiente'}
                        </button>
                      </form>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                        e.collected ? 'bg-green-900/40 text-green-300' : 'bg-zinc-800 text-gray-400'
                      }`}>
                        {e.collected ? '✓ Cobrado' : 'Pendiente'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
