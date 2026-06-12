import Image from 'next/image'
import type { BorderoContext } from '@/app/shows/[id]/bordero/data'

// Documento de borderó con el estilo del PDF de Chiste Stand Up.
// Se usa tanto en la vista en pantalla como en la versión imprimible / PDF.
// Siempre sobre papel blanco (como un documento).

function money(n: number, cur: string): string {
  const s = (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return cur === 'ARS' ? `$${s}` : `${cur} ${s}`
}
function pct(n: number): string {
  const s = (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${s}%`
}
function fechaLarga(f: string | null): string {
  if (!f) return '—'
  const d = f.slice(0, 10)
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

const HEAD = { background: '#bcd6ec' } // celeste del header de tabla
const TOTAL = { background: '#e5e7eb' } // gris de las filas de total

export default function BorderoDoc({ ctx }: { ctx: BorderoContext }) {
  const { result: b, summary, currency: cur } = ctx
  // totales reales guardados (fuente de verdad para históricos); el desglose se pega de la planilla
  const snap = ctx.snapshot
  const recaud = snap?.recaudacion ?? b.recaudacion
  const artistaFinal = snap?.artista_final ?? b.artistaFinal
  const productoraFinal = snap?.productora_share ?? b.productoraShare
  const netoFinal = snap?.total_neto ?? b.totalNeto
  const precio = ctx.ticketPrice ?? (summary.vendidas > 0 ? recaud / summary.vendidas : 0)
  const teatroParte = b.netoSala !== null ? b.netoSala - b.parteProductoraSala : null
  const prodPctSala = b.netoSala && b.netoSala !== 0 ? (b.parteProductoraSala / b.netoSala) * 100 : null
  const teatroPctSala = prodPctSala !== null ? 100 - prodPctSala : null

  const th = 'border border-gray-500 px-3 py-1.5 text-center font-semibold tracking-wide'
  const td = 'border border-gray-500 px-3 py-1.5 text-center'
  const tdL = 'border border-gray-500 px-3 py-1.5 text-left'

  return (
    <div className="bg-white text-black mx-auto" style={{ maxWidth: 800, fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.04em' }}>
      {/* Cabecera */}
      <div className="flex items-center justify-center gap-4 py-6 border-b border-gray-300">
        <Image src="/chiste-logo.png" alt="Chiste Stand Up" width={150} height={84} style={{ height: 56, width: 'auto' }} priority />
        <span className="text-2xl font-extrabold tracking-widest">BORDERÓ</span>
      </div>

      {/* Sub-cabecera */}
      <div className="flex justify-between text-sm font-semibold py-4 px-2">
        <div>
          <div>{ctx.performer}{ctx.spectacle ? ` — ${ctx.spectacle}` : ''}</div>
          <div>{fechaLarga(ctx.showDate)}</div>
        </div>
        <div className="text-right">
          <div>{ctx.theaterName ?? '—'}</div>
          <div>{ctx.city ?? ''}</div>
        </div>
      </div>

      <div className="px-2 pb-8 space-y-5 text-sm">
        {/* Recaudación */}
        <table className="w-full border-collapse">
          <thead><tr style={HEAD}><th className={th}>Entrada</th><th className={th}>Cantidad</th><th className={th}>Precio</th><th className={th}>Total</th></tr></thead>
          <tbody>
            <tr><td className={td}>Boletería</td><td className={td}>{summary.vendidas}</td><td className={td}>{money(precio, cur)}</td><td className={td}>{money(recaud, cur)}</td></tr>
            <tr style={TOTAL} className="font-semibold"><td className={td} colSpan={2}>Total: {summary.vendidas}</td><td className={td} colSpan={2}>Bruto: {money(recaud, cur)}</td></tr>
          </tbody>
        </table>

        {/* Impuestos / Deducciones */}
        {b.deductionLines.length > 0 && (
          <table className="w-full border-collapse">
            <thead><tr style={HEAD}><th className={th}>Impuestos / Deducciones</th><th className={th}>%</th><th className={th}>$</th><th className={th}>Comentarios</th></tr></thead>
            <tbody>
              {b.deductionLines.map((l, i) => (
                <tr key={i}>
                  <td className={tdL}>{l.label}</td>
                  <td className={td}>{recaud > 0 ? pct((l.amount / recaud) * 100) : '—'}</td>
                  <td className={td}>{money(l.amount, cur)}</td>
                  <td className={tdL}>{l.goesToArtist ? 'lo cobra el artista' : ''}</td>
                </tr>
              ))}
              <tr style={TOTAL} className="font-semibold">
                <td className={td}>Bruto: {money(recaud, cur)}</td>
                <td className={td} colSpan={2}>Deducir: {money(b.impuestosTotal, cur)}</td>
                <td className={td}>Neto: {money(b.netoSala ?? b.recaudacion, cur)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Reparto con la sala */}
        {teatroParte !== null && (
          <table className="w-full border-collapse">
            <tbody>
              <tr style={TOTAL} className="font-semibold"><td className={td}>Teatro: {teatroPctSala !== null ? pct(teatroPctSala) : ''}</td><td className={td}>Neto: {money(teatroParte, cur)}</td></tr>
              <tr style={TOTAL} className="font-semibold"><td className={td}>Productora: {prodPctSala !== null ? pct(prodPctSala) : ''}</td><td className={td}>Neto: {money(b.parteProductoraSala, cur)}</td></tr>
            </tbody>
          </table>
        )}

        {/* Gastos */}
        {(ctx.expenseLines.length > 0 || b.gastosTotal > 0) && (
          <table className="w-full border-collapse">
            <thead><tr style={HEAD}><th className={th}>Gasto</th><th className={th}>Monto</th><th className={th}>Detalle</th></tr></thead>
            <tbody>
              {ctx.expenseLines.map((g, i) => (
                <tr key={i}><td className={tdL}>{g.category}</td><td className={td}>{money(g.amount, cur)}</td><td className={tdL}></td></tr>
              ))}
              {b.adSpendTotal > 0 && <tr><td className={tdL}>Ads (Meta / Google)</td><td className={td}>{money(b.adSpendTotal, cur)}</td><td className={tdL}></td></tr>}
              {b.adSpendTotal > 0 && b.adTaxLines.map((l, i) => (
                <tr key={`t${i}`}><td className={tdL}>{l.label}</td><td className={td}>{money(l.amount, cur)}</td><td className={tdL}></td></tr>
              ))}
              <tr style={TOTAL} className="font-semibold"><td className={td}>Total: {money(b.gastosTotal, cur)}</td><td className={td} colSpan={2}>Neto: {money(netoFinal, cur)}</td></tr>
            </tbody>
          </table>
        )}

        {/* Reparto final */}
        <table className="w-full border-collapse">
          <tbody>
            <tr style={TOTAL} className="font-semibold"><td className={td}>Artista: {pct(b.artistPercentage)}</td><td className={td}>Neto: {money(artistaFinal, cur)}</td></tr>
            <tr style={TOTAL} className="font-semibold"><td className={td}>Productora: {pct(b.productoraPercentage)}</td><td className={td}>Neto: {money(productoraFinal, cur)}</td></tr>
          </tbody>
        </table>

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-6 pt-16 text-center text-xs">
          {['Comediante', 'Productor', 'Chiste Stand Up'].map(s => (
            <div key={s}>
              <div className="border-t border-dashed border-gray-500 mb-1" />
              <div className="font-semibold">Firma y aclaración</div>
              <div>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
