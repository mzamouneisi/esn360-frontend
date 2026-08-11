import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function NotConsultantRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role === 'CONSULTANT') {
    return <Navigate to="/" replace />
  }
  return children
}
