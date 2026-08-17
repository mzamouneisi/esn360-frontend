import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { SocProvider } from './soc/SocContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SocProvider>
        <App />
      </SocProvider>
    </AuthProvider>
  </StrictMode>,
)
