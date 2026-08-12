import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { activitiesApi, activityTypesApi } from '../api/activities'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Field, InlineButton, Input, Select, Spinner } from '../components/ui'
import { Badge, EmptyState, ErrorBlock, LoadingBlock, Modal, PageHeader, Table } from '../components/data'
import { formatMoney } from '../lib/format'
import type { ActivityDto, ActivityTypeDto, ActivityTypeRequest } from '../api/types'

interface FormState {
  name: string
  description: string
  price: string
  currency: string
  typeId: string
  active: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  currency: 'EUR',
  typeId: '',
  active: true,
}

export function Activities() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_SOC'

  const { data, loading, error, reload, setData } = useAsync(
    () => activitiesApi.findAll(isAdmin ? undefined : user?.socId ? { socId: user.socId } : undefined),
    [user?.socId, isAdmin],
  )
  const typesSocId = user?.socId ?? null
  const { data: types, reload: reloadTypes } = useAsync(
    () => (typesSocId ? activityTypesApi.findAll(typesSocId) : Promise.resolve([] as ActivityTypeDto[])),
    [typesSocId],
  )

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<ActivityDto | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [typesOpen, setTypesOpen] = useState(false)
  const [typeForm, setTypeForm] = useState<{
    id: number | null
    code: string
    labelFr: string
    labelEn: string
    color: string
  }>({ id: null, code: '', labelFr: '', labelEn: '', color: '#3b82f6' })
  const [typeError, setTypeError] = useState<string | null>(null)
  const [typeSubmitting, setTypeSubmitting] = useState(false)

  if (!user) return null

  function openTypeCreate() {
    setTypeForm({ id: null, code: '', labelFr: '', labelEn: '', color: '#3b82f6' })
    setTypeError(null)
    setTypesOpen(true)
  }

  function openTypeEdit(t: ActivityTypeDto) {
    setTypeForm({
      id: t.id,
      code: t.code,
      labelFr: t.labelFr,
      labelEn: t.labelEn ?? '',
      color: t.color ?? '#3b82f6',
    })
    setTypeError(null)
    setTypesOpen(true)
  }

  async function handleTypeSubmit(e: FormEvent) {
    e.preventDefault()
    if (!typeForm.code.trim() || !typeForm.labelFr.trim()) {
      setTypeError('Code et libellé sont obligatoires')
      return
    }
    if (!typesSocId) {
      setTypeError('Aucune société associée à votre compte')
      return
    }
    setTypeSubmitting(true)
    setTypeError(null)
    try {
      const body: ActivityTypeRequest = {
        socId: typesSocId,
        code: typeForm.code.trim().toUpperCase(),
        labelFr: typeForm.labelFr.trim(),
        labelEn: typeForm.labelEn.trim() || null,
        color: typeForm.color || null,
        active: true,
      }
      if (typeForm.id != null) {
        await activityTypesApi.update(typeForm.id, body)
      } else {
        await activityTypesApi.create(body)
      }
      setTypesOpen(false)
      await reloadTypes()
    } catch (err) {
      setTypeError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setTypeSubmitting(false)
    }
  }

  async function handleTypeDeactivate(t: ActivityTypeDto) {
    if (!window.confirm(`Désactiver le type « ${t.labelFr} » ?`)) return
    try {
      await activityTypesApi.update(t.id, {
        socId: t.socId,
        code: t.code,
        labelFr: t.labelFr,
        labelEn: t.labelEn ?? null,
        color: t.color ?? null,
        active: false,
      })
      await reloadTypes()
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  function openCreate() {
    setForm({ ...emptyForm, typeId: types?.[0] ? String(types[0].id) : '' })
    setEditing(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(activity: ActivityDto) {
    setForm({
      name: activity.name,
      description: activity.description ?? '',
      price: String(activity.price),
      currency: activity.currency || 'EUR',
      typeId: activity.type ? String(activity.type.id) : '',
      active: activity.active,
    })
    setEditing(activity)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.typeId) {
      setFormError('Nom et type sont obligatoires')
      return
    }
    const socId = user?.socId ?? null
    if (!socId) {
      setFormError('Aucune société associée à votre compte')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        price: Number(form.price) || 0,
        currency: form.currency || 'EUR',
        typeId: Number(form.typeId),
        socId,
        active: form.active,
      }
      if (editing) {
        await activitiesApi.update(editing.id, payload)
      } else {
        await activitiesApi.create(payload)
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(activity: ActivityDto) {
    if (!window.confirm(`Supprimer l'activité « ${activity.name} » ?`)) return
    try {
      await activitiesApi.delete(activity.id)
      setData((prev) => (prev ?? []).filter((a) => a.id !== activity.id))
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  return (
    <div>
      <PageHeader
        title="Activités & tarifs"
        subtitle="Prestations facturables utilisées dans les CRA"
        actions={
          canEdit ? (
            <>
              {user.socId && (
                <InlineButton onClick={openTypeCreate}>Gérer les types</InlineButton>
              )}
              <Button className="w-auto" onClick={openCreate}>
                + Nouvelle activité
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(types ?? []).map((t: ActivityTypeDto) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: t.color ?? '#94a3b8' }}
            />
            {t.labelFr}
          </span>
        ))}
      </div>

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && data && data.length > 0 && (
        <Table
          rowKey={(a) => a.id}
          rows={data}
          onRowClick={canEdit ? openEdit : undefined}
          columns={[
            {
              key: 'name',
              label: 'Activité',
              render: (a) => (
                <div>
                  <p className="font-medium text-gray-900">{a.name}</p>
                  {a.description && <p className="text-xs text-gray-500">{a.description}</p>}
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              render: (a) => <Badge kind="info">{a.type?.labelFr ?? '—'}</Badge>,
            },
            {
              key: 'price',
              label: 'Tarif',
              render: (a) => (
                <span className="font-medium text-gray-900">{formatMoney(a.price, a.currency)}</span>
              ),
            },
            {
              key: 'soc',
              label: 'Société',
              render: (a) => <span className="text-gray-500">{a.soc?.name ?? '—'}</span>,
            },
            {
              key: 'active',
              label: 'Statut',
              render: (a) => (
                <Badge kind={a.active ? 'success' : 'muted'}>{a.active ? 'Active' : 'Inactive'}</Badge>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (a) =>
                canEdit ? (
                  <div className="flex justify-end gap-1">
                    <InlineButton
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(a)
                      }}
                    >
                      Modifier
                    </InlineButton>
                    <InlineButton
                      className="text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(a)
                      }}
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

      {!loading && data && data.length === 0 && (
        <EmptyState
          title="Aucune activité"
          description="Créez des prestations facturables pour vos CRA."
          action={
            canEdit ? (
              <Button className="w-auto" onClick={openCreate}>
                + Nouvelle activité
              </Button>
            ) : undefined
          }
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier « ${editing.name} »` : 'Nouvelle activité'}
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
          <Field label="Nom *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Type *">
              <Select value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
                <option value="">Sélectionner…</option>
                {(types ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelFr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prix">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Devise">
              <Select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CHF">CHF</option>
                <option value="GBP">GBP</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Activité active
          </label>
        </form>
      </Modal>

      <Modal
        open={typesOpen}
        onClose={() => setTypesOpen(false)}
        title={typeForm.id != null ? 'Modifier le type' : 'Types d\u2019activités'}
        footer={
          <>
            <InlineButton onClick={() => setTypesOpen(false)}>Fermer</InlineButton>
            <Button
              className="w-auto"
              onClick={typeForm.id != null ? (handleTypeSubmit as never) : openTypeCreate}
              disabled={typeSubmitting}
            >
              {typeSubmitting ? <Spinner className="border-white border-t-transparent" /> : null}
              {typeForm.id != null ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleTypeSubmit} className="space-y-4">
          {typeError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {typeError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Code *">
              <Input
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                placeholder="DEV"
              />
            </Field>
            <Field label="Libellé (FR) *">
              <Input
                value={typeForm.labelFr}
                onChange={(e) => setTypeForm({ ...typeForm, labelFr: e.target.value })}
                placeholder="Développement"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Libellé (EN)">
              <Input
                value={typeForm.labelEn}
                onChange={(e) => setTypeForm({ ...typeForm, labelEn: e.target.value })}
                placeholder="Development"
              />
            </Field>
            <Field label="Couleur">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={typeForm.color}
                  onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                />
                <Input
                  value={typeForm.color}
                  onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                  className="max-w-[8rem]"
                />
              </div>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Types existants</p>
            {!types || types.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun type pour cette société.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {(types ?? []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.color ?? '#94a3b8' }}
                      />
                      <span className="text-sm font-medium text-gray-900">{t.labelFr}</span>
                      <span className="text-xs text-gray-400">{t.code}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <InlineButton onClick={() => openTypeEdit(t)}>Modifier</InlineButton>
                      <InlineButton
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleTypeDeactivate(t)}
                      >
                        Désactiver
                      </InlineButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
