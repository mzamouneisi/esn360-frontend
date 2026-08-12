import { useState } from 'react'
import { socsApi } from '../api/socs'
import { useAsync } from '../lib/useAsync'
import { Card, Select } from '../components/ui'
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Table } from '../components/data'
import { SUBSCRIPTION_STATUS_LABELS, formatDate, formatMoney, statusBadge } from '../lib/format'

export function SocAdmin() {
  const { data: socs, loading, error } = useAsync(() => socsApi.findAll(), [])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: detail, loading: detailLoading } = useAsync(
    () => (selectedId ? socsApi.getById(selectedId) : Promise.resolve(null)),
    [selectedId],
  )

  return (
    <div>
      <PageHeader title="Sociétés" subtitle="Abonnements et paiements des sociétés" />

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && socs && socs.length === 0 && (
        <EmptyState title="Aucune société" description="Aucune société enregistrée sur la plateforme." />
      )}

      {!loading && socs && socs.length > 0 && (
        <>
          <Card className="mb-6 p-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Société :
              <Select
                className="w-80"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sélectionner…</option>
                {socs.map((soc) => (
                  <option key={soc.id} value={soc.id}>
                    {soc.name}
                  </option>
                ))}
              </Select>
            </label>
          </Card>

          {detailLoading && <LoadingBlock />}

          {!detailLoading && selectedId && !detail && (
            <Card className="p-6 text-sm text-gray-500">Aucune donnée pour cette société.</Card>
          )}

          {detail && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-5">
                  <p className="text-sm font-medium text-gray-500">Société</p>
                  <p className="mt-1 font-semibold text-gray-900">{detail.soc.name}</p>
                  <p className="text-xs text-gray-500">
                    {detail.soc.siret ? `SIRET ${detail.soc.siret}` : 'SIRET non renseigné'}
                  </p>
                  {detail.soc.website && (
                    <a
                      href={detail.soc.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {detail.soc.website}
                    </a>
                  )}
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-medium text-gray-500">Abonnements actifs</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {detail.subscriptions.filter(
                      (s) => s.status === 'ACTIVE' || s.status === 'TRIAL',
                    ).length}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-medium text-gray-500">Total réglé</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatMoney(detail.payments.reduce((sum, p) => sum + p.amount, 0))}
                  </p>
                </Card>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-gray-900">Abonnements</h3>
              {detail.subscriptions.length === 0 ? (
                <p className="mb-6 text-sm text-gray-400">Aucun abonnement.</p>
              ) : (
                <Table
                  rowKey={(s) => s.id}
                  rows={detail.subscriptions}
                  columns={[
                    {
                      key: 'plan',
                      label: 'Formule',
                      render: (s) => <span className="font-medium text-gray-900">{s.plan}</span>,
                    },
                    {
                      key: 'status',
                      label: 'Statut',
                      render: (s) => (
                        <Badge kind={statusBadge(s.status)}>
                          {SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'dates',
                      label: 'Période',
                      render: (s) => (
                        <span className="text-gray-500">
                          {formatDate(s.startDate)} → {formatDate(s.endDate)}
                          {s.trialEndDate && ` · essai fin ${formatDate(s.trialEndDate)}`}
                        </span>
                      ),
                    },
                    {
                      key: 'price',
                      label: 'Mensuel',
                      render: (s) => <span>{formatMoney(s.monthlyPrice)}</span>,
                    },
                  ]}
                />
              )}

              <h3 className="mb-3 mt-6 text-sm font-semibold text-gray-900">Paiements</h3>
              {detail.payments.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
              ) : (
                <Table
                  rowKey={(p) => p.id}
                  rows={detail.payments}
                  columns={[
                    {
                      key: 'date',
                      label: 'Date',
                      render: (p) => <span className="text-gray-500">{formatDate(p.paymentDate)}</span>,
                    },
                    {
                      key: 'amount',
                      label: 'Montant',
                      render: (p) => (
                        <span className="font-medium text-gray-900">{formatMoney(p.amount)}</span>
                      ),
                    },
                    {
                      key: 'method',
                      label: 'Moyen',
                      render: (p) => <span>{p.method}</span>,
                    },
                    {
                      key: 'reference',
                      label: 'Référence',
                      render: (p) => <span className="text-gray-500">{p.reference ?? '—'}</span>,
                    },
                  ]}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
