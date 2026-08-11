import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { esnsApi } from '../api/esns'
import { projectsApi } from '../api/projects'
import { crasApi } from '../api/cras'
import { ApiError } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { Card, InlineButton, Select, Spinner } from '../components/ui'
import { Badge, ErrorBlock, LoadingBlock, PageHeader } from '../components/data'
import {
  MONTHS_FR,
  SUBSCRIPTION_STATUS_LABELS,
  formatDate,
  formatMoney,
  statusBadge,
} from '../lib/format'
import type { EsnDto } from '../api/types'

export function Facturation() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<null | 'csv' | 'pdf'>(null)

  const { data: esns } = useAsync(() => (isAdmin ? esnsApi.findAll() : Promise.resolve([])), [isAdmin])
  const [selectedEsn, setSelectedEsn] = useState<number | null>(user?.esnId ?? null)

  const esnId = isAdmin ? selectedEsn : user?.esnId ?? null

  const { data: detail, loading: detailLoading, error: detailError } = useAsync(
    () => (esnId ? esnsApi.getById(esnId) : Promise.resolve(null)),
    [esnId],
  )

  const { data: projects } = useAsync(
    () => (esnId ? projectsApi.findAll({ esnId }) : Promise.resolve([])),
    [esnId],
  )

  const { data: monthCras } = useAsync(
    () => (esnId ? crasApi.findByMonth(year, month, esnId) : Promise.resolve([])),
    [esnId, year, month],
  )

  if (!user) return null

  const activeProjects = (projects ?? []).filter((p) => p.active)
  const monthlyRevenue = activeProjects.reduce((sum, p) => sum + (p.dailyRate ?? 0) * 21, 0)
  const validatedCras = (monthCras ?? []).filter((c) => c.status === 'VALIDATED')
  const validatedHours = validatedCras.reduce((sum, c) => sum + c.totalHours, 0)
  const subscription = detail?.subscriptions?.[0]
  const totalPaid = (detail?.payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  async function handleExport(kind: 'csv' | 'pdf') {
    if (!esnId) return
    setExporting(kind)
    try {
      if (kind === 'csv') {
        await crasApi.exportCsv({ esnId, month, year })
      } else {
        await crasApi.exportPdf({ esnId, month, year })
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
        title="Facturation"
        subtitle="Abonnement, paiements et chiffre d'affaires"
        actions={
          <div className="flex items-center gap-2">
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
          </div>
        }
      />

      {isAdmin && (
        <Card className="mb-6 p-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Société :
            <Select
              className="w-64"
              value={selectedEsn ?? ''}
              onChange={(e) => setSelectedEsn(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sélectionner…</option>
              {(esns ?? []).map((esn: EsnDto) => (
                <option key={esn.id} value={esn.id}>
                  {esn.name}
                </option>
              ))}
            </Select>
          </label>
        </Card>
      )}

      {detailError && <ErrorBlock message={detailError} />}
      {detailLoading && <LoadingBlock />}

      {detail && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Abonnement</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{subscription?.plan ?? '—'}</p>
                {subscription && (
                  <Badge kind={statusBadge(subscription.status)}>
                    {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
                  </Badge>
                )}
              </div>
              {subscription && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatMoney(subscription.monthlyPrice)} / mois · début{' '}
                  {formatDate(subscription.startDate)}
                  {subscription.trialEndDate && ` · essai jusqu'au ${formatDate(subscription.trialEndDate)}`}
                </p>
              )}
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">CA mensuel (missions actives)</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(monthlyRevenue)}</p>
              <p className="mt-1 text-xs text-gray-500">{activeProjects.length} mission(s) active(s)</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">
                CRA validés · {MONTHS_FR[month - 1].slice(0, 3)} {year}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{validatedCras.length}</p>
              <p className="mt-1 text-xs text-gray-500">{validatedHours} h validées</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Total réglé</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totalPaid)}</p>
              <p className="mt-1 text-xs text-gray-500">{(detail.payments ?? []).length} paiement(s)</p>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Missions facturables</h3>
                <div className="flex gap-2">
                  <InlineButton onClick={() => handleExport('csv')} disabled={exporting !== null}>
                    {exporting === 'csv' ? <Spinner /> : 'CRA CSV'}
                  </InlineButton>
                  <InlineButton onClick={() => handleExport('pdf')} disabled={exporting !== null}>
                    {exporting === 'pdf' ? <Spinner /> : 'CRA PDF'}
                  </InlineButton>
                </div>
              </div>
              <div className="mt-4 divide-y divide-gray-100">
                {activeProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.client?.name ?? 'Client inconnu'} · {formatDate(p.startDate)} → {formatDate(p.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatMoney((p.dailyRate ?? 0) * 21, p.currency ?? 'EUR')}
                        <span className="text-xs font-normal text-gray-500"> /mois</span>
                      </p>
                      <p className="text-xs text-gray-500">TJM {formatMoney(p.dailyRate, p.currency ?? 'EUR')}</p>
                    </div>
                  </div>
                ))}
                {activeProjects.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">Aucune mission active</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold text-gray-900">Paiements</h3>
              <div className="mt-4 divide-y divide-gray-100">
                {(detail.payments ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.paymentDate)} · {p.method}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{p.reference ?? '—'}</span>
                  </div>
                ))}
                {(detail.payments ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">Aucun paiement enregistré</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {!detailLoading && !detail && !detailError && (
        <Card className="flex flex-col items-center justify-center py-14">
          <p className="text-sm font-medium text-gray-900">Sélectionnez une société</p>
          <p className="mt-1 text-sm text-gray-500">Aucune donnée de facturation.</p>
        </Card>
      )}
    </div>
  )
}
