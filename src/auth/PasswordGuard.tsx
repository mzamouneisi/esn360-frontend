import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { FullPageSpinner } from '../components/ui'

export function PasswordGuard({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <FullPageSpinner />
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
}
