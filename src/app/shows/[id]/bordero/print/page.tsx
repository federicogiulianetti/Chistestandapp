import { notFound } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { loadBordero } from '../data'
import BorderoDoc from '@/components/BorderoDoc'
import PrintButton from '@/components/PrintButton'

export default async function BorderoPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') notFound()

  const ctx = await loadBordero(id)
  if (!ctx) notFound()

  return (
    <main className="min-h-screen bg-white text-black p-6 print:p-0">
      <div className="max-w-[820px] mx-auto">
        <div className="flex justify-end mb-4 print:hidden">
          <PrintButton />
        </div>
        <BorderoDoc ctx={ctx} />
      </div>
    </main>
  )
}
