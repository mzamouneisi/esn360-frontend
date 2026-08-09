import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, setUnauthorizedHandler } from './client'
import { clearToken, getToken, setToken } from '../auth/token'

interface MockFetchResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
  blob?: () => Promise<Blob>
  headers?: { get: (name: string) => string | null }
}

function jsonResponse(body: unknown, status = 200): MockFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function downloadResponse(
  headers: { get: (name: string) => string | null },
  blob = new Blob(['contenu']),
): MockFetchResponse {
  return { ok: true, status: 200, json: async () => ({}), text: async () => '', blob: async () => blob, headers }
}

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearToken()
    setUnauthorizedHandler(null)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('api.get', () => {
    it('construit l’URL et envoie une requête GET', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [1, 2, 3] }))
      const result = await api.get<{ items: number[] }>('/items', { page: 0, size: 20, search: 'x' })

      expect(result).toEqual({ items: [1, 2, 3] })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/items?page=0&size=20&search=x')
      expect(init.method ?? 'GET').toBe('GET')
    })

    it('omet les paramètres vides ou nuls', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))
      await api.get('/items', { a: undefined, b: null, c: '', d: 'keep' })

      const [url] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/items?d=keep')
    })

    it('ajoute le token d’autorisation quand il existe', async () => {
      setToken('tok123')
      fetchMock.mockResolvedValue(jsonResponse({}))

      await api.get('/x')
      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers.Authorization).toBe('Bearer tok123')
    })

    it('n’ajoute pas d’en-tête d’autorisation sans token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await api.get('/x')
      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers.Authorization).toBeUndefined()
    })
  })

  describe('méthodes POST / PUT / DELETE', () => {
    it('envoie le corps JSON en POST', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
      await api.post('/x', { a: 1, b: 'deux' })

      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ a: 1, b: 'deux' })
    })

    it('envoie le corps JSON en PUT', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
      await api.put('/x/1', { name: 'n' })

      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('PUT')
      expect(JSON.parse(init.body)).toEqual({ name: 'n' })
    })

    it('gère une réponse 204 en DELETE', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null, 204))
      const result = await api.delete('/x/1')
      expect(result).toBeUndefined()
    })
  })

  describe('gestion des erreurs', () => {
    it('lève une ApiError avec message et détails', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Interdit', details: { field: 'x' } }, 403))

      const err = (await api.get('/x').catch((e) => e)) as ApiError
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(403)
      expect(err.message).toBe('Interdit')
      expect(err.details).toEqual({ field: 'x' })
    })

    it('utilise un message générique si la réponse n’est pas JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
        text: async () => '',
      })

      const err = (await api.get('/x').catch((e) => e)) as ApiError
      expect(err).toBeInstanceOf(ApiError)
      expect(err.message).toBe('Erreur 500')
    })

    it('sur 401, nettoie le token et notifie le gestionnaire', async () => {
      const handler = vi.fn()
      setUnauthorizedHandler(handler)
      setToken('tok')
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Non autorisé' }, 401))

      await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(getToken()).toBeNull()
    })

    it('lève une ApiError quand le serveur est injoignable', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network down'))

      const err = (await api.get('/x').catch((e) => e)) as ApiError
      expect(err).toBeInstanceOf(ApiError)
      expect(err.message).toBe('Impossible de joindre le serveur')
    })
  })

  describe('api.download', () => {
    it('télécharge le fichier avec le nom de la réponse', async () => {
      const createObjectURL = vi.fn(() => 'blob:fake')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      fetchMock.mockResolvedValue(
        downloadResponse({ get: () => 'attachment; filename="rapport-2025.csv"' }),
      )

      await api.download('/cras/export', 'fallback.csv')

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    })

    it('utilise le nom de repli si la réponse n’en fournit pas', async () => {
      const createObjectURL = vi.fn(() => 'blob:fake')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      fetchMock.mockResolvedValue(downloadResponse({ get: () => '' }))

      await api.download('/cras/export', 'cra.csv')

      expect(createObjectURL).toHaveBeenCalledTimes(1)
    })
  })
})
