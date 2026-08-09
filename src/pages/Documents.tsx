import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { documentsApi } from '../api/documents'
import { consultantsApi } from '../api/consultants'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, Field, InlineButton, Input, Select, Spinner } from '../components/ui'
import { Badge, EmptyState, ErrorBlock, LoadingBlock, Modal, PageHeader, Table } from '../components/data'
import { DOCUMENT_CATEGORIES, formatDate, formatSize } from '../lib/format'
import type { HrDocumentDto } from '../api/types'

export function Documents() {
  const { user } = useAuth()
  const isConsultant = user?.role === 'CONSULTANT'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_ESN'

  const { data, loading, error, reload, setData } = useAsync(
    () =>
      isConsultant && user?.consultantId
        ? documentsApi.findAll({ consultantId: user.consultantId })
        : documentsApi.findAll({ esnId: user?.esnId ?? undefined }),
    [user?.esnId, user?.consultantId, isConsultant],
  )

  const { data: summaries } = useAsync(
    () => (user?.esnId ? consultantsApi.summaries(user.esnId) : Promise.resolve([])),
    [user?.esnId],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [consultantId, setConsultantId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  function openUpload() {
    setFile(null)
    setCategory(DOCUMENT_CATEGORIES[0])
    setDescription('')
    setExpiresAt('')
    setConsultantId(isConsultant ? String(user.consultantId ?? '') : '')
    setFormError(null)
    setModalOpen(true)
    setTimeout(() => fileRef.current?.click(), 50)
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setFormError('Sélectionnez un fichier')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await documentsApi.upload(file, {
        consultantId: consultantId
          ? Number(consultantId)
          : isConsultant
            ? (user?.consultantId ?? null)
            : null,
        esnId: user?.esnId ?? null,
        category,
        expiresAt: expiresAt || null,
        description: description || null,
      })
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload(doc: HrDocumentDto) {
    try {
      await documentsApi.download(doc.id, doc.name)
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  async function handleDelete(doc: HrDocumentDto) {
    if (!window.confirm(`Supprimer le document « ${doc.name} » ?`)) return
    try {
      await documentsApi.delete(doc.id)
      setData((prev) => (prev ?? []).filter((d) => d.id !== doc.id))
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  const expiredSoon = (data ?? []).filter((d) => {
    if (!d.expiresAt) return false
    const exp = new Date(d.expiresAt + 'T00:00:00')
    const limit = new Date()
    limit.setDate(limit.getDate() + 30)
    return exp < limit
  }).length

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Partage et archivage des documents (contrats, pièces RH…)"
        actions={
          canEdit ? (
            <Button className="w-auto" onClick={openUpload}>
              + Partager un document
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Documents</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{(data ?? []).length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Expire sous 30 jours</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{expiredSoon}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Taille totale</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatSize((data ?? []).reduce((s, d) => s + d.size, 0))}
          </p>
        </Card>
      </div>

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && data && data.length > 0 && (
        <div className="mt-6">
          <Table
            rowKey={(d) => d.id}
            rows={data}
            columns={[
              {
                key: 'name',
                label: 'Document',
                render: (d) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6Zm7 7V3.5L18.5 9H13Z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(d.size)}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                label: 'Catégorie',
                render: (d) => <Badge kind="info">{d.category}</Badge>,
              },
              {
                key: 'description',
                label: 'Description',
                render: (d) => <span className="text-gray-500">{d.description ?? '—'}</span>,
              },
              {
                key: 'expires',
                label: 'Expire le',
                render: (d) => <span className="text-gray-500">{formatDate(d.expiresAt)}</span>,
              },
              {
                key: 'uploaded',
                label: 'Partagé par',
                render: (d) => <span className="text-gray-500">{d.uploadedBy}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (d) => (
                  <div className="flex justify-end gap-1">
                    <InlineButton onClick={() => handleDownload(d)}>Télécharger</InlineButton>
                    {canEdit && (
                      <InlineButton
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(d)}
                      >
                        Supprimer
                      </InlineButton>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {!loading && data && data.length === 0 && (
        <EmptyState
          title="Aucun document"
          description="Partagez le premier document de votre espace."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Partager un document"
        footer={
          <>
            <InlineButton onClick={() => setModalOpen(false)}>Annuler</InlineButton>
            <Button className="w-auto" onClick={handleUpload as never} disabled={submitting || !file}>
              {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
              Partager
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </div>
          )}
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => fileRef.current?.click()}>
              <p className="text-sm font-medium text-brand-600">
                {file ? file.name : 'Choisir un fichier'}
              </p>
              {!file && <p className="mt-1 text-xs text-gray-500">PDF, images, documents…</p>}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </Field>
            {!isConsultant && (
              <Field label="Consultant concerné">
                <Select value={consultantId} onChange={(e) => setConsultantId(e.target.value)}>
                  <option value="">Tous / général</option>
                  {(summaries ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contrat signé, avenant…"
            />
          </Field>
          <Field label="Expiration (optionnel)">
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
