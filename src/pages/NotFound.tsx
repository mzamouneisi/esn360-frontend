import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">
        Page introuvable
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
