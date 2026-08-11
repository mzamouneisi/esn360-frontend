import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { EsnProvider } from './esn/EsnContext'

const redirect = sessionStorage.getItem('soc360.redirect')
if (redirect) {
  sessionStorage.removeItem('soc360.redirect')
  window.history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EsnProvider>
        <App />
      </EsnProvider>
    </AuthProvider>
  </StrictMode>,
)
