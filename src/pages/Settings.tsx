import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { Button, Card, Field, Select, Spinner } from '../components/ui'
import { PageHeader } from '../components/data'

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24]

const THEMES: { id: string; label: string; color: string }[] = [
  { id: 'ocean', label: 'Océan (bleu)', color: '#3367f6' },
  { id: 'forest', label: 'Forêt (vert)', color: '#2aa35a' },
  { id: 'sunset', label: 'Coucher de soleil (orange)', color: '#f97316' },
  { id: 'lilac', label: 'Lilas (violet)', color: '#8b5cf6' },
  { id: 'emerald', label: 'Émeraude (turquoise)', color: '#14b8a6' },
  { id: 'ruby', label: 'Rubis (rouge)', color: '#ef4444' },
  { id: 'amber', label: 'Ambre (or)', color: '#f59e0b' },
  { id: 'sky', label: 'Ciel (bleu clair)', color: '#0ea5e9' },
  { id: 'slate', label: 'Ardoise (gris)', color: '#64748b' },
  { id: 'rose', label: 'Rose (fuchsia)', color: '#f43f5e' },
]

export function Settings() {
  const { user, refreshMe } = useAuth()
  const [size, setSize] = useState<number>(user?.fontSize ?? 14)
  const [theme, setTheme] = useState<string>(user?.theme || 'ocean')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!user) return null
  const u = user

  const changed = size !== (u.fontSize ?? 14) || (u.theme || 'ocean') !== theme

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      if (size !== (u.fontSize ?? 14)) {
        await authApi.updateFontSize(size)
      }
      if ((u.theme || 'ocean') !== theme) {
        await authApi.updateTheme(theme)
      }
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
          <div
            className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
            style={{ fontSize: `${size}px` }}
          >
            Aperçu : ceci est un exemple de texte à cette taille.
          </div>
        </div>

        <h3 className="mt-8 text-sm font-semibold text-gray-900">Thème de l'application</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choisissez la couleur principale de l'application parmi les 10 thèmes disponibles.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="Thème">
            <Select
              className="w-56"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value)
                setSaved(false)
              }}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2 pb-1">
            <span
              className="inline-block h-5 w-5 rounded-full"
              style={{ backgroundColor: THEMES.find((t) => t.id === theme)?.color }}
            />
            <span className="text-sm text-gray-500">
              {THEMES.find((t) => t.id === theme)?.label}
            </span>
          </div>
        </div>
        <div
          className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
          style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-800)' }}
        >
          Aperçu : ceci est un exemple de texte aux couleurs du thème.
        </div>

        <Button
          className="mt-6 w-auto"
          onClick={() => void handleSave()}
          disabled={saving || !changed}
        >
          {saving ? <Spinner className="border-white border-t-transparent" /> : null}
          Enregistrer
        </Button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-green-600">Préférences enregistrées.</p>}
      </Card>
    </div>
  )
}