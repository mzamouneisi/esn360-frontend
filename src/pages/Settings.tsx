import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { Button, Card, Field, Select, Spinner } from '../components/ui'
import { PageHeader } from '../components/data'

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24]

export function Settings() {
  const { user, refreshMe } = useAuth()
  const [size, setSize] = useState<number>(user?.fontSize ?? 14)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!user) return null

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await authApi.updateFontSize(size)
      await refreshMe()
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Personnalisez l'application" />
      <Card className="max-w-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900">Taille de police de l'application</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choisissez la taille du texte affichée dans toute l'application (11 à 24 px).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="Taille (px)">
            <Select
              className="w-28"
              value={String(size)}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setSaved(false)
              }}
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} px
                </option>
              ))}
            </Select>
          </Field>
          <Button
            className="w-auto"
            onClick={() => void handleSave()}
            disabled={saving || size === (user.fontSize ?? 14)}
          >
            {saving ? <Spinner className="border-white border-t-transparent" /> : null}
            Enregistrer
          </Button>
        </div>
        <div
          className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
          style={{ fontSize: `${size}px` }}
        >
          Aperçu : ceci est un exemple de texte à cette taille.
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-green-600">Préférence enregistrée.</p>}
      </Card>
    </div>
  )
}