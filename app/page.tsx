import RegistrationForm from '@/components/RegistrationForm'

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl text-yvy-dark tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-bebas-neue)' }}>Figurinhas Copa 2026</h1>
          <p className="mt-2 text-yvy-muted text-sm">Condomínio YVY Lindóia</p>
        </div>
        <div className="bg-yvy-surface rounded-2xl shadow-sm border border-yvy-border p-6">
          <RegistrationForm />
        </div>
      </div>
    </div>
  )
}
