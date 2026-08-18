import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { crasApi } from '../api/cras'
import { activitiesApi } from '../api/activities'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, Field, InlineButton, Input, RefreshButton, Select, Spinner } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, Modal } from '../components/data'
import {
  CRA_STATUS_LABELS,
  DAY_TYPE_LABELS,
  MONTHS_FR,
  formatDateTime,
  statusBadge,
} from '../lib/format'
import type { CraDto, DayType, ActivityDto, CraExchangeDto } from '../api/types'
import type { ReactNode } from 'react'

interface EditableActivity {
  activityId: string
  days: string
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
const DAY_VALUES = ['0.5', '1']
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function dayToEditable(day: CraDto['days'][number]): EditableDay {
  return {
    date: day.date,
    dayType: day.dayType,
    workedHours: day.workedHours != null ? String(day.workedHours) : '',
    comment: day.comment ?? '',
    activities: day.activities.map((a) => ({
      activityId: String(a.activityId),
      days: a.days != null ? String(a.days) : '1',
      comment: a.comment ?? '',
    })),
  }
}

function dayTotal(day: EditableDay): number {
  return day.activities.reduce((sum, a) => sum + (Number(a.days) || 0), 0)
}

function dayIsValid(day: EditableDay): boolean {
  return day.dayType !== 'WORKED' || Math.abs(dayTotal(day) - 1) < 1e-9
}

function formatDays(value: number): string {
  return Number.isInteger(value) ? `${value} j` : `${value.toLocaleString('fr-FR')} j`
}

function dayBackground(dayType: DayType | undefined): string {
  switch (dayType) {
    case 'LEAVE':
      return 'bg-yellow-100'
    case 'PUBLIC_HOLIDAY':
      return 'bg-orange-100'
    case 'WORKED':
    case undefined:
      return 'bg-white'
    default:
      return 'bg-gray-50'
  }
}

function ActivityChip({
  color,
  name,
  days,
  onClick,
}: {
  color?: string | null
  name: string
  days: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-md bg-gray-100 px-1.5 py-1 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-200"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color ?? '#9ca3af' }}
      />
      <span className="truncate">{name}</span>
      <span className="ml-auto shrink-0 text-gray-400">×{days}</span>
    </button>
  )
}

export function CraDetail({
  id,
  onClose,
  onChange,
}: {
  id: number
  onClose?: () => void
  onChange?: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: cra, loading, error, setData, reload } = useAsync(
    () => crasApi.getById(id),
    [id],
  )

  const { data: activities } = useAsync(
    () => activitiesApi.findAll(user?.socId ? { socId: user.socId } : undefined),
    [user?.socId],
  )

  const [tab, setTab] = useState<'calendar' | 'ligne'>('calendar')
  const [days, setDays] = useState<EditableDay[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [eventModal, setEventModal] = useState<number | null>(null)
  const [fillMonthOpen, setFillMonthOpen] = useState(false)
  const [fillRangeOpen, setFillRangeOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [exchanges, setExchanges] = useState<CraExchangeDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (cra) setDays(cra.days.map(dayToEditable))
  }, [cra])

  const activityMap = useMemo(
    () => new Map((activities ?? []).map((a) => [String(a.id), a])),
    [activities],
  )

  const filteredActivities = useMemo(() => {
    const acts = activities ?? []
    if (cra?.type === 'CONGE') {
      return acts.filter((a) => a.type?.code?.startsWith('CONGE'))
    }
    return acts
  }, [activities, cra?.type])

  const currentActivity = useMemo(() => {
    const acts = filteredActivities
    const today = new Date().toISOString().slice(0, 10)
    return (
      acts.find(
        (a) =>
          a.active &&
          (!a.startDate || a.startDate <= today) &&
          (!a.endDate || a.endDate >= today),
      ) ??
      acts.find((a) => a.active) ??
      acts[0]
    )
  }, [filteredActivities])

  const monthActivities = useMemo(() => {
    if (!cra) return []
    const mm = String(cra.month).padStart(2, '0')
    const first = `${cra.year}-${mm}-01`
    const last = `${cra.year}-${mm}-${String(new Date(cra.year, cra.month, 0).getDate()).padStart(2, '0')}`
    const acts = filteredActivities
    const overlapsMonth = (a: ActivityDto) =>
      a.active &&
      (!a.startDate || a.startDate <= last) &&
      (!a.endDate || a.endDate >= first)
    const consultantMonth = acts.filter(
      (a) => a.consultant?.id === cra.consultantId && overlapsMonth(a),
    )
    if (consultantMonth.length > 0) return consultantMonth
    return acts.filter(overlapsMonth)
  }, [filteredActivities, cra])

  const incompleteDays = useMemo(() => {
    if (cra?.type === 'CONGE') return []
    return days.filter((d) => !dayIsValid(d))
  }, [days, cra])
  const craValid = incompleteDays.length === 0

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
          ? {
              ...d,
              activities: [
                ...d.activities,
                {
                  activityId: currentActivity ? String(currentActivity.id) : '',
                  days: '1',
                  comment: '',
                },
              ],
            }
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

  function removeAllEvents() {
    setDays((prev) => prev.map((d) => ({ ...d, activities: [] })))
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
              hours: 0,
              days: Number(a.days) || 0,
              comment: a.comment || null,
            }))
          const dayDays = dayActivities.reduce((sum, a) => sum + (a.days ?? 0), 0)
          return {
            date: d.date,
            dayType: d.dayType,
            workedHours: d.dayType === 'WORKED' ? Number(d.workedHours) || 0 : 0,
            hours: dayActivities.length > 0 ? dayDays : null,
            comment: d.comment || null,
            activities: dayActivities,
          }
        }),
      }
      const updated = await crasApi.save(cra.id, request)
      setData(updated)
      onChange?.()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!cra) return
    if (!craValid) {
      setFormError('Le CRA est incomplet : chaque jour travaillé doit totaliser 1 jour.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await handleSave()
      const updated = await crasApi.submit(cra.id)
      setData(updated)
      onChange?.()
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
      onChange?.()
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
      onChange?.()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  async function handleConvertToCra() {
    if (!cra) return
    if (!window.confirm('Convertir ce congé en CRA ?')) return
    try {
      const updated = await crasApi.convertToCra(cra.id)
      setData(updated)
      onChange?.()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    }
  }

  function handleDeleteAll() {
    if (!window.confirm('Supprimer tous les événements ajoutés ?')) return
    removeAllEvents()
  }

  async function openHistory() {
    if (!cra) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      setExchanges(await crasApi.exchanges(cra.id))
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Erreur inattendue')
      setExchanges([])
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleFillAllDays(activityId: string) {
    if (!activityId) {
      setFormError('Aucune activité correspondant à ce mois pour remplir le CRA.')
      return
    }
    const emptyWorkedDays = days.filter(
      (d) => d.dayType === 'WORKED' && d.activities.length === 0,
    )
    if (emptyWorkedDays.length === 0) {
      setFormError('Tous les jours travaillés du mois sont déjà renseignés.')
    } else {
      setDays((prev) =>
        prev.map((d) => {
          if (d.dayType !== 'WORKED' || d.activities.length > 0) return d
          return {
            ...d,
            activities: [{ activityId, days: '1', comment: '' }],
          }
        }),
      )
      setFormError(null)
    }
    setFillMonthOpen(false)
  }

  function handleFillRange(start: string, end: string, activityId: string) {
    if (!activityId) {
      setFormError('Choisissez une activité.')
      return
    }
    if (!start || !end) {
      setFormError('Indiquez les dates de début et de fin.')
      return
    }
    const fillable = days.filter(
      (d) => d.date >= start && d.date <= end && d.dayType === 'WORKED' && d.activities.length === 0,
    )
    if (fillable.length === 0) {
      setFormError('Aucune cellule à remplir dans cette plage (déjà remplie, week-end ou jour férié).')
      setFillRangeOpen(false)
      return
    }
    setDays((prev) =>
      prev.map((d) => {
        if (d.date < start || d.date > end) return d
        if (d.dayType !== 'WORKED' || d.activities.length > 0) return d
        return {
          ...d,
          activities: [{ activityId, days: '1', comment: '' }],
        }
      }),
    )
    setFormError(null)
    setFillRangeOpen(false)
  }

  const firstDay = new Date(cra.year, cra.month - 1, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(cra.year, cra.month, 0).getDate()
  const cells: ReactNode[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => (onClose ? onClose() : navigate('/cras'))}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {onClose ? '← Fermer' : '← Retour aux CRA'}
          </button>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            CRA de {cra.consultantName ?? '—'}
          </h2>
          <p className="text-sm text-gray-500">
            {MONTHS_FR[cra.month - 1]} {cra.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={reload} label="" />
          <Badge kind={statusBadge(cra.status)}>
            {CRA_STATUS_LABELS[cra.status] ?? cra.status}
          </Badge>
          <span className="text-sm text-gray-500">{cra.totalWorkedDays} j</span>
          {cra.type === 'CONGE' && editable && (
            <InlineButton onClick={handleConvertToCra}>
              Convertir en CRA
            </InlineButton>
          )}
          <InlineButton onClick={openHistory}>Historique</InlineButton>
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

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
          <button
            onClick={() => setTab('calendar')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Calendrier
          </button>
          <button
            onClick={() => setTab('ligne')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === 'ligne'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ligne
          </button>
        </div>
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            <Button className="w-auto" onClick={() => setFillMonthOpen(true)}>
              Remplir tout le mois
            </Button>
            <InlineButton onClick={() => setFillRangeOpen(true)}>
              Remplir une plage
            </InlineButton>
            <InlineButton
              className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={handleDeleteAll}
            >
              Supprimer tous les événements
            </InlineButton>
          </div>
        )}
      </div>

      {!craValid && editable && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>CRA incomplet :</strong> {incompleteDays.length} jour
          {incompleteDays.length > 1 ? 's' : ''} travaillé
          {incompleteDays.length > 1 ? 's' : ''} ne totalise
          {incompleteDays.length > 1 ? 'nt' : ''} pas 1 jour. Le CRA ne peut être envoyé que lorsque
          chaque jour travaillé totalise exactement 1 jour.
        </div>
      )}

      {tab === 'calendar' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {label}
              </div>
            ))}
            {cells.map((dayNum, i) => {
              if (dayNum == null) {
                return <div key={`empty-${i}`} className="bg-white" />
              }
              const date = `${cra.year}-${String(cra.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const dayIndex = days.findIndex((d) => d.date === date)
              const day = dayIndex >= 0 ? days[dayIndex] : null
              return (
                <div
                  key={date}
                  className={`min-h-28 p-1.5 ${dayBackground(day?.dayType)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">{dayNum}</span>
                    {day?.dayType === 'WORKED' && editable && (
                      <button
                        onClick={() => setEventModal(dayIndex)}
                        className="rounded p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                        aria-label="Ajouter un événement"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {day?.activities.map((act, j) => {
                      const info = activityMap.get(act.activityId)
                      return (
                        <ActivityChip
                          key={j}
                          color={info?.type?.color}
                          name={info?.name ?? 'Activité inconnue'}
                          days={Number(act.days) || 0}
                          onClick={
                            editable && dayIndex >= 0 ? () => setEventModal(dayIndex) : undefined
                          }
                        />
                      )
                    })}
                    {day && day.dayType !== 'WORKED' && (
                      <span className="block px-1 text-[11px] font-medium text-gray-400">
                        {DAY_TYPE_LABELS[day.dayType]} · {formatDays(dayTotal(day))}
                      </span>
                    )}
                    {day?.dayType === 'WORKED' && day.activities.length > 0 && (
                      <span
                        className={`block px-1 text-[11px] font-semibold ${
                          dayIsValid(day) ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {formatDays(dayTotal(day))}
                        {!dayIsValid(day) ? ' — à compléter' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Cliquez sur un jour travaillé ou le symbole + pour ajouter / modifier des événements.
          </div>
        </Card>
      ) : (
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
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Evénements
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Commentaire
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {days.map((day, i) => {
                  const total = dayTotal(day)
                  return (
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
                        <span
                          className={`text-sm font-semibold ${
                            dayIsValid(day) ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {formatDays(total)}
                        </span>
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
                                    onChange={(e) =>
                                      updateActivity(i, j, { activityId: e.target.value })
                                    }
                                  >
                                    <option value="">Activité…</option>
                                    {filteredActivities.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.name}
                                      </option>
                                    ))}
                                  </Select>
                                  <Select
                                    className="w-24"
                                    value={act.days}
                                    onChange={(e) => updateActivity(i, j, { days: e.target.value })}
                                  >
                                    {DAY_VALUES.map((dv) => (
                                      <option key={dv} value={dv}>
                                        {formatDays(Number(dv))}
                                      </option>
                                    ))}
                                  </Select>
                                  <button
                                    onClick={() => removeActivity(i, j)}
                                    className="text-red-500 hover:text-red-700"
                                    aria-label="Supprimer l'événement"
                                  >
                                    ×
                                  </button>
                                </>
                              ) : (
                                <span className="text-sm">
                                  {activityMap.get(act.activityId)?.name ?? 'Activité inconnue'} ·{' '}
                                  {formatDays(Number(act.days) || 0)}
                                </span>
                              )}
                            </div>
                          ))}
                          {editable && (
                            <button
                              onClick={() => addActivity(i)}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              + Ajouter un événement
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
              disabled={submitting || saving || !craValid}
            >
              {submitting ? <Spinner className="border-white border-t-transparent" /> : null}
              Envoyer pour validation
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

      {fillMonthOpen && (
        <FillMonthModal
          activities={monthActivities}
          onSelect={handleFillAllDays}
          onClose={() => setFillMonthOpen(false)}
        />
      )}

      {fillRangeOpen && (
        <FillRangeModal
          activities={monthActivities}
          monthStart={`${cra.year}-${String(cra.month).padStart(2, '0')}-01`}
          monthEnd={`${cra.year}-${String(cra.month).padStart(2, '0')}-${String(
            new Date(cra.year, cra.month, 0).getDate(),
          ).padStart(2, '0')}`}
          onFill={handleFillRange}
          onClose={() => setFillRangeOpen(false)}
        />
      )}

      {historyOpen && (
        <HistoryModal
          exchanges={exchanges}
          loading={historyLoading}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {eventModal !== null && eventModal >= 0 && eventModal < days.length && (
        <EventModal
          day={days[eventModal]}
          editable={editable}
          activities={filteredActivities}
          onUpdate={(patch) => updateDay(eventModal, patch)}
          onUpdateActivity={(actIndex, patch) => updateActivity(eventModal, actIndex, patch)}
          onAddActivity={() => addActivity(eventModal)}
          onRemoveActivity={(actIndex) => removeActivity(eventModal, actIndex)}
          onClose={() => setEventModal(null)}
        />
      )}
    </div>
  )
}

function HistoryModal({
  exchanges,
  loading,
  onClose,
}: {
  exchanges: CraExchangeDto[]
  loading: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open
      title="Historique des échanges"
      onClose={onClose}
      footer={<InlineButton onClick={onClose}>Fermer</InlineButton>}
    >
      {loading && <p className="px-4 py-6 text-center text-sm text-gray-400">Chargement…</p>}
      {!loading && exchanges.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-400">
          Aucun échange pour ce CRA.
        </p>
      )}
      {!loading && exchanges.length > 0 && (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {exchanges.map((e) => (
            <div key={e.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{e.sender}</span>
                <span>→</span>
                <span className="font-semibold text-gray-600">{e.receiver}</span>
                <span className="ml-auto">{formatDateTime(e.dateTime)}</span>
              </div>
              {e.comment && <p className="mt-1 text-gray-700">{e.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function FillMonthModal({
  activities,
  onSelect,
  onClose,
}: {
  activities: ActivityDto[]
  onSelect: (activityId: string) => void
  onClose: () => void
}) {
  return (
    <Modal
      open
      title="Remplir tout le mois"
      onClose={onClose}
      footer={<InlineButton onClick={onClose}>Annuler</InlineButton>}
    >
      <p className="mb-3 text-sm text-gray-500">
        Choisissez l'activité à appliquer à tous les jours travaillés du mois :
      </p>
      {activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
          Aucune activité correspondant à ce mois.
        </p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(String(a.id))}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition hover:bg-gray-50"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: a.type?.color ?? '#9ca3af' }}
              />
              <span className="font-medium text-gray-800">{a.name}</span>
              <span className="ml-auto text-xs text-gray-400">
                {a.startDate ?? '…'} → {a.endDate ?? '…'}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

function FillRangeModal({
  activities,
  monthStart,
  monthEnd,
  onFill,
  onClose,
}: {
  activities: ActivityDto[]
  monthStart: string
  monthEnd: string
  onFill: (start: string, end: string, activityId: string) => void
  onClose: () => void
}) {
  const [start, setStart] = useState(monthStart)
  const [end, setEnd] = useState(monthEnd)
  const [activityId, setActivityId] = useState('')

  return (
    <Modal
      open
      title="Remplir une plage"
      onClose={onClose}
      footer={
        <>
          <InlineButton onClick={onClose}>Annuler</InlineButton>
          <Button className="w-auto" onClick={() => onFill(start, end, activityId)}>
            Remplir
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de début">
            <Input
              type="date"
              min={monthStart}
              max={monthEnd}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Date de fin">
            <Input
              type="date"
              min={monthStart}
              max={monthEnd}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm text-gray-500">Activité :</p>
          {activities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
              Aucune activité correspondant à ce mois.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActivityId(String(a.id))}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    activityId === String(a.id)
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: a.type?.color ?? '#9ca3af' }}
                  />
                  <span className="font-medium text-gray-800">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function EventModal({
  day,
  editable,
  activities,
  onUpdate,
  onUpdateActivity,
  onAddActivity,
  onRemoveActivity,
  onClose,
}: {
  day: EditableDay
  editable: boolean
  activities: ActivityDto[]
  onUpdate: (patch: Partial<EditableDay>) => void
  onUpdateActivity: (actIndex: number, patch: Partial<EditableActivity>) => void
  onAddActivity: () => void
  onRemoveActivity: (actIndex: number) => void
  onClose: () => void
}) {
  const total = dayTotal(day)
  return (
    <Modal
      open
      title={`Événements du ${new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <InlineButton onClick={onClose}>Fermer</InlineButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {editable ? (
            <Select
              className="w-40"
              value={day.dayType}
              onChange={(e) => onUpdate({ dayType: e.target.value as DayType })}
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
          <span className={`text-sm font-semibold ${dayIsValid(day) ? 'text-green-600' : 'text-red-500'}`}>
            {formatDays(total)}
            {day.dayType === 'WORKED' && !dayIsValid(day) ? ' — doit totaliser 1 jour' : ''}
          </span>
        </div>

        <div className="space-y-2">
          {day.activities.map((act, j) => {
            const info = activities.find((a) => String(a.id) === act.activityId)
            return (
              <div
                key={j}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: info?.type?.color ?? '#9ca3af' }}
                />
                {editable ? (
                  <>
                    <Select
                      className="w-56"
                      value={act.activityId}
                      onChange={(e) => onUpdateActivity(j, { activityId: e.target.value })}
                    >
                      <option value="">Activité…</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      className="w-28"
                      value={act.days}
                      onChange={(e) => onUpdateActivity(j, { days: e.target.value })}
                    >
                      {DAY_VALUES.map((dv) => (
                        <option key={dv} value={dv}>
                          {formatDays(Number(dv))}
                        </option>
                      ))}
                    </Select>
                    <input
                      value={act.comment}
                      onChange={(e) => onUpdateActivity(j, { comment: e.target.value })}
                      className="flex-1 min-w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      placeholder="Commentaire"
                    />
                    <button
                      onClick={() => onRemoveActivity(j)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Supprimer l'événement"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="text-sm">
                    {info?.name ?? 'Activité inconnue'} · {formatDays(Number(act.days) || 0)}
                    {act.comment ? ` — ${act.comment}` : ''}
                  </span>
                )}
              </div>
            )
          })}
          {day.activities.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
              Aucun événement pour ce jour.
            </p>
          )}
        </div>

        {editable && (
          <button
            onClick={onAddActivity}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Ajouter un événement
          </button>
        )}
      </div>
    </Modal>
  )
}

export function CraDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <CraDetail id={Number(id)} />
}