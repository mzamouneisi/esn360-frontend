import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { noteFraisApi } from '../api/noteFrais'
import { consultantsApi } from '../api/consultants'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, Field, InlineButton, Input, RefreshButton, Select, Spinner, Textarea } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, Modal, PageHeader, Table } from '../components/data'
import {
  MONTHS_FR,
  NOTE_FRAIS_CATEGORIES,
  NOTE_FRAIS_STATUS_LABELS,
  formatMoney,
  monthShort,
  statusBadge,
} from '../lib/format'
import type { NoteFraisDto } from '../api/types'

interface LineForm {
  date: string
  category: string
  label: string
  amount: string
  reimbursed: boolean
  comment: string
}

interface FormState {
  consultantId: string
  month: number
  year: number
  lines: LineForm[]
  infosFacture: string
}

function newLine(): LineForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: 'Déplacement',
    label: '',
    amount: '',
    reimbursed: false,
    comment: '',
  }
}

export function NoteFraisList() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  const isConsultant = user?.role === 'CONSULTANT'
  const canValidate =
    user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_SOC' || user?.role === 'MANAGER'

  const { data, loading, error, reload, setData } = useAsync(
    () =>
      isConsultant && user?.consultantId
        ? noteFraisApi.findByConsultantYear(user.consultantId, year)
        : user?.socId
          ? noteFraisApi.findBySocYear(user.socId, year)
          : Promise.resolve([] as NoteFraisDto[]),
    [user?.socId, user?.consultantId, isConsultant, year],
  )

  const { data: summaries } = useAsync(
    () => (user?.socId ? consultantsApi.summaries(user.socId) : Promise.resolve([])),
    [user?.socId],
  )

  const { data: totalsByMonth } = useAsync(
    () => (user?.socId && !isConsultant ? noteFraisApi.totalsByMonth(user.socId, year) : Promise.resolve({} as Record<string, number>)),
    [user?.socId, isConsultant, year],
  )
  const { data: totalsByCategory } = useAsync(
    () => (user?.socId && !isConsultant ? noteFraisApi.totalsByCategory(user.socId, year) : Promise.resolve({} as Record<string, number>)),
    [user?.socId, isConsultant, year],
  )

  const [form, setForm] = useState<FormState>({
    consultantId: isConsultant ? String(user?.consultantId ?? '') : '',
    month: now.getMonth() + 1,
    year,
    lines: [newLine()],
    infosFacture: '',
  })
  const [editing, setEditing] = useState<NoteFraisDto | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)

  if (!user) return null

  function openCreate() {
    setForm({
      consultantId: isConsultant ? String(user.consultantId ?? '') : '',
      month: now.getMonth() + 1,
      year,
      lines: [newLine()],
      infosFacture: '',
    })
    setEditing(null)
    setFormError(null)
    setAttachmentUrl(null)
    setAttachmentName(null)
    setModalOpen(true)
  }

  function openEdit(nf: NoteFraisDto) {
    setForm({
      consultantId: String(nf.consultantId),
      month: nf.month,
      year: nf.year,
      lines:
        nf.lines.length > 0
          ? nf.lines.map((l) => ({
              date: l.date,
              category: l.category,
              label: l.label,
              amount: String(l.amount),
              reimbursed: l.reimbursed,
              comment: l.comment ?? '',
            }))
          : [newLine()],
      infosFacture: nf.infosFacture ?? '',
    })
    setEditing(nf)
    setFormError(null)
    setAttachmentUrl(null)
    setAttachmentName(null)
    setModalOpen(true)
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (attachmentUrl) URL.revokeObjectURL(attachmentUrl)
    setAttachmentUrl(URL.createObjectURL(file))
    setAttachmentName(file.name)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const request = {
        consultantId: Number(form.consultantId),
        month: form.month,
        year: form.year,
        lines: form.lines
          .filter((l) => l.label.trim() || l.amount)
          .map((l) => ({
            date: l.date || new Date().toISOString().slice(0, 10),
            category: l.category,
            label: l.label.trim() || 'Dépense',
            amount: Number(l.amount) || 0,
            reimbursed: l.reimbursed,
            comment: l.comment || null,
          })),
        infosFacture: form.infosFacture || null,
      }
      if (request.lines.length === 0) {
        setFormError('Ajoutez au moins une ligne')
        setSubmitting(false)
        return
      }
      if (editing) {
        await noteFraisApi.update(editing.id, request)
      } else {
        await noteFraisApi.create(request)
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(nf: NoteFraisDto, action: 'submit' | 'validate' | 'reject' | 'delete') {
    try {
      if (action === 'submit') {
        const updated = await noteFraisApi.submit(nf.id)
        setData((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      } else if (action === 'validate') {
        const updated = await noteFraisApi.validate(nf.id)
        setData((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      } else if (action === 'reject') {
        const comment = window.prompt('Motif du rejet :')
        if (comment === null) return
        const updated = await noteFraisApi.reject(nf.id, comment)
        setData((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)))
      } else {
        if (!window.confirm('Supprimer cette note de frais ?')) return
        await noteFraisApi.delete(nf.id)
        setData((prev) => (prev ?? []).filter((x) => x.id !== nf.id))
      }
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  const totalYear = (data ?? []).reduce((sum, nf) => sum + nf.totalAmount, 0)
  const pendingCount = (data ?? []).filter((nf) => nf.status === 'SUBMITTED').length

  return (
    <div>
      <PageHeader
        title="Notes de frais"
        subtitle="Suivi des dépenses et remboursements"
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onClick={reload} />
            <Select
              className="w-auto"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Button className="w-auto" onClick={openCreate}>
              + Nouvelle note de frais
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Total {year}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totalYear)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">En attente de validation</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{pendingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Notes {year}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{(data ?? []).length}</p>
        </Card>
      </div>

      {!isConsultant && totalsByMonth && Object.keys(totalsByMonth).length > 0 && (
        <Card className="mt-6 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Montants par mois</h3>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            {MONTHS_FR.map((_, i) => {
              const value = totalsByMonth[String(i + 1)] ?? 0
              return (
                <div key={i} className="w-10 text-center">
                  <p className="text-xs font-medium text-gray-900">
                    {value > 0 ? formatMoney(value) : '—'}
                  </p>
                  <div className="mx-auto mt-1 h-20 w-4 overflow-hidden rounded bg-gray-100">
                    <div
                      className="w-full bg-brand-500"
                      style={{
                        height: value > 0 ? '100%' : '0%',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">{monthShort(i + 1)}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {!isConsultant && totalsByCategory && Object.keys(totalsByCategory).length > 0 && (
        <Card className="mt-6 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Montants par catégorie</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(totalsByCategory).map(([cat, value]) => (
              <span
                key={cat}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
              >
                {cat} · {formatMoney(value)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && data && data.length > 0 && (
        <div className="mt-6">
          <Table
            paginate
            rowKey={(nf) => nf.id}
            rows={data}
            columns={[
              {
                key: 'consultant',
                label: 'Consultant',
                render: (nf) => <span className="font-medium text-gray-900">{nf.consultantName}</span>,
              },
              {
                key: 'period',
                label: 'Période',
                render: (nf) => (
                  <span className="text-gray-700">
                    {MONTHS_FR[nf.month - 1]} {nf.year}
                  </span>
                ),
              },
              {
                key: 'lines',
                label: 'Lignes',
                render: (nf) => <span>{nf.lines.length}</span>,
              },
              {
                key: 'total',
                label: 'Total',
                render: (nf) => <span className="font-semibold text-gray-900">{formatMoney(nf.totalAmount)}</span>,
              },
              {
                key: 'status',
                label: 'Statut',
                render: (nf) => (
                  <Badge kind={statusBadge(nf.status)}>
                    {NOTE_FRAIS_STATUS_LABELS[nf.status] ?? nf.status}
                  </Badge>
                ),
              },
              {
                key: 'comment',
                label: 'Rejet',
                render: (nf) => (nf.status === 'REJECTED' ? <span className="text-xs text-amber-700">{nf.comment}</span> : <span>—</span>),
              },
              {
                key: 'actions',
                label: '',
                render: (nf) => (
                  <div className="flex justify-end gap-1">
                    {(nf.status === 'DRAFT' || nf.status === 'REJECTED') && (
                      <>
                        <InlineButton onClick={() => openEdit(nf)}>Modifier</InlineButton>
                        <InlineButton
                          className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={() => changeStatus(nf, 'submit')}
                        >
                          Soumettre
                        </InlineButton>
                      </>
                    )}
                    {canValidate && nf.status === 'SUBMITTED' && (
                      <>
                        <InlineButton
                          className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={() => changeStatus(nf, 'validate')}
                        >
                          Valider
                        </InlineButton>
                        <InlineButton
                          className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => changeStatus(nf, 'reject')}
                        >
                          Rejeter
                        </InlineButton>
                      </>
                    )}
                    <InlineButton
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => changeStatus(nf, 'delete')}
                    >
                      Suppr.
                    </InlineButton>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {!loading && data && data.length === 0 && (
        <Card className="mt-6 flex flex-col items-center justify-center py-14">
          <p className="text-sm font-medium text-gray-900">Aucune note de frais pour {year}</p>
          <p className="mt-1 text-sm text-gray-500">Créez votre première note de frais.</p>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier la note de ${editing.consultantName}` : 'Nouvelle note de frais'}
        size="xl"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {!isConsultant && (
              <Field label="Consultant">
                <Select
                  value={form.consultantId}
                  onChange={(e) => setForm({ ...form, consultantId: e.target.value })}
                >
                  <option value="">Sélectionner…</option>
                  {(summaries ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Mois">
              <Select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              >
                {MONTHS_FR.map((label, i) => (
                  <option key={i + 1} value={i + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Année">
              <Select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              >
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Lignes de dépenses</p>
              <span className="text-sm text-gray-500">
                Total : {formatMoney(form.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))}
              </span>
            </div>
            <div className="space-y-3">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-12 sm:items-center">
                  <Input
                    type="date"
                    className="sm:col-span-3"
                    value={line.date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lines: form.lines.map((l, j) => (j === i ? { ...l, date: e.target.value } : l)),
                      })
                    }
                  />
                  <Select
                    className="sm:col-span-2"
                    value={line.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lines: form.lines.map((l, j) => (j === i ? { ...l, category: e.target.value } : l)),
                      })
                    }
                  >
                    {NOTE_FRAIS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="Libellé / action"
                    className="sm:col-span-3"
                    value={line.label}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lines: form.lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)),
                      })
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Montant €"
                    className="sm:col-span-2"
                    value={line.amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lines: form.lines.map((l, j) => (j === i ? { ...l, amount: e.target.value } : l)),
                      })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-1">
                    <input
                      type="checkbox"
                      checked={line.reimbursed}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((l, j) =>
                            j === i ? { ...l, reimbursed: e.target.checked } : l,
                          ),
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-brand-600"
                    />
                    Remb.
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })
                    }
                    className="text-sm text-red-600 hover:text-red-800 sm:col-span-1"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, lines: [...form.lines, newLine()] })}
              className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              + Ajouter une ligne
            </button>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                Joindre une facture (image / PDF)
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              {attachmentName && (
                <span className="text-sm text-gray-600">
                  {attachmentName}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (attachmentUrl) URL.revokeObjectURL(attachmentUrl)
                      setAttachmentUrl(null)
                      setAttachmentName(null)
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Retirer
                  </button>
                </span>
              )}
            </div>
            {attachmentUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                {attachmentName && /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachmentName) ? (
                  <img src={attachmentUrl} alt="Aperçu de la facture" className="max-h-72 w-full object-contain" />
                ) : (
                  <iframe src={attachmentUrl} title="Aperçu du document" className="h-72 w-full" />
                )}
              </div>
            )}
          </div>

          <Field label="Infos facture (texte de la facture)">
            <Textarea
              rows={4}
              placeholder="Collez ou saisissez ici le contenu de la facture / du ticket…"
              value={form.infosFacture}
              onChange={(e) => setForm({ ...form, infosFacture: e.target.value })}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
