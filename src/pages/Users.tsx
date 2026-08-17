import { useEffect, useState } from 'react'
import { usersApi, type UpdateUserRequest } from '../api/users'
import { socsApi } from '../api/socs'
import { ApiError } from '../api/client'
import type { SocDto, UserDto } from '../api/types'
import { useAsync } from '../lib/useAsync'
import { Button, Field, Input, InlineButton, Select, Spinner } from '../components/ui'
import {
  Badge,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Table,
} from '../components/data'
import { ROLE_LABELS, formatDateTime } from '../lib/format'
import type { Role } from '../api/types'

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [Role, string][]

interface EditForm {
  email: string
  firstName: string
  lastName: string
  phone: string
  role: Role
  socId: string
  active: boolean
}

export function Users() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0)
  const size = 20

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search)
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const { data, loading, error, setData } = useAsync(
    () => usersApi.findAll({ page, size, search: debounced || undefined }),
    [page, size, debounced],
  )

  const { data: socs } = useAsync(() => socsApi.findAll(), [])

  const [editing, setEditing] = useState<{ user: UserDto; form: EditForm } | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<UserDto | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  function openEdit(user: UserDto) {
    setActionError(null)
    setEditing({
      user,
      form: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
        role: user.role,
        socId: user.socId != null ? String(user.socId) : '',
        active: user.active,
      },
    })
  }

  function updateForm(patch: Partial<EditForm>) {
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev))
  }

  async function saveEdit() {
    if (!editing) return
    const f = editing.form
    if (!f.email.trim()) {
      setActionError("L'email est obligatoire")
      return
    }
    if (!f.firstName.trim() || !f.lastName.trim()) {
      setActionError('Le nom et le prénom sont obligatoires')
      return
    }
    setSaving(true)
    setActionError(null)
    const request: UpdateUserRequest = {
      email: f.email.trim(),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      phone: f.phone.trim() || null,
      role: f.role,
      socId: f.socId ? Number(f.socId) : null,
      active: f.active,
    }
    try {
      const saved = await usersApi.update(editing.user.id, request)
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((u) => (u.id === saved.id ? saved : u)) }
          : prev,
      )
      setEditing(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Impossible de modifier l'utilisateur")
    } finally {
      setSaving(false)
    }
  }

  function openDelete(user: UserDto) {
    setActionError(null)
    setDeleting(user)
  }

  async function doDelete(user: UserDto) {
    setDeleteLoading(true)
    setActionError(null)
    try {
      await usersApi.delete(user.id)
      setData((prev) =>
        prev ? { ...prev, items: prev.items.filter((u) => u.id !== user.id) } : prev,
      )
      setDeleting(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Impossible de supprimer l'utilisateur")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Comptes de la plateforme (administration)" />

      <div className="mb-4">
        <Input
          className="max-w-sm"
          placeholder="Rechercher un utilisateur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBlock message={error} />}
      {actionError && (
        <div className="mb-4">
          <ErrorBlock message={actionError} />
        </div>
      )}
      {loading && <LoadingBlock />}

      {!loading && data && data.items.length > 0 && (
        <>
          <Table
            rowKey={(u) => u.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Utilisateur',
                render: (u) => (
                  <div>
                    <p className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                ),
              },
              {
                key: 'email',
                label: 'E-mail',
                render: (u) => <span>{u.email}</span>,
              },
              {
                key: 'role',
                label: 'Rôle',
                render: (u) => <Badge kind="info">{ROLE_LABELS[u.role] ?? u.role}</Badge>,
              },
              {
                key: 'soc',
                label: 'Société',
                render: (u) => <span className="text-gray-500">{u.socName ?? '—'}</span>,
              },
              {
                key: 'active',
                label: 'Statut',
                render: (u) => (
                  <Badge kind={u.active ? 'success' : 'error'}>{u.active ? 'Actif' : 'Inactif'}</Badge>
                ),
              },
              {
                key: 'lastLogin',
                label: 'Dernière connexion',
                render: (u) => <span className="text-gray-500">{formatDateTime(u.lastLoginAt)}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (u) => (
                  <div className="flex justify-end gap-1">
                    <InlineButton onClick={() => openEdit(u)}>Modifier</InlineButton>
                    <InlineButton
                      className="text-red-600 hover:bg-red-50 disabled:opacity-40"
                      disabled={u.active}
                      title={u.active ? 'Désactivez le compte avant de le supprimer' : undefined}
                      onClick={() => openDelete(u)}
                    >
                      Supprimer
                    </InlineButton>
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </>
      )}

      {!loading && data && data.items.length === 0 && (
        <EmptyState
          title="Aucun utilisateur"
          description="Aucun compte ne correspond à la recherche."
        />
      )}

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Modifier ${editing.user.firstName} ${editing.user.lastName}`}
          footer={
            <>
              <Button
                type="button"
                className="!w-auto !bg-gray-100 !text-gray-700 hover:!bg-gray-200"
                onClick={() => setEditing(null)}
              >
                Annuler
              </Button>
              <Button type="button" className="!w-auto" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? <Spinner className="border-white border-t-transparent" /> : null}
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Prénom *">
                <Input value={editing.form.firstName} onChange={(e) => updateForm({ firstName: e.target.value })} />
              </Field>
              <Field label="Nom *">
                <Input value={editing.form.lastName} onChange={(e) => updateForm({ lastName: e.target.value })} />
              </Field>
              <Field label="E-mail *">
                <Input type="email" value={editing.form.email} onChange={(e) => updateForm({ email: e.target.value })} />
              </Field>
              <Field label="Téléphone">
                <Input value={editing.form.phone} onChange={(e) => updateForm({ phone: e.target.value })} />
              </Field>
              <Field label="Rôle">
                <Select value={editing.form.role} onChange={(e) => updateForm({ role: e.target.value as Role })}>
                  {ROLE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Société">
                <Select value={editing.form.socId} onChange={(e) => updateForm({ socId: e.target.value })}>
                  <option value="">Aucune</option>
                  {(socs ?? []).map((soc: SocDto) => (
                    <option key={soc.id} value={soc.id}>
                      {soc.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                checked={editing.form.active}
                onChange={(e) => updateForm({ active: e.target.checked })}
              />
              Compte actif
            </label>
          </div>
        </Modal>
      )}

      {deleting && !deleting.active && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Confirmer la suppression"
          footer={
            <>
              <Button
                type="button"
                className="!w-auto !bg-gray-100 !text-gray-700 hover:!bg-gray-200"
                onClick={() => setDeleting(null)}
                disabled={deleteLoading}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="!w-auto !bg-red-600 hover:!bg-red-700"
                disabled={deleteLoading}
                onClick={() => void doDelete(deleting)}
              >
                {deleteLoading ? <Spinner className="border-white border-t-transparent" /> : null}
                Supprimer
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            Supprimer l'utilisateur « {deleting.firstName} {deleting.lastName} » ?
          </p>
          {deleting.socName && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Sa société « {deleting.socName} » sera supprimée avec tous ses objets liés (clients,
              fournisseurs, projets, consultants, activités…).
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
