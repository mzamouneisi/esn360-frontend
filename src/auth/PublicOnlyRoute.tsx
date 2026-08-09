import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { FullPageSpinner } from '../components/ui'

export function PublicOnlyRoute() {
  const { user, initializing } = useAuth()

  if (initializing) {
    return <FullPageSpinner />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
