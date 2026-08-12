import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui'
import { useState, type FormEvent } from 'react'

export function ChangePassword() {
  const { user, refreshMe, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      await refreshMe()
      setSuccess(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  const forced = user?.mustChangePassword ?? false

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Changer le mot de passe</h1>
          <p className="mt-1 text-sm text-gray-500">
            {forced
              ? 'Votre premier mot de passe doit être modifié avant de continuer.'
              : 'Mettez à jour votre mot de passe.'}
          </p>
        </div>

        {success && (
          <div className="mb-4">
            <Alert variant="success">Mot de passe mis à jour. Redirection…</Alert>
          </div>
        )}

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Mot de passe actuel">
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </Field>

          <Field label="Nouveau mot de passe">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </Field>

          <Field label="Confirmer le nouveau mot de passe">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" disabled={submitting || success}>
            {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
            Mettre à jour
          </Button>
        </form>

        {!forced && (
          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Annuler et revenir
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
