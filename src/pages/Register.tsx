import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi, type CompanyLookup } from '../api/auth'
import { ApiError } from '../api/client'
import { Alert, Button, Card, Field, Input, Spinner, Textarea } from '../components/ui'

export function Register() {
  const [socName, setSocName] = useState('')
  const [siret, setSiret] = useState('')
  const [description, setDescription] = useState('')
  const [infosWeb, setInfosWeb] = useState('')
  const [gerant, setGerant] = useState('')
  const [codeNaf, setCodeNaf] = useState('')
  const [urssaf, setUrssaf] = useState('')
  const [website, setWebsite] = useState('')
  const [street, setStreet] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [categorieEntreprise, setCategorieEntreprise] = useState('')
  const [dateCreation, setDateCreation] = useState('')
  const [dateFermeture, setDateFermeture] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CompanyLookup[]>([])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.registerSoc({
        socName,
        description: description || undefined,
        siret: siret || undefined,
        infosWeb: infosWeb || undefined,
        gerant: gerant || undefined,
        codeNaf: codeNaf || undefined,
        urssaf: urssaf || undefined,
        website: ensureHttps(website) || undefined,
        street: street || undefined,
        zipCode: zipCode || undefined,
        city: city || undefined,
        country: country || undefined,
        categorieEntreprise: categorieEntreprise || undefined,
        dateCreation: dateCreation || undefined,
        dateFermeture: dateFermeture || undefined,
        adminFirstName,
        adminLastName,
        username,
        email,
        password,
      })
      setMessage(response.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function searchCompany() {
    if (!socName.trim() && !siret.trim()) {
      setError('Saisissez le nom ou le SIRET de la société')
      return
    }
    setSearching(true)
    setError(null)
    try {
      const companies = await authApi.searchSoc(socName.trim() || undefined, siret.trim() || undefined)
      if (companies.length !== 1) {
        setSearchResults(companies)
        if (companies.length === 0 && socName.trim()) {
          setWebsite(fallbackWebsite(socName))
        }
        return
      }
      const company = companies[0]
      if (company.name) setSocName(company.name)
      if (company.infosWeb) setInfosWeb(company.infosWeb)
      if (company.siret) setSiret(company.siret)
       let generatedUsername = username
       if (company.gerant) {
         setGerant(company.gerant)
         generatedUsername = updateAdministrator(company.gerant)
       }
      if (company.codeNaf) setCodeNaf(company.codeNaf)
       const companyWebsite = ensureHttps(company.website || fallbackWebsite(company.name || socName))
       setWebsite(companyWebsite)
       setEmail(buildCompanyEmail(generatedUsername, companyWebsite))
      if (company.street) setStreet(company.street)
      if (company.zipCode) setZipCode(company.zipCode)
      if (company.city) setCity(company.city)
      if (company.country) setCountry(company.country)
      if (company.categorieEntreprise) setCategorieEntreprise(company.categorieEntreprise)
      if (company.dateCreation) setDateCreation(company.dateCreation)
      if (company.dateFermeture) setDateFermeture(company.dateFermeture)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Recherche impossible')
    } finally {
      setSearching(false)
    }
  }

  function clearCompanySearch() {
    if (!window.confirm('Voulez-vous effacer tous les champs du formulaire ?')) return

    setSocName('')
    setSiret('')
    setDescription('')
    setInfosWeb('')
    setGerant('')
    setCodeNaf('')
    setUrssaf('')
    setWebsite('')
    setStreet('')
    setZipCode('')
    setCity('')
    setCountry('')
    setCategorieEntreprise('')
    setDateCreation('')
    setDateFermeture('')
    setAdminFirstName('')
    setAdminLastName('')
    setUsername('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setSearchResults([])
    setError(null)
    setMessage(null)
  }

  function chooseCompany(company: CompanyLookup) {
    if (company.name) setSocName(company.name)
    if (company.infosWeb) setInfosWeb(company.infosWeb)
    if (company.siret) setSiret(company.siret)
     let generatedUsername = username
     if (company.gerant) {
       setGerant(company.gerant)
       generatedUsername = updateAdministrator(company.gerant)
     }
    if (company.codeNaf) setCodeNaf(company.codeNaf)
     const companyWebsite = ensureHttps(company.website || fallbackWebsite(company.name || socName))
     setWebsite(companyWebsite)
     setEmail(buildCompanyEmail(generatedUsername, companyWebsite))
    if (company.street) setStreet(company.street)
    if (company.zipCode) setZipCode(company.zipCode)
    if (company.city) setCity(company.city)
    if (company.country) setCountry(company.country)
    if (company.categorieEntreprise) setCategorieEntreprise(company.categorieEntreprise)
    if (company.dateCreation) setDateCreation(company.dateCreation)
    if (company.dateFermeture) setDateFermeture(company.dateFermeture)
    setSearchResults([])
  }

  function fallbackWebsite(name: string): string {
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
    return `https://www.${slug || 'societe'}.com`
  }

  function ensureHttps(value: string | null | undefined): string {
    const website = value?.trim() ?? ''
    if (!website) return ''
    return /^https?:\/\//i.test(website) ? website.replace(/^http:\/\//i, 'https://') : `https://${website}`
  }

  function updateAdministrator(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return username
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ')
    setAdminFirstName(firstName)
    setAdminLastName(lastName)
    const generatedUsername = `${firstName[0]}${lastName.replace(/\s+/g, '')}`.toLowerCase()
    setUsername(generatedUsername)
    return generatedUsername
  }

  function buildCompanyEmail(currentUsername: string, site: string): string {
    const domain = site.trim().replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '').toLowerCase()
    return currentUsername && domain ? `${currentUsername}@${domain}` : ''
  }

  if (message) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
        <Card className="w-full max-w-lg p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
              E
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vérifiez votre boîte mail</h1>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
          <Alert variant="success">
            Cliquez sur le lien reçu pour valider votre inscription et activer votre compte.
            Ce lien expire au bout de 2 heures.
          </Alert>

          <p className="mt-6 text-center text-sm text-gray-600">
            Déjà validé ?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Se connecter
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Inscrire votre société</h1>
          <p className="mt-1 text-sm text-gray-500">
            Créez le compte administrateur de votre société
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom de la société">
              <Input
                type="text"
                value={socName}
                onChange={(e) => setSocName(e.target.value)}
                required
                placeholder="Ma société de conseil"
              />
            </Field>

            <Field label="SIRET (optionnel)">
              <div className="flex flex-wrap gap-2">
              <Input
                className="basis-full"
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
              />
                <div className="basis-full flex justify-start gap-2">
                  <Button type="button" onClick={searchCompany} disabled={searching} className="w-auto whitespace-nowrap">
                    {searching ? 'Recherche…' : 'Rechercher'}
                  </Button>
                  <Button type="button" onClick={clearCompanySearch} className="w-auto whitespace-nowrap !bg-gray-100 !text-gray-700 hover:!bg-gray-200">
                    Effacer
                  </Button>
                </div>
              </div>
            </Field>
          </div>

          <Field label="Informations web">
            <Textarea rows={3} value={infosWeb} onChange={(e) => setInfosWeb(e.target.value)} />
          </Field>

          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field label="Gérant">
            <Input value={gerant} onChange={(e) => setGerant(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom de l'administrateur">
              <Input type="text" value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} required placeholder="Marie" />
            </Field>
            <Field label="Nom de l'administrateur">
              <Input type="text" value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} required placeholder="Durand" />
            </Field>
          </div>

          <Field label="Activité principale / Code NAF">
            <Input value={codeNaf} onChange={(e) => setCodeNaf(e.target.value)} />
          </Field>
          <Field label="URSSAF">
            <Input value={urssaf} onChange={(e) => setUrssaf(e.target.value)} />
          </Field>
          <Field label="Site web">
            <Input aria-label="Site web" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </Field>
          <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
            <legend className="px-1 text-sm font-medium text-gray-700">Adresse de la société</legend>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rue" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="Code postal" />
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" />
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" />
            </div>
          </fieldset>

          <Field label="Catégorie entreprise">
            <Input value={categorieEntreprise} onChange={(e) => setCategorieEntreprise(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date de création">
              <Input type="date" value={dateCreation} onChange={(e) => setDateCreation(e.target.value)} />
            </Field>
            <Field label="Date de fermeture">
              <Input type="date" value={dateFermeture} onChange={(e) => setDateFermeture(e.target.value)} />
            </Field>
          </div>

          <Field label="Nom d'utilisateur">
            <Input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="marie.durand"
            />
          </Field>

          <Field label="Adresse e-mail">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="marie.durand@exemple.fr"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>

            <Field label="Confirmer le mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
            Créer mon compte
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Se connecter
          </Link>
        </p>
      </Card>
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
            <Button type="button" onClick={() => setSearchResults([])} className="mt-4 w-auto !bg-gray-100 !text-gray-700">Annuler</Button>
          </div>
        </div>
      )}
    </div>
  )
}
