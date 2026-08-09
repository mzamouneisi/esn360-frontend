import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { PublicOnlyRoute } from './auth/PublicOnlyRoute'
import { PasswordGuard } from './auth/PasswordGuard'
import { MainLayout } from './layout/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { ChangePassword } from './pages/ChangePassword'
import { Clients } from './pages/Clients'
import { Projects } from './pages/Projects'
import { Missions } from './pages/Missions'
import { Consultants } from './pages/Consultants'
import { Activities } from './pages/Activities'
import { CraList } from './pages/CraList'
import { CraDetail } from './pages/CraDetail'
import { NoteFraisList } from './pages/NoteFraisList'
import { Facturation } from './pages/Facturation'
import { FichePaie } from './pages/FichePaie'
import { Documents } from './pages/Documents'
import { Messages } from './pages/Messages'
import { Support } from './pages/Support'
import { Profile } from './pages/Profile'
import { Users } from './pages/Users'
import { EsnAdmin } from './pages/EsnAdmin'
import { Tables } from './pages/Tables'
import { Logs } from './pages/Logs'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/inscription', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password/:token', element: <ResetPassword /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <PasswordGuard>
            <MainLayout />
          </PasswordGuard>
        ),
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/clients', element: <Clients /> },
          { path: '/projets', element: <Projects /> },
          { path: '/missions', element: <Missions /> },
          { path: '/consultants', element: <Consultants /> },
          { path: '/activites', element: <Activities /> },
          { path: '/cras', element: <CraList /> },
          { path: '/cras/:id', element: <CraDetail /> },
          { path: '/notes-frais', element: <NoteFraisList /> },
          { path: '/facturation', element: <Facturation /> },
          { path: '/fiches-paie', element: <FichePaie /> },
          { path: '/documents', element: <Documents /> },
          { path: '/messages', element: <Messages /> },
          { path: '/support', element: <Support /> },
          { path: '/profil', element: <Profile /> },
          { path: '/change-password', element: <ChangePassword /> },
          { path: '/utilisateurs', element: <Users /> },
          { path: '/esn', element: <EsnAdmin /> },
          {
            path: '/tables',
            element: (
              <AdminRoute>
                <Tables />
              </AdminRoute>
            ),
          },
          {
            path: '/logs',
            element: (
              <AdminRoute>
                <Logs />
              </AdminRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
