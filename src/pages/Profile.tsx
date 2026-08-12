import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useSoc } from '../soc/SocContext'
import { authApi } from '../api/auth'
import { socsApi, type SocDependency } from '../api/socs'
import type { SocDto } from '../api/types'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, Field, Input, Spinner, Textarea } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, PageHeader } from '../components/data'
import { ROLE_LABELS, formatDateTime } from '../lib/format'

export function Profile() {
  const { user, refreshMe } = useAuth()
  const { socs } = useSoc()
  const [editingSoc, setEditingSoc] = useState<SocDto | null>(null)
  const [socSaving, setSocSaving] = useState(false)
  const [socError, setSocError] = useState<string | null>(null)
  const [socMessage, setSocMessage] = useState<string | null>(null)
  const [deletingSoc, setDeletingSoc] = useState<{ id: number; name: string } | null>(null)
  const [dependencies, setDependencies] = useState<SocDependency[]>([])
  const [dependencyLoading, setDependencyLoading] = useState(false)

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

  async function editSoc(id: number) {
    setSocError(null)
    setSocMessage(null)
    try {
      setEditingSoc(await socsApi.getById(id).then((detail) => detail.soc))
    } catch (err) {
      setSocError(err instanceof ApiError ? err.message : 'Impossible de charger la société')
    }
  }

  async function saveSoc() {
    if (!editingSoc) return
    setSocSaving(true)
    setSocError(null)
    setSocMessage(null)
    try {
      const saved = await socsApi.update(editingSoc.id, editingSoc)
      setEditingSoc(saved)
      setSocMessage('Société mise à jour.')
    } catch (err) {
      setSocError(err instanceof ApiError ? err.message : 'Impossible de modifier la société')
    } finally {
      setSocSaving(false)
    }
  }

  async function deleteSoc(id: number, name: string) {
    if (!window.confirm(`Supprimer la société « ${name} » ?`)) return
    setSocError(null)
    setSocMessage(null)
    try {
      setDependencyLoading(true)
      const linked = await socsApi.dependencies(id)
      if (linked.length > 0) {
        setDeletingSoc({ id, name })
        setDependencies(linked)
        return
      }
      await socsApi.remove(id)
      window.location.reload()
    } catch (err) {
      setSocError(err instanceof ApiError ? err.message : 'Impossible de supprimer la société')
    } finally {
      setDependencyLoading(false)
    }
  }

  async function deleteDependency(item: SocDependency) {
    if (!deletingSoc || !window.confirm(`Supprimer « ${item.label} » ?`)) return
    try {
      await socsApi.removeDependency(deletingSoc.id, item.type, item.id)
      const remaining = await socsApi.dependencies(deletingSoc.id)
      setDependencies(remaining)
      if (remaining.length === 0) {
        await socsApi.remove(deletingSoc.id)
        setDeletingSoc(null)
        window.location.reload()
      }
    } catch (err) {
      setSocError(err instanceof ApiError ? err.message : 'Impossible de supprimer cet objet')
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
              <dt className="text-sm text-gray-500">Sociétés</dt>
              <dd className="text-sm font-medium text-gray-900">
                {socs.length > 0 ? (
                  <ul className="space-y-1">
                    {socs.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        <span>{e.name}</span>
                        {user.role === 'RESPONSIBLE_SOC' && (
                          <span className="ml-auto flex gap-2">
                            <Button type="button" aria-label={`Modifier ${e.name}`} title="Modifier" className="!w-auto !bg-gray-100 !px-2 !py-1 !text-xs !text-gray-700" onClick={() => void editSoc(e.id)}>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                            </Button>
                            <Button type="button" aria-label={`Supprimer ${e.name}`} title="Supprimer" className="!w-auto !bg-red-600 !px-2 !py-1 !text-xs hover:!bg-red-700" onClick={() => void deleteSoc(e.id, e.name)}>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>
                            </Button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  user.socName ?? '—'
                )}
              </dd>
            </div>
          </dl>
          {user.role === 'RESPONSIBLE_SOC' && editingSoc && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-brand-100 bg-brand-50/40 p-4 sm:grid-cols-2">
              <Field label="Nom de la société"><Input value={editingSoc.name} onChange={(e) => setEditingSoc({ ...editingSoc, name: e.target.value })} /></Field>
              <Field label="SIRET"><Input value={editingSoc.siret ?? ''} onChange={(e) => setEditingSoc({ ...editingSoc, siret: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={2} value={editingSoc.description ?? ''} onChange={(e) => setEditingSoc({ ...editingSoc, description: e.target.value })} /></Field>
              <Field label="Informations web"><Textarea rows={2} value={editingSoc.infosWeb ?? ''} onChange={(e) => setEditingSoc({ ...editingSoc, infosWeb: e.target.value })} /></Field>
              <Field label="Site web"><Input type="url" value={editingSoc.website ?? ''} onChange={(e) => setEditingSoc({ ...editingSoc, website: e.target.value })} /></Field>
              <Field label="Gérant"><Input value={editingSoc.gerant ?? ''} onChange={(e) => setEditingSoc({ ...editingSoc, gerant: e.target.value })} /></Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="button" className="!w-auto" onClick={() => void saveSoc()} disabled={socSaving}>{socSaving ? <Spinner className="border-white border-t-transparent" /> : null}Enregistrer</Button>
                <Button type="button" className="!w-auto !bg-gray-100 !text-gray-700" onClick={() => setEditingSoc(null)}>Annuler</Button>
              </div>
            </div>
          )}
          {user.role === 'RESPONSIBLE_SOC' && socError && <div className="mt-4"><ErrorBlock message={socError} /></div>}
          {user.role === 'RESPONSIBLE_SOC' && socMessage && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{socMessage}</div>}
          {deletingSoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900">Objets liés à {deletingSoc.name}</h3>
                <p className="mt-1 text-sm text-gray-500">Supprimez chaque objet avant de supprimer la société.</p>
                <div className="mt-4 space-y-2">
                  {dependencies.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700">{item.label} <span className="text-xs text-gray-400">({item.type})</span></span>
                      <Button type="button" disabled={dependencyLoading} className="!w-auto !bg-red-600 !px-2 !py-1 !text-xs hover:!bg-red-700" onClick={() => void deleteDependency(item)}>Supprimer</Button>
                    </div>
                  ))}
                </div>
                <Button type="button" className="mt-4 !w-auto !bg-gray-100 !text-gray-700" onClick={() => setDeletingSoc(null)}>Annuler</Button>
              </div>
            </div>
          )}
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
