import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui'

export function Register() {
  const [esnName, setEsnName] = useState('')
  const [siret, setSiret] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.registerEsn({
        esnName,
        siret: siret || undefined,
        adminFirstName,
        adminLastName,
        username,
        email,
        password,
      })
      setMessage(response.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  if (message) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
        <Card className="w-full max-w-lg p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
              E
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vérifiez votre boîte mail</h1>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>

          <Alert variant="success">
            Cliquez sur le lien reçu pour valider votre inscription et activer votre compte.
            Ce lien expire au bout de 2 heures.
          </Alert>

          <p className="mt-6 text-center text-sm text-gray-600">
            Déjà validé ?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Se connecter
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Inscrire votre société</h1>
          <p className="mt-1 text-sm text-gray-500">
            Créez le compte administrateur de votre société
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom de la société">
              <Input
                type="text"
                value={esnName}
                onChange={(e) => setEsnName(e.target.value)}
                required
                placeholder="Ma société de conseil"
              />
            </Field>

            <Field label="SIRET (optionnel)">
              <Input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom de l'administrateur">
              <Input
                type="text"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                required
                placeholder="Marie"
              />
            </Field>

            <Field label="Nom de l'administrateur">
              <Input
                type="text"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                required
                placeholder="Durand"
              />
            </Field>
          </div>

          <Field label="Nom d'utilisateur">
            <Input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="marie.durand"
            />
          </Field>

          <Field label="Adresse e-mail">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="marie.durand@exemple.fr"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>

            <Field label="Confirmer le mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
            Créer mon compte
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  )
}
