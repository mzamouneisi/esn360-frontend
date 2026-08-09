import { useEffect, useState } from 'react'
import { usersApi } from '../api/users'
import { useAsync } from '../lib/useAsync'
import { Input } from '../components/ui'
import {
  Badge,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Pagination,
  Table,
} from '../components/data'
import { ROLE_LABELS, formatDateTime } from '../lib/format'

export function Users() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0)
  const size = 20

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search)
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const { data, loading, error } = useAsync(
    () => usersApi.findAll({ page, size, search: debounced || undefined }),
    [page, size, debounced],
  )

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Comptes de la plateforme (administration)" />

      <div className="mb-4">
        <Input
          className="max-w-sm"
          placeholder="Rechercher un utilisateur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBlock message={error} />}
      {loading && <LoadingBlock />}

      {!loading && data && data.items.length > 0 && (
        <>
          <Table
            rowKey={(u) => u.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Utilisateur',
                render: (u) => (
                  <div>
                    <p className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                ),
              },
              {
                key: 'email',
                label: 'E-mail',
                render: (u) => <span>{u.email}</span>,
              },
              {
                key: 'role',
                label: 'Rôle',
                render: (u) => <Badge kind="info">{ROLE_LABELS[u.role] ?? u.role}</Badge>,
              },
              {
                key: 'esn',
                label: 'Société',
                render: (u) => <span className="text-gray-500">{u.esnName ?? '—'}</span>,
              },
              {
                key: 'active',
                label: 'Statut',
                render: (u) => (
                  <Badge kind={u.active ? 'success' : 'error'}>{u.active ? 'Actif' : 'Inactif'}</Badge>
                ),
              },
              {
                key: 'lastLogin',
                label: 'Dernière connexion',
                render: (u) => <span className="text-gray-500">{formatDateTime(u.lastLoginAt)}</span>,
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </>
      )}

      {!loading && data && data.items.length === 0 && (
        <EmptyState
          title="Aucun utilisateur"
          description="Aucun compte ne correspond à la recherche."
        />
      )}
    </div>
  )
}
