import RegistrationForm from '@/components/RegistrationForm'

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Figurinhas Copa 2026</h1>
          <p className="mt-2 text-gray-500 text-sm">Condomínio YVY Lindóia</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quem é você?</h2>
          <RegistrationForm />
        </div>
      </div>
    </div>
  )
}
