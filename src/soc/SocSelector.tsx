import { useState, type FormEvent } from 'react'
import { authApi, type CompanyLookup } from '../api/auth'
import { Modal } from '../components/data'
import { Button, Field, Input, Textarea } from '../components/ui'
import { useSoc } from './SocContext'

export function SocSelector() {
  const { socs, selectedSoc, selectSoc, canAddSoc, loading, favoriteSocId, setFavoriteSoc } = useSoc()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [favoriting, setFavoriting] = useState<number | null>(null)

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
                {socs.map((soc) => {
                  const isFavorite = soc.id === favoriteSocId
                  const isSelected = soc.id === selectedSoc?.id
                  return (
                    <li key={soc.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          selectSoc(soc.id)
                          setOpen(false)
                        }}
                        className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'bg-brand-50 font-medium text-brand-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{soc.name}</span>
                        {isSelected && (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.29 7.3-7.3a1 1 0 0 1 1.4 0Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                      {canAddSoc && (
                        <button
                          type="button"
                          title={isFavorite ? 'Société favorite' : 'Définir comme favorite'}
                          aria-label={isFavorite ? 'Société favorite' : 'Définir comme favorite'}
                          disabled={favoriting === soc.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setFavoriting(soc.id)
                            try {
                              await setFavoriteSoc(soc.id)
                            } finally {
                              setFavoriting(null)
                            }
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-amber-50 ${
                            isFavorite ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'
                          }`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </li>
                  )
                })}
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
  const [infosWeb, setInfosWeb] = useState('')
  const [siret, setSiret] = useState('')
  const [codeNaf, setCodeNaf] = useState('')
  const [urssaf, setUrssaf] = useState('')
  const [gerant, setGerant] = useState('')
  const [categorieEntreprise, setCategorieEntreprise] = useState('')
  const [dateCreation, setDateCreation] = useState('')
  const [dateFermeture, setDateFermeture] = useState('')
  const [website, setWebsite] = useState('')
  const [street, setStreet] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CompanyLookup[]>([])

  function reset() {
    setName('')
    setDescription('')
    setInfosWeb('')
    setSiret('')
    setCodeNaf('')
    setUrssaf('')
    setGerant('')
    setCategorieEntreprise('')
    setDateCreation('')
    setDateFermeture('')
    setWebsite('')
    setStreet('')
    setZipCode('')
    setCity('')
    setCountry('')
    setError(null)
    setSearchResults([])
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
        infosWeb: infosWeb.trim() || undefined,
        siret: siret.trim() || undefined,
        codeNaf: codeNaf.trim() || undefined,
        urssaf: urssaf.trim() || undefined,
        gerant: gerant.trim() || undefined,
        categorieEntreprise: categorieEntreprise.trim() || undefined,
        dateCreation: dateCreation || undefined,
        dateFermeture: dateFermeture || undefined,
        website: ensureHttps(website) || undefined,
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

  async function searchCompany() {
    if (!name.trim() && !siret.trim()) {
      setError('Saisissez le nom ou le SIRET de la société')
      return
    }
    setSearching(true)
    setError(null)
    try {
      const companies = await authApi.searchSoc(name.trim() || undefined, siret.trim() || undefined)
      if (companies.length !== 1) {
        setSearchResults(companies)
        if (companies.length === 0 && name.trim()) {
          setWebsite(fallbackWebsite(name))
        }
        return
      }
      const company = companies[0]
      if (company.name) setName(company.name)
      if (company.infosWeb) setInfosWeb(company.infosWeb)
      if (company.siret) setSiret(company.siret)
      if (company.codeNaf) setCodeNaf(company.codeNaf)
      if (company.gerant) setGerant(company.gerant)
      if (company.categorieEntreprise) setCategorieEntreprise(company.categorieEntreprise)
      if (company.dateCreation) setDateCreation(company.dateCreation)
      if (company.dateFermeture) setDateFermeture(company.dateFermeture)
       setWebsite(ensureHttps(company.website || fallbackWebsite(company.name || name)))
      if (company.street) setStreet(company.street)
      if (company.zipCode) setZipCode(company.zipCode)
      if (company.city) setCity(company.city)
      if (company.country) setCountry(company.country)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche impossible')
    } finally {
      setSearching(false)
    }
  }

  function clearCompanySearch() {
    if (!window.confirm('Voulez-vous effacer tous les champs du formulaire ?')) return
    reset()
  }

  function chooseCompany(company: CompanyLookup) {
    if (company.name) setName(company.name)
    if (company.infosWeb) setInfosWeb(company.infosWeb)
    if (company.siret) setSiret(company.siret)
    if (company.codeNaf) setCodeNaf(company.codeNaf)
    if (company.gerant) setGerant(company.gerant)
    if (company.categorieEntreprise) setCategorieEntreprise(company.categorieEntreprise)
    if (company.dateCreation) setDateCreation(company.dateCreation)
    if (company.dateFermeture) setDateFermeture(company.dateFermeture)
     setWebsite(ensureHttps(company.website || fallbackWebsite(company.name || name)))
    if (company.street) setStreet(company.street)
    if (company.zipCode) setZipCode(company.zipCode)
    if (company.city) setCity(company.city)
    if (company.country) setCountry(company.country)
    setSearchResults([])
  }

  function ensureHttps(value: string | null | undefined): string {
    const website = value?.trim() ?? ''
    if (!website) return ''
    return /^https?:\/\//i.test(website) ? website.replace(/^http:\/\//i, 'https://') : `https://${website}`
  }

  function fallbackWebsite(companyName: string): string {
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
    return `https://www.${slug || 'societe'}.com`
  }

  return (
    <Modal
      open={open}
      title="Inscrire une nouvelle société : "
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

        <Field label="Informations web">
          <Textarea rows={3} value={infosWeb} onChange={(e) => setInfosWeb(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="SIRET">
            <div className="flex flex-wrap gap-2">
              <Input className="basis-full" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" />
              <div className="basis-full flex justify-start gap-2">
                <Button type="button" onClick={searchCompany} disabled={searching} className="!w-auto whitespace-nowrap">
                  {searching ? 'Recherche…' : 'Rechercher'}
                </Button>
                <Button type="button" onClick={clearCompanySearch} className="!w-auto whitespace-nowrap !bg-gray-100 !text-gray-700 hover:!bg-gray-200">
                  Effacer
                </Button>
              </div>
            </div>
          </Field>
          <Field label="Code NAF">
            <Input value={codeNaf} onChange={(e) => setCodeNaf(e.target.value)} placeholder="Ex : 6202A" />
          </Field>
          <Field label="URSSAF">
            <Input value={urssaf} onChange={(e) => setUrssaf(e.target.value)} />
          </Field>
          <Field label="Gérant">
            <Input value={gerant} onChange={(e) => setGerant(e.target.value)} />
          </Field>
          <Field label="Catégorie entreprise">
            <Input value={categorieEntreprise} onChange={(e) => setCategorieEntreprise(e.target.value)} />
          </Field>
          <Field label="Date de création">
            <Input type="date" value={dateCreation} onChange={(e) => setDateCreation(e.target.value)} />
          </Field>
          <Field label="Date de fermeture">
            <Input type="date" value={dateFermeture} onChange={(e) => setDateFermeture(e.target.value)} />
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
      {searchResults.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Choisir une société</h3>
            <div className="mt-4 space-y-2">
              {searchResults.map((company, index) => (
                <button key={`${company.siret ?? company.name}-${index}`} type="button" onClick={() => chooseCompany(company)} className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50">
                  <span className="block font-medium text-gray-900">{company.name ?? 'Société sans nom'}</span>
                  <span className="text-sm text-gray-500">{company.siret ?? 'SIRET inconnu'} · {company.city ?? 'Ville inconnue'}</span>
                </button>
              ))}
            </div>
            <Button type="button" onClick={() => setSearchResults([])} className="mt-4 !w-auto !bg-gray-100 !text-gray-700">Annuler</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
