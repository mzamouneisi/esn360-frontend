import { useState, type FormEvent } from 'react'
import { useSoc } from './SocContext'
import { Button, Field, Input, Textarea } from '../components/ui'
import { Modal } from '../components/data'

export function SocSelector() {
  const { socs, selectedSoc, selectSoc, canAddSoc, loading } = useSoc()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Société active"
      >
        <span className="max-w-48 truncate">
          {selectedSoc?.name ?? (socs.length > 0 ? 'Choisir une société' : 'Espace de travail')}
        </span>
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            {loading && socs.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">Chargement…</p>
            ) : socs.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">Aucune société associée</p>
            ) : (
              <ul role="listbox" aria-label="Société active">
                {socs.map((soc) => (
                  <li key={soc.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={soc.id === selectedSoc?.id}
                      onClick={() => {
                        selectSoc(soc.id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                        soc.id === selectedSoc?.id
                          ? 'bg-brand-50 font-medium text-brand-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{soc.name}</span>
                      {soc.id === selectedSoc?.id && (
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.29 7.3-7.3a1 1 0 0 1 1.4 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {canAddSoc && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setAdding(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                >
                  <span className="text-base leading-none">＋</span>
                  Inscrire une société
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {canAddSoc && <AddSocModal open={adding} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddSocModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addSoc } = useSoc()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [siret, setSiret] = useState('')
  const [codeNaf, setCodeNaf] = useState('')
  const [urssaf, setUrssaf] = useState('')
  const [website, setWebsite] = useState('')
  const [street, setStreet] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setDescription('')
    setSiret('')
    setCodeNaf('')
    setUrssaf('')
    setWebsite('')
    setStreet('')
    setZipCode('')
    setCity('')
    setCountry('')
    setError(null)
  }

  function close() {
    reset()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Le nom de la société est obligatoire")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addSoc({
        socName: name.trim(),
        description: description.trim() || undefined,
        siret: siret.trim() || undefined,
        codeNaf: codeNaf.trim() || undefined,
        urssaf: urssaf.trim() || undefined,
        website: website.trim() || undefined,
        street: street.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      })
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription de la société")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Inscrire une nouvelle société"
      onClose={close}
      size="lg"
      footer={
        <>
          <Button type="button" onClick={close} className="!w-auto !bg-gray-100 !text-gray-700 hover:!bg-gray-200">
            Annuler
          </Button>
          <Button type="submit" form="add-soc-form" disabled={saving} className="!w-auto">
            {saving ? 'Enregistrement…' : "Inscrire la société"}
          </Button>
        </>
      }
    >
      <form id="add-soc-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Field label="Nom de la société *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : XYZ Consulting" autoFocus />
        </Field>

        <Field label="Description">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Activité, présentation de la société…"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="SIRET">
            <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" />
          </Field>
          <Field label="Code NAF">
            <Input value={codeNaf} onChange={(e) => setCodeNaf(e.target.value)} placeholder="Ex : 6202A" />
          </Field>
          <Field label="URSSAF">
            <Input value={urssaf} onChange={(e) => setUrssaf(e.target.value)} />
          </Field>
        </div>

        <Field label="Site web">
          <Input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">Adresse</legend>
          <Field label="Rue">
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="N° et rue" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Code postal">
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </Field>
            <Field label="Ville">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Pays">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="FR" />
            </Field>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
