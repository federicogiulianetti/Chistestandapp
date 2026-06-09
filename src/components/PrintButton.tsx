'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-zinc-800 transition text-sm print:hidden"
    >
      🖨️ Imprimir / Guardar PDF
    </button>
  )
}
