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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Chiste Stand App</h1>
        <p className="text-gray-400 mb-8 text-center">Iniciá sesión para continuar</p>

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
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
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
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-400">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-white underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  )
}