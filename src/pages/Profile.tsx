import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, Field, Input, Spinner } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, PageHeader } from '../components/data'
import { ROLE_LABELS, formatDateTime } from '../lib/format'

export function Profile() {
  const { user, refreshMe } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [changeSuccess, setChangeSuccess] = useState(false)

  const { data: connections, loading: connectionsLoading } = useAsync(
    () => authApi.connections(),
    [],
  )

  if (!user) return null

  async function handleChangePassword() {
    setChangeError(null)
    setChangeSuccess(false)
    if (newPassword.length < 8) {
      setChangeError('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Les mots de passe ne correspondent pas')
      return
    }
    setChanging(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      await refreshMe()
      setChangeSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setChangeError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Informations personnelles, mot de passe et connexions" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900">Informations</h3>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Nom complet</dt>
              <dd className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Identifiant</dt>
              <dd className="text-sm font-medium text-gray-900">{user.username}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">E-mail</dt>
              <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Téléphone</dt>
              <dd className="text-sm font-medium text-gray-900">{user.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Rôle</dt>
              <dd className="text-sm font-medium text-gray-900">
                <Badge kind="info">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Société</dt>
              <dd className="text-sm font-medium text-gray-900">{user.esnName ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900">Changer le mot de passe</h3>
          <div className="mt-4 space-y-4">
            {changeSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Mot de passe mis à jour.
              </div>
            )}
            {changeError && <ErrorBlock message={changeError} />}
            <Field label="Mot de passe actuel">
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirmation">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Button className="w-auto" onClick={handleChangePassword} disabled={changing}>
              {changing ? <Spinner className="border-white border-t-transparent" /> : null}
              Mettre à jour
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="text-sm font-semibold text-gray-900">Historique des connexions</h3>
        {connectionsLoading ? (
          <LoadingBlock />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Navigateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(connections ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(c.loginTime)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.ipAddress}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500">{c.userAgent}</td>
                    <td className="px-4 py-3">
                      <Badge kind={c.success ? 'success' : 'error'}>
                        {c.success ? 'Succès' : 'Échec'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(connections ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                      Aucune connexion enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
