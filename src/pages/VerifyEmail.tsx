import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { setToken } from '../auth/token'
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui'

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setStatus('error')
      setError('Lien de validation invalide ou incomplet.')
      return
    }

    authApi
      .verifyEmail(token)
      .then((response) => {
        setToken(response.token)
        setUser(response.user)
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 1500)
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
      })
  }, [token, navigate, setUser])

  async function handleResend(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setResendMessage(null)
    setResending(true)
    try {
      const response = await authApi.resendVerification(resendEmail)
      setResendMessage(response.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
            E
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Validation de l'inscription</h1>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-4 text-sm text-gray-500">
            <Spinner />
            Validation de votre adresse email…
          </div>
        )}

        {status === 'success' && (
          <Alert variant="success">
            Votre adresse email a été validée. Votre compte est activé, redirection…
          </Alert>
        )}

        {status === 'error' && (
          <>
            {error && (
              <div className="mb-4">
                <Alert>{error}</Alert>
              </div>
            )}

            {resendMessage && (
              <div className="mb-4">
                <Alert variant="success">{resendMessage}</Alert>
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-4">
              <Field label="Adresse e-mail utilisée à l'inscription">
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  placeholder="marie.durand@exemple.fr"
                />
              </Field>
              <Button type="submit" disabled={resending}>
                {resending ? <Spinner className="border-white border-t-transparent" /> : null}
                Renvoyer l'email de validation
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link
                to="/login"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Aller à la connexion
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
