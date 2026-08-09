import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { clientsApi } from '../api/clients'
import { esnsApi } from '../api/esns'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Field, Input, InlineButton, Select, Spinner, Textarea } from '../components/ui'
import { Badge, EmptyState, ErrorBlock, LoadingBlock, Modal, PageHeader, Table } from '../components/data'
import type { ClientDto } from '../api/types'

interface FormState {
  name: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  esnId: string
  active: boolean
}

const emptyForm: FormState = {
  name: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  esnId: '',
  active: true,
}

export function Clients() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_ESN'

  const { data, loading, error, reload, setData } = useAsync(
    () => clientsApi.findAll(isAdmin ? undefined : user?.esnId ?? undefined),
    [user?.esnId, isAdmin],
  )
  const { data: esns } = useAsync(() => (isAdmin ? esnsApi.findAll() : Promise.resolve([])), [isAdmin])

  const [editing, setEditing] = useState<ClientDto | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm({ ...emptyForm, esnId: isAdmin ? '' : String(user?.esnId ?? '') })
    setEditing(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(client: ClientDto) {
    setForm({
      name: client.name,
      contactName: client.contactName ?? '',
      contactEmail: client.contactEmail ?? '',
      contactPhone: client.contactPhone ?? '',
      address: client.address ?? '',
      esnId: String(client.esn?.id ?? user?.esnId ?? ''),
      active: client.active,
    })
    setEditing(client)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Le nom du client est obligatoire')
      return
    }
    if (isAdmin && !form.esnId) {
      setFormError('Sélectionnez la société (ESN)')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        address: form.address || null,
        esnId: isAdmin ? Number(form.esnId) : user?.esnId ?? undefined,
        active: form.active,
      }
      if (editing) {
        await clientsApi.update(editing.id, payload)
      } else {
        await clientsApi.create(payload)
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(client: ClientDto) {
    if (!window.confirm(`Supprimer le client « ${client.name} » ?`)) return
    try {
      await clientsApi.delete(client.id)
      setData((data ?? []).filter((c) => c.id !== client.id))
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Gérez vos clients et vos contacts"
        actions={
          canEdit ? (
            <Button className="w-auto" onClick={openCreate}>
              + Nouveau client
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}
      {!loading && data && (
        <Table
          rowKey={(c) => c.id}
          onRowClick={canEdit ? openEdit : undefined}
          rows={data}
          columns={[
            {
              key: 'name',
              label: 'Client',
              render: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
            },
            {
              key: 'contact',
              label: 'Contact',
              render: (c) => (
                <div>
                  {c.contactName ? <p className="text-gray-900">{c.contactName}</p> : null}
                  {c.contactEmail && <p className="text-xs text-gray-500">{c.contactEmail}</p>}
                  {c.contactPhone && <p className="text-xs text-gray-500">{c.contactPhone}</p>}
                  {!c.contactName && !c.contactEmail && <span className="text-gray-400">—</span>}
                </div>
              ),
            },
            {
              key: 'address',
              label: 'Adresse',
              render: (c) => <span className="text-gray-500">{c.address ?? '—'}</span>,
            },
            {
              key: 'esn',
              label: 'ESN',
              render: (c) => (isAdmin ? <span>{c.esn?.name ?? '—'}</span> : <span>—</span>),
            },
            {
              key: 'active',
              label: 'Statut',
              render: (c) => (
                <Badge kind={c.active ? 'success' : 'muted'}>{c.active ? 'Actif' : 'Inactif'}</Badge>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (c) =>
                canEdit ? (
                  <div className="flex justify-end gap-1">
                    <InlineButton onClick={(e) => { e.stopPropagation(); openEdit(c) }}>
                      Modifier
                    </InlineButton>
                    <InlineButton
                      className="text-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                    >
                      Supprimer
                    </InlineButton>
                  </div>
                ) : (
                  <></>
                ),
            },
          ]}
        />
      )}
      {!loading && data?.length === 0 && (
        <EmptyState
          title="Aucun client"
          description="Ajoutez votre premier client pour commencer."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier ${editing.name}` : 'Nouveau client'}
        footer={
          <>
            <InlineButton onClick={() => setModalOpen(false)}>Annuler</InlineButton>
            <Button className="w-auto" onClick={handleSubmit as never} disabled={submitting}>
              {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </div>
          )}
          <Field label="Nom du client *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact">
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <Input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="E-mail du contact">
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </Field>
          <Field label="Adresse">
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          {isAdmin && (
            <Field label="Société (ESN)">
              <Select
                value={form.esnId}
                onChange={(e) => setForm({ ...form, esnId: e.target.value })}
              >
                <option value="">Sélectionner…</option>
                {(esns ?? []).map((esn) => (
                  <option key={esn.id} value={esn.id}>
                    {esn.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Client actif
          </label>
        </form>
      </Modal>
    </div>
  )
}
