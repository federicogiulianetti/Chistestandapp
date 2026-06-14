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
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Argentores total ({t.currency})</p>
                <p className="text-xl font-bold mt-1">{fmt(t.total, t.currency)}</p>
              </div>
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Cobrado</p>
                <p className="text-xl font-bold mt-1">{fmt(t.cobrado, t.currency)}</p>
              </div>
              <div className={`border rounded-lg p-4 ${t.pendiente > 0 ? 'bg-amber-900/20 border-amber-800' : 'bg-surface border-line'}`}>
                <p className="text-xs text-muted">Falta cobrar</p>
                <p className="text-xl font-bold mt-1">{fmt(t.pendiente, t.currency)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-6 text-muted text-sm">
          No hay argentores cargado para estas fechas.
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-line">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Sala</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Cómo se cobra</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Argentores</th>
                <th className="text-center px-4 py-2 text-sm font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{formatShowDate(e.show_date)}</td>
                  <td className="px-4 py-2 text-sm text-muted">{e.theater_name ?? e.city ?? '—'}</td>
                  <td className="px-4 py-2 text-sm whitespace-nowrap">
                    {e.por_fuera ? (
                      <span className="inline-flex items-center gap-1 text-orange-300" title="El teatro lo pagó directo (8%). NO reclamar en la oficina de Argentores.">
                        🔸 Por fuera <span className="text-faint">(directo, no reclamar)</span>
                      </span>
                    ) : (
                      <span className="text-muted" title="Se cobra en la oficina de Argentores.">Oficina de Argentores</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{fmt(Number(e.amount), e.currency)}</td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    {canToggle ? (
                      <form action={toggleArgentoresCobrado.bind(null, e.id, !e.collected, revalidate)}>
                        <button
                          type="submit"
                          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            e.collected
                              ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                              : 'bg-surface-2 text-muted hover:bg-surface-2'
                          }`}
                        >
                          {e.collected ? '✓ Cobrado' : 'Pendiente'}
                        </button>
                      </form>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                        e.collected ? 'bg-green-900/40 text-green-300' : 'bg-surface-2 text-muted'
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

      {entries.some(e => e.por_fuera) && (
        <p className="text-xs text-faint leading-relaxed">
          🔸 <span className="text-orange-300">Por fuera</span>: el teatro no pasó el argentores a la oficina y se lo pagó <strong>directo al comediante</strong> (8% en vez de 10%; el 2% era el costo del trámite).
          Esa plata ya está cobrada por afuera, así que <strong>no hay que reclamarla en la oficina de Argentores</strong>.
        </p>
      )}
    </div>
  )
}
