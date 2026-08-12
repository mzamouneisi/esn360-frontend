import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { crasApi } from '../api/cras'
import { activitiesApi } from '../api/activities'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, InlineButton, Select, Spinner } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock } from '../components/data'
import {
  CRA_STATUS_LABELS,
  DAY_TYPE_LABELS,
  MONTHS_FR,
  statusBadge,
} from '../lib/format'
import type { CraDto, DayType } from '../api/types'

interface EditableActivity {
  activityId: string
  hours: string
  comment: string
}

interface EditableDay {
  date: string
  dayType: DayType
  workedHours: string
  comment: string
  activities: EditableActivity[]
}

const DAY_TYPES: DayType[] = ['WORKED', 'WEEKEND', 'PUBLIC_HOLIDAY', 'LEAVE', 'SICK_LEAVE', 'OTHER']

function dayToEditable(day: CraDto['days'][number]): EditableDay {
  return {
    date: day.date,
    dayType: day.dayType,
    workedHours: day.workedHours != null ? String(day.workedHours) : '',
    comment: day.comment ?? '',
    activities: day.activities.map((a) => ({
      activityId: String(a.activityId),
      hours: String(a.hours),
      comment: a.comment ?? '',
    })),
  }
}

export function CraDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: cra, loading, error, setData } = useAsync(
    () => crasApi.getById(Number(id)),
    [id],
  )

  const { data: activities } = useAsync(
    () => activitiesApi.findAll(user?.socId ? { socId: user.socId } : undefined),
    [user?.socId],
  )

  const [days, setDays] = useState<EditableDay[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (cra) setDays(cra.days.map(dayToEditable))
  }, [cra])

  if (!cra) {
    if (loading) return <LoadingBlock />
    if (error) return <ErrorBlock message={error} />
    return null
  }

  const editable = cra.status === 'DRAFT' || cra.status === 'REJECTED'
  const canValidate =
    user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_SOC' || user?.role === 'MANAGER'

  function updateDay(index: number, patch: Partial<EditableDay>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function updateActivity(dayIndex: number, actIndex: number, patch: Partial<EditableActivity>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              activities: d.activities.map((a, j) => (j === actIndex ? { ...a, ...patch } : a)),
            }
          : d,
      ),
    )
  }

  function addActivity(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, activities: [...d.activities, { activityId: '', hours: '', comment: '' }] }
          : d,
      ),
    )
  }

  function removeActivity(dayIndex: number, actIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, activities: d.activities.filter((_, j) => j !== actIndex) }
          : d,
      ),
    )
  }

  async function handleSave() {
    if (!cra) return
    setSaving(true)
    setFormError(null)
    try {
      const request = {
        month: cra.month,
        year: cra.year,
        days: days.map((d) => {
          const dayActivities = d.activities
            .filter((a) => a.activityId)
            .map((a) => ({
              activityId: Number(a.activityId),
              hours: Number(a.hours) || 0,
              comment: a.comment || null,
            }))
          const dayHours = dayActivities.reduce((sum, a) => sum + a.hours, 0)
          return {
            date: d.date,
            dayType: d.dayType,
            workedHours: d.dayType === 'WORKED' ? Number(d.workedHours) || 0 : 0,
            hours: dayActivities.length > 0 ? dayHours : null,
            comment: d.comment || null,
            activities: dayActivities,
          }
        }),
      }
      const updated = await crasApi.save(cra.id, request)
      setData(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!cra) return
    setSubmitting(true)
    setFormError(null)
    try {
      await handleSave()
      const updated = await crasApi.submit(cra.id)
      setData(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleValidate() {
    if (!cra) return
    try {
      const updated = await crasApi.validate(cra.id)
      setData(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  async function handleReject() {
    if (!cra) return
    const comment = window.prompt('Motif du rejet :')
    if (comment === null) return
    try {
      const updated = await crasApi.reject(cra.id, comment)
      setData(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/cras')}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Retour aux CRA
          </button>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            CRA de {cra.consultantName ?? '—'}
          </h2>
          <p className="text-sm text-gray-500">
            {MONTHS_FR[cra.month - 1]} {cra.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge kind={statusBadge(cra.status)}>
            {CRA_STATUS_LABELS[cra.status] ?? cra.status}
          </Badge>
          <span className="text-sm text-gray-500">
            {cra.totalWorkedDays} j · {cra.totalHours} h
          </span>
        </div>
      </div>

      {formError && <ErrorBlock message={formError} />}

      {cra.status === 'REJECTED' && cra.comment && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Rejeté :</strong> {cra.comment}
        </div>
      )}

      {!editable && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Ce CRA est {CRA_STATUS_LABELS[cra.status]?.toLowerCase() ?? cra.status.toLowerCase()} et n'est
          plus modifiable.
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Jour
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Heures trav.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Activités
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {days.map((day, i) => (
                <tr key={day.date} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <Select
                        className="w-36"
                        value={day.dayType}
                        onChange={(e) =>
                          updateDay(i, {
                            dayType: e.target.value as DayType,
                            workedHours:
                              e.target.value === 'WORKED' ? day.workedHours : '0',
                          })
                        }
                      >
                        {DAY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {DAY_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-sm">{DAY_TYPE_LABELS[day.dayType]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={day.workedHours}
                        disabled={day.dayType !== 'WORKED'}
                        onChange={(e) => updateDay(i, { workedHours: e.target.value })}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
                      />
                    ) : (
                      <span className="text-sm">{day.workedHours} h</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {day.activities.map((act, j) => (
                        <div key={j} className="flex flex-wrap items-center gap-2">
                          {editable ? (
                            <>
                              <Select
                                className="w-48"
                                value={act.activityId}
                                onChange={(e) => updateActivity(i, j, { activityId: e.target.value })}
                              >
                                <option value="">Activité…</option>
                                {(activities ?? []).map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                              </Select>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={act.hours}
                                onChange={(e) => updateActivity(i, j, { hours: e.target.value })}
                                className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                placeholder="h"
                              />
                              <button
                                onClick={() => removeActivity(i, j)}
                                className="text-red-500 hover:text-red-700"
                                aria-label="Supprimer l'activité"
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <span className="text-sm">
                              {(activities ?? []).find((a) => a.id === Number(act.activityId))?.name ??
                                'Activité inconnue'}{' '}
                              · {act.hours} h
                            </span>
                          )}
                        </div>
                      ))}
                      {editable && (
                        <button
                          onClick={() => addActivity(i)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          + Ajouter une activité
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <input
                        value={day.comment}
                        onChange={(e) => updateDay(i, { comment: e.target.value })}
                        className="w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="Commentaire"
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{day.comment || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <>
            <Button className="w-auto" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="border-white border-t-transparent" /> : null}
              Enregistrer
            </Button>
            <Button
              className="w-auto bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={submitting || saving}
            >
              {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
              Soumettre pour validation
            </Button>
          </>
        )}
        {canValidate && cra.status === 'SUBMITTED' && (
          <>
            <Button className="w-auto bg-green-600 hover:bg-green-700" onClick={handleValidate}>
              Valider
            </Button>
            <InlineButton
              className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={handleReject}
            >
              Rejeter
            </InlineButton>
          </>
        )}
      </div>
    </div>
  )
}
