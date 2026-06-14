import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-ink text-body">
      <Image
        src="/chiste-logo-neon.png"
        alt="Chiste Stand App"
        width={260}
        height={114}
        priority
        className="h-20 w-auto rounded-xl mb-6"
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
