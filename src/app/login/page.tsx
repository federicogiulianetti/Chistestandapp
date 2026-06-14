import Link from 'next/link'
import { login } from '@/app/auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-ink text-body">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Chiste Stand App</h1>
        <p className="text-muted mb-8 text-center">Iniciá sesión para continuar</p>

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 bg-surface border border-line rounded-md focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 bg-surface border border-line rounded-md focus:outline-none focus:border-zinc-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-body underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  )
}