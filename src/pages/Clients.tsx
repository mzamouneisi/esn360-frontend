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
  description: string
  siret: string
  codeNaf: string
  website: string
  contactName: string
  contactEmail: string
  contactPhone: string
  street: string
  zipCode: string
  city: string
  country: string
  esnId: string
  active: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  siret: '',
  codeNaf: '',
  website: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  street: '',
  zipCode: '',
  city: '',
  country: '',
  esnId: '',
  active: true,
}

function formatAddress(client: ClientDto): string {
  const a = client.address
  if (!a) return '—'
  const parts = [a.street, [a.zipCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

export function Clients() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_SOC'

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
      description: client.description ?? '',
      siret: client.siret ?? '',
      codeNaf: client.codeNaf ?? '',
      website: client.website ?? '',
      contactName: client.contactName ?? '',
      contactEmail: client.contactEmail ?? '',
      contactPhone: client.contactPhone ?? '',
      street: client.address?.street ?? '',
      zipCode: client.address?.zipCode ?? '',
      city: client.address?.city ?? '',
      country: client.address?.country ?? '',
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
      setFormError('Sélectionnez la société')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const address = {
        street: form.street || null,
        zipCode: form.zipCode || null,
        city: form.city || null,
        country: form.country || null,
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        siret: form.siret.trim() || null,
        codeNaf: form.codeNaf.trim() || null,
        website: form.website.trim() || null,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        address,
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
              render: (c) => <span className="text-gray-500">{formatAddress(c)}</span>,
            },
            {
              key: 'esn',
              label: 'Société',
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
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SIRET">
              <Input
                value={form.siret}
                onChange={(e) => setForm({ ...form, siret: e.target.value })}
                placeholder="12345678901234"
              />
            </Field>
            <Field label="Code NAF">
              <Input
                value={form.codeNaf}
                onChange={(e) => setForm({ ...form, codeNaf: e.target.value })}
                placeholder="6202A"
              />
            </Field>
          </div>
          <Field label="Site web">
            <Input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://…"
            />
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
          <div className="space-y-2">
            <Field label="Adresse">
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder="Rue, voie…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code postal">
                <Input
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                />
              </Field>
              <Field label="Ville">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Pays">
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="FR"
              />
            </Field>
          </div>
          {isAdmin && (
            <Field label="Société">
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
