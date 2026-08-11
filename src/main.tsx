import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { SocProvider } from './soc/SocContext'

const redirect = sessionStorage.getItem('soc360.redirect')
if (redirect) {
  sessionStorage.removeItem('soc360.redirect')
  window.history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SocProvider>
        <App />
      </SocProvider>
    </AuthProvider>
  </StrictMode>,
)
