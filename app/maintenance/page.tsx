export default function MaintenancePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1
            className="text-3xl text-yvy-dark tracking-[0.1em] uppercase"
            style={{ fontFamily: 'var(--font-bebas-neue)' }}
          >
            Figurinhas Copa 2026
          </h1>
          <p className="mt-2 text-yvy-muted text-sm">Condomínio YVY Lindóia</p>
        </div>
        <div className="bg-yvy-surface rounded-2xl shadow-sm border border-yvy-border p-8">
          <div className="text-4xl mb-4">🔧</div>
          <h2 className="text-xl font-semibold text-yvy-dark mb-2">Em manutenção</h2>
          <p className="text-yvy-muted text-sm">
            O aplicativo está temporariamente fora do ar para manutenção. Voltamos em breve!
          </p>
        </div>
      </div>
    </div>
  )
}
