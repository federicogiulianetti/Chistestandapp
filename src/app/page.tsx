import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.auth.getSession()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <h1 className="text-4xl font-bold mb-4">Chiste Stand App</h1>
      <p className="text-lg mb-8">Sistema de gestión de la productora</p>
      
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-2">Estado de Supabase</h2>
        {error ? (
          <p className="text-red-400">❌ Error: {error.message}</p>
        ) : (
          <p className="text-green-400">✅ Conectado correctamente a Supabase</p>
        )}
      </div>
    </main>
  )
}