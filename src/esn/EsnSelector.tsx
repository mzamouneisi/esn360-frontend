import { useState, type FormEvent } from 'react'
import { useEsn } from './EsnContext'
import { Button, Input } from '../components/ui'

export function EsnSelector() {
  const { esns, selectedEsn, selectEsn, addEsn, canAddEsn, loading } = useEsn()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [siret, setSiret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Le nom de l'ESN est obligatoire")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addEsn({ esnName: name.trim(), siret: siret.trim() || undefined })
      setName('')
      setSiret('')
      setAdding(false)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription de l'ESN")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="ESN active"
      >
        <span className="max-w-48 truncate">
          {selectedEsn?.name ?? (esns.length > 0 ? 'Choisir une ESN' : 'Espace de travail')}
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
            {loading && esns.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">Chargement…</p>
            ) : esns.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">Aucune ESN associée</p>
            ) : (
              <ul role="listbox" aria-label="ESN active">
                {esns.map((esn) => (
                  <li key={esn.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={esn.id === selectedEsn?.id}
                      onClick={() => {
                        selectEsn(esn.id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                        esn.id === selectedEsn?.id
                          ? 'bg-brand-50 font-medium text-brand-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{esn.name}</span>
                      {esn.id === selectedEsn?.id && (
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

            {canAddEsn && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                {adding ? (
                  <form onSubmit={handleAdd} className="space-y-2 px-1">
                    <Input
                      placeholder="Nom de l'ESN"
                      value={name}
                      onChange={(ev) => setName(ev.target.value)}
                      autoFocus
                    />
                    <Input
                      placeholder="SIRET (optionnel)"
                      value={siret}
                      onChange={(ev) => setSiret(ev.target.value)}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving} className="!py-1.5 text-xs">
                        {saving ? 'Enregistrement…' : 'Inscrire'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setAdding(false)
                          setError(null)
                        }}
                        className="!bg-gray-100 !py-1.5 text-xs !text-gray-700 hover:!bg-gray-200"
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                  >
                    <span className="text-base leading-none">＋</span>
                    Inscrire une ESN
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
