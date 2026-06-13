import Image from 'next/image'
import type { BorderoContext } from '@/app/shows/[id]/bordero/data'

// Documento de borderó con el estilo del PDF de Chiste Stand Up.
// Se usa en la vista en pantalla y en la versión imprimible (A4).
// Para borderós históricos/cerrados muestra los TOTALES GUARDADOS y el desglose
// TAL CUAL la planilla (percentage de la planilla; el monto exacto manda).

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
  const d = new Date(f)
  if (isNaN(d.getTime())) return f.slice(0, 10)
  const fecha = d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fecha} · ${hora}hs`
}

// flyers de espectáculos (extraídos de las planillas) — public/flyers/
const FLYERS: Record<string, string> = {
  'Crónico': 'cronico.png',
  'Artesanal': 'artesanal.png',
  'Anécdotas': 'anecdotas.jpg',
  'Probando material': 'probando-material.png',
  'Cheto y Choto': 'cheto-y-choto.png',
  'Sí pero no': 'si-pero-no.png',
  'Todo Navidad': 'todo-navidad.png',
  'Hay Rabas': 'hay-rabas.png',
  'Atropelló, mató y huyó': 'atropello-mato-y-huyo.png',
  'Ya no se puede decir todo': 'ya-no-se-puede-decir-todo.jpg',
  'Ángel Caído': 'angel-caido.png',
  'En un confuso episodio': 'en-un-confuso-episodio.jpg',
  'Deslices y desmanes': 'deslices-y-desmanes.png',
  'Metanoia': 'metanoia.png',
}

const HEAD = { background: '#bcd6ec' } // celeste del header de tabla
const TOTAL = { background: '#e5e7eb' } // gris de las filas de total
const ADS_RE = /^ads\b|fb\/insta|iva servicios digitales|imp\.? y sellos|percepci[oó]n imp/i

export default function BorderoDoc({ ctx }: { ctx: BorderoContext }) {
  const { result: b, summary, currency: cur } = ctx
  // totales reales guardados (fuente de verdad); el desglose va tal cual la planilla
  const snap = ctx.snapshot
  const recaud = snap?.recaudacion ?? b.recaudacion
  const artistaFinal = snap?.artista_final ?? b.artistaFinal
  const productoraFinal = snap?.productora_share ?? b.productoraShare
  const netoFinal = snap?.total_neto ?? b.totalNeto
  const precio = ctx.ticketPrice ?? (summary.vendidas > 0 ? recaud / summary.vendidas : 0)

  // desglose tal cual la planilla
  const dedLines = ctx.deductionsRaw.map(d => ({
    label: d.label,
    pctTxt: d.percentage != null ? pct(d.percentage) : 'Fijo',
    amount: d.fixed_amount ?? (d.percentage != null ? recaud * (d.percentage / 100) : 0),
    note: d.notes ?? (d.goes_to_artist ? 'lo cobra el artista' : ''),
  }))
  const dedTotal = dedLines.reduce((a, l) => a + l.amount, 0)
  const netoTrasImpuestos = recaud - dedTotal

  // sala: % tal cual el arreglo guardado del show
  const teatroParte = b.netoSala !== null ? b.netoSala - b.parteProductoraSala : null

  // ocupación: asistencia (vendidas + free) / aforo
  const ocupacion = ctx.capacity && ctx.capacity > 0 ? Math.round((summary.asistencia / ctx.capacity) * 100) : null

  // gastos: separar los de Ads (van recuadrados)
  const gastoRows: { label: string; amount: number; note: string | null; ads: boolean }[] = [
    ...ctx.expenseLines.map(g => ({ label: g.category, amount: g.amount, note: g.notes, ads: ADS_RE.test(g.category) })),
    ...(b.adSpendTotal > 0 ? [{ label: 'Ads (Meta / Google)', amount: b.adSpendTotal, note: null, ads: true }] : []),
    ...(b.adSpendTotal > 0 ? b.adTaxLines.map(l => ({ label: l.label, amount: l.amount, note: null, ads: true })) : []),
  ]
  // mover los de ads al final, juntos (recuadro contiguo)
  const normales = gastoRows.filter(g => !g.ads)
  const adsRows = gastoRows.filter(g => g.ads)
  const gastosTotal = gastoRows.reduce((a, g) => a + g.amount, 0)

  const th = 'border border-gray-500 px-2 py-0.5 text-center font-semibold'
  const td = 'border border-gray-500 px-2 py-0.5 text-center'

  return (
    <div className="bg-white text-black mx-auto" style={{ maxWidth: 800, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Cabecera: logo + separador + título */}
      <div className="flex items-center justify-center pt-5 pb-4">
        <Image src="/chiste-logo.png" alt="Chiste Stand Up" width={203} height={64} style={{ height: 64, width: 'auto' }} priority />
        <div style={{ width: 2, height: 64, background: '#222', marginLeft: 24, marginRight: 24 }} />
        <span className="text-2xl" style={{ fontWeight: 500, letterSpacing: '0.04em' }}>Bordereau</span>
      </div>

      {/* Sub-cabecera: comediante / flyer centrado / teatro · ciudad */}
      <div className="flex items-center justify-between text-sm font-semibold py-3 px-3">
        <div>
          <div>{ctx.performer}</div>
          <div>{fechaLarga(ctx.showDate)}</div>
        </div>
        <div className="flex-1 flex justify-center px-4" style={{ alignSelf: 'flex-start', marginTop: -10 }}>
          {ctx.spectacle && FLYERS[ctx.spectacle] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/flyers/${FLYERS[ctx.spectacle]}`} alt={ctx.spectacle} style={{ height: 84, width: 'auto', maxWidth: 320, objectFit: 'contain' }} />
          ) : ctx.spectacle ? <span>{ctx.spectacle}</span> : null}
        </div>
        <div className="text-right">
          <div>{ctx.theaterName ?? '—'}</div>
          <div>{ctx.city ?? ''}</div>
          <div className="text-xs font-normal text-gray-700">
            Capacidad: {ctx.capacity ?? '—'} · Ocupación: {ocupacion !== null ? `${ocupacion}%` : '—'}
          </div>
        </div>
      </div>

      <div className="px-3 pb-6 space-y-3 text-xs">
        {/* Recaudación */}
        <table className="w-full border-collapse">
          <thead><tr style={HEAD}><th className={th}>Entrada</th><th className={th}>Cantidad</th><th className={th}>Precio</th><th className={th}>Total</th></tr></thead>
          <tbody>
            <tr><td className={td}>Platea precio único</td><td className={td}>{summary.vendidas}</td><td className={td}>{money(precio, cur)}</td><td className={td}>{money(recaud, cur)}</td></tr>
            {summary.courtesy > 0 && <tr><td className={td}>Free / Cortesías</td><td className={td}>{summary.courtesy}</td><td className={td}>$0</td><td className={td}>$0</td></tr>}
            <tr style={TOTAL} className="font-semibold"><td className={td} colSpan={2}>Total: {summary.asistencia}</td><td className={td} colSpan={2}>Bruto: {money(recaud, cur)}</td></tr>
          </tbody>
        </table>

        {/* Impuestos / Deducciones — tal cual la planilla */}
        {dedLines.length > 0 && (
          <table className="w-full border-collapse">
            <thead><tr style={HEAD}><th className={th}>Impuestos / Deducciones</th><th className={th}>%</th><th className={th}>$</th><th className={th}>Comentarios</th></tr></thead>
            <tbody>
              {dedLines.map((l, i) => (
                <tr key={i}>
                  <td className={td}>{l.label}</td>
                  <td className={td}>{l.pctTxt}</td>
                  <td className={td}>{money(l.amount, cur)}</td>
                  <td className={td}>{l.note}</td>
                </tr>
              ))}
              <tr style={TOTAL} className="font-semibold">
                <td className={td}>Bruto: {money(recaud, cur)}</td>
                <td className={td} colSpan={2}>Deducir: {money(dedTotal, cur)}</td>
                <td className={td}>Neto: {money(netoTrasImpuestos, cur)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Reparto con la sala — % del arreglo guardado */}
        {teatroParte !== null && (
          <table className="w-full border-collapse">
            <tbody>
              <tr style={TOTAL} className="font-semibold"><td className={td}>Teatro: {pct(100 - (b.dealLabel.match(/(\d+(?:\.\d+)?)%/) ? Number(b.dealLabel.match(/(\d+(?:\.\d+)?)%/)![1]) : 0))}</td><td className={td}>{money(teatroParte, cur)}</td></tr>
              <tr style={TOTAL} className="font-semibold"><td className={td}>Productora: {b.dealLabel.match(/(\d+(?:\.\d+)?)%/) ? pct(Number(b.dealLabel.match(/(\d+(?:\.\d+)?)%/)![1])) : b.dealLabel}</td><td className={td}>{money(b.parteProductoraSala, cur)}</td></tr>
            </tbody>
          </table>
        )}

        {/* Gastos — notas en Detalle; bloque Ads recuadrado */}
        {gastoRows.length > 0 && (
          <table className="w-full border-collapse">
            <thead><tr style={HEAD}><th className={th}>Gasto</th><th className={th}>Monto</th><th className={th}>Detalle</th></tr></thead>
            <tbody>
              {normales.map((g, i) => (
                <tr key={i}><td className={td}>{g.label}</td><td className={td}>{money(g.amount, cur)}</td><td className={td}>{g.note ?? ''}</td></tr>
              ))}
              {adsRows.map((g, i) => {
                const edge = {
                  ...(i === 0 ? { borderTop: '2px solid #444' } : {}),
                  ...(i === adsRows.length - 1 ? { borderBottom: '2px solid #444' } : {}),
                }
                return (
                  <tr key={`a${i}`}>
                    <td className={td} style={{ borderLeft: '2px solid #444', ...edge }}>{g.label}</td>
                    <td className={td} style={edge}>{money(g.amount, cur)}</td>
                    <td className={td} style={{ borderRight: '2px solid #444', ...edge }}>{g.note ?? ''}</td>
                  </tr>
                )
              })}
              <tr style={TOTAL} className="font-semibold"><td className={td}>Total: {money(gastosTotal, cur)}</td><td className={td} colSpan={2}>Neto: {money(netoFinal, cur)}</td></tr>
            </tbody>
          </table>
        )}

        {/* Reparto final — sin la palabra "Neto" */}
        <table className="w-full border-collapse">
          <tbody>
            <tr style={TOTAL} className="font-semibold"><td className={td}>Artista: {pct(b.artistPercentage)}</td><td className={td}>{money(artistaFinal, cur)}</td></tr>
            <tr style={TOTAL} className="font-semibold"><td className={td}>Productora: {pct(b.productoraPercentage)}</td><td className={td}>{money(productoraFinal, cur)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
