import { setPassword } from './actions'

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams
  const inp = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"

  return (
    <main className="min-h-screen bg-ink text-body flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">¡Bienvenido/a!</h1>
        <p className="text-muted text-sm mb-6">Definí tu contraseña para entrar a Chiste Stand App.</p>

        {sp.error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4 text-sm">{sp.error}</div>
        )}

        <form action={setPassword} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input name="password" type="password" required minLength={6} className={inp} />
          </div>
          <div>
            <label className="block text-sm mb-1">Repetir contraseña</label>
            <input name="confirm" type="password" required minLength={6} className={inp} />
          </div>
          <button type="submit" className="w-full px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">
            Guardar y entrar
          </button>
        </form>
      </div>
    </main>
  )
}
