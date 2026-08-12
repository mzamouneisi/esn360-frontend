import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { crasApi } from '../api/cras'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Button, Card, InlineButton, Select, Spinner } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, PageHeader } from '../components/data'
import {
  CRA_STATUS_LABELS,
  MONTHS_FR,
  monthShort,
  statusBadge,
} from '../lib/format'
import type { CraDto } from '../api/types'

export function CraList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<null | 'csv' | 'pdf'>(null)

  const isConsultant = user?.role === 'CONSULTANT'
  const canValidate =
    user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE_SOC' || user?.role === 'MANAGER'

  const ownCras = useAsync(
    () =>
      user?.consultantId
        ? crasApi.findByConsultant(user.consultantId, year)
        : Promise.resolve([] as CraDto[]),
    [user?.consultantId, year],
  )

  const socCras = useAsync(
    () =>
      user?.socId
        ? crasApi.findByMonth(year, month, user.socId)
        : Promise.resolve([] as CraDto[]),
    [user?.socId, year, month],
  )

  const { data, loading, error, reload } = isConsultant ? ownCras : socCras

  if (!user) return null

  const list = (data ?? []).filter((c) => c.month === month || isConsultant)

  async function changeStatus(id: number, action: 'validate' | 'reject') {
    if (action === 'reject') {
      const comment = window.prompt('Motif du rejet :')
      if (comment === null) return
      try {
        await crasApi.reject(id, comment)
      } catch (err) {
        window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
        return
      }
    } else {
      try {
        await crasApi.validate(id)
      } catch (err) {
        window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
        return
      }
    }
    reload()
  }

  async function handleExport(kind: 'csv' | 'pdf') {
    const socId = user?.socId
    if (!socId) return
    setExporting(kind)
    try {
      if (kind === 'csv') {
        await crasApi.exportCsv({ socId, month, year })
      } else {
        await crasApi.exportPdf({ socId, month, year })
      }
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="CRA"
        subtitle="Comptes rendus d'activité par consultant et par mois"
        actions={
          !isConsultant && user.socId ? (
            <>
              <InlineButton onClick={() => handleExport('csv')} disabled={exporting !== null}>
                {exporting === 'csv' ? <Spinner /> : 'Exporter CSV'}
              </InlineButton>
              <InlineButton onClick={() => handleExport('pdf')} disabled={exporting !== null}>
                {exporting === 'pdf' ? <Spinner /> : 'Exporter PDF'}
              </InlineButton>
            </>
          ) : undefined
        }
      />

      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Période :
          <Select
            className="w-auto"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS_FR.map((label, i) => (
              <option key={i + 1} value={i + 1}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </label>
        {isConsultant && (
          <p className="ml-auto text-sm text-gray-500">
            Vos CRA pour l'année {year}. Sélectionnez un mois pour enregistrer votre activité.
          </p>
        )}
      </Card>

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && list.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-14">
          <p className="text-sm font-medium text-gray-900">Aucun CRA pour cette période</p>
          <p className="mt-1 text-sm text-gray-500">
            {isConsultant
              ? 'Ouvrez le mois pour créer votre CRA.'
              : 'Aucun CRA soumis ou saisi ce mois-ci.'}
          </p>
          {isConsultant && user.consultantId && (
            <Button
              className="mt-4 w-auto"
              onClick={async () => {
                try {
                  const cra = await crasApi.getOrCreate(user.consultantId!, year, month)
                  navigate(`/cras/${cra.id}`)
                } catch (err) {
                  window.alert(err instanceof ApiError ? err.message : 'Erreur inattendue')
                }
              }}
            >
              Créer mon CRA de {monthShort(month)} {year}
            </Button>
          )}
        </Card>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((cra) => (
            <Card key={cra.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{cra.consultantName ?? 'Consultant'}</p>
                  <p className="text-sm text-gray-500">
                    {MONTHS_FR[cra.month - 1]} {cra.year}
                  </p>
                </div>
                <Badge kind={statusBadge(cra.status)}>
                  {CRA_STATUS_LABELS[cra.status] ?? cra.status}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Jours</p>
                  <p className="font-medium text-gray-900">{cra.totalWorkedDays} j</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Heures</p>
                  <p className="font-medium text-gray-900">{cra.totalHours} h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Soumis</p>
                  <p className="font-medium text-gray-900">{cra.submittedAt ?? '—'}</p>
                </div>
              </div>

              {cra.comment && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Rejet : {cra.comment}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  className="w-auto"
                  onClick={() => navigate(`/cras/${cra.id}`)}
                >
                  Ouvrir
                </Button>
                {canValidate && cra.status === 'SUBMITTED' && (
                  <>
                    <InlineButton
                      className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => changeStatus(cra.id, 'validate')}
                    >
                      Valider
                    </InlineButton>
                    <InlineButton
                      className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                      onClick={() => changeStatus(cra.id, 'reject')}
                    >
                      Rejeter
                    </InlineButton>
                  </>
                )}
                {isConsultant && cra.status === 'REJECTED' && (
                  <Link
                    to={`/cras/${cra.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Corriger et renvoyer →
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
