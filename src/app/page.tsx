import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-ink text-body">
      <Image
        src="/chiste-logo-round.png"
        alt="Chiste Stand App"
        width={340}
        height={340}
        priority
        className="w-72 h-72 sm:w-80 sm:h-80 rounded-full mb-8"
      />
      <p className="text-lg text-muted mb-8">Sistema de gestión de la productora</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-brand text-[#06210f] font-semibold rounded-lg hover:opacity-90 transition"
      >
        Entrar al panel →
      </Link>
    </main>
  )
}
