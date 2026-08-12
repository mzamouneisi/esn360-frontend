import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { FullPageSpinner } from '../components/ui'

export function ProtectedRoute() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <FullPageSpinner />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
