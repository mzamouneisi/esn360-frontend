import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsync } from './useAsync'
import { ApiError } from '../api/client'

describe('useAsync', () => {
  it('charge les données puis les expose', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3])

    const { result } = renderHook(() => useAsync(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([1, 2, 3])
    expect(result.current.error).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('expose le message d’erreur en cas d’échec', async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(500, 'Erreur serveur'))

    const { result } = renderHook(() => useAsync(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Erreur serveur')
    expect(result.current.data).toBeNull()
  })

  it('transforme une erreur non ApiError en message générique', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useAsync(fetcher, []))

    await waitFor(() => expect(result.current.error).toBe('Erreur inattendue'))
  })

  it('relance le chargement via reload', async () => {
    const fetcher = vi.fn().mockResolvedValue('a')

    const { result } = renderHook(() => useAsync(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.reload()
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('relance le chargement quand les dépendances changent', async () => {
    const fetcher = vi.fn().mockResolvedValue('x')
    const { rerender } = renderHook(({ id }) => useAsync(fetcher, [id]), {
      initialProps: { id: 1 },
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    rerender({ id: 2 })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('met à jour les données avec setData', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = renderHook(() => useAsync<string[]>(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setData(['a', 'b'])
    })
    expect(result.current.data).toEqual(['a', 'b'])

    act(() => {
      result.current.setData((prev) => [...(prev ?? []), 'c'])
    })
    expect(result.current.data).toEqual(['a', 'b', 'c'])
  })

  it('ne charge pas quand disabled est activé', async () => {
    const fetcher = vi.fn()
    const { result } = renderHook(() => useAsync(fetcher, [], { enabled: false }))

    expect(result.current.loading).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
