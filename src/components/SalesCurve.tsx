import type { CurvePoint } from '@/lib/sales'

// Curva de venta acumulada en SVG (componente puro, sin estado).
export default function SalesCurve({
  points,
  target,
}: {
  points: CurvePoint[]
  target: number // capacidad a la venta (línea de referencia)
}) {
  if (points.length < 2) {
    return <p className="text-sm text-gray-500">Cargá al menos dos días de ventas para ver la curva.</p>
  }

  const W = 640
  const H = 220
  const padL = 40
  const padR = 16
  const padT = 12
  const padB = 28

  const maxY = Math.max(target || 0, ...points.map(p => p.cumulative), 1)
  const n = points.length

  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.cumulative).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
  const targetY = target > 0 ? y(target) : null

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img" aria-label="Curva de venta acumulada">
        {/* eje Y: 0 y máximo */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#3f3f46" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#3f3f46" strokeWidth="1" />
        <text x={padL - 6} y={y(maxY) + 4} textAnchor="end" fontSize="10" fill="#a1a1aa">{maxY}</text>
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" fontSize="10" fill="#a1a1aa">0</text>

        {/* línea de capacidad a la venta */}
        {targetY !== null && (
          <>
            <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
            <text x={W - padR} y={targetY - 4} textAnchor="end" fontSize="10" fill="#22c55e">cap. a la venta ({target})</text>
          </>
        )}

        {/* área + línea de venta acumulada */}
        <path d={areaPath} fill="#3b82f6" opacity="0.15" />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.cumulative)} r="2.5" fill="#3b82f6" />
        ))}

        {/* etiquetas de fecha en extremos */}
        <text x={x(0)} y={H - 8} textAnchor="start" fontSize="10" fill="#a1a1aa">{points[0].date.slice(5)}</text>
        <text x={x(n - 1)} y={H - 8} textAnchor="end" fontSize="10" fill="#a1a1aa">{points[n - 1].date.slice(5)}</text>
      </svg>
    </div>
  )
}
