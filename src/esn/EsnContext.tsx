import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/auth'
import { getCurrentEsnId, setCurrentEsnId } from '../api/client'
import type { AddEsnPayload, EsnLiteDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface EsnState {
  esns: EsnLiteDto[]
  selectedEsnId: number | null
  selectedEsn: EsnLiteDto | null
  loading: boolean
  refreshEsns: () => Promise<void>
  selectEsn: (id: number) => void
  addEsn: (payload: AddEsnPayload) => Promise<EsnLiteDto>
  canAddEsn: boolean
}

const EsnContext = createContext<EsnState | undefined>(undefined)

const STORAGE_KEY = 'soc360.selectedEsnId'

export function EsnProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [esns, setEsns] = useState<EsnLiteDto[]>([])
  const [selectedEsnId, setSelectedEsnIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? Number(raw) : null
  })
  const [loading, setLoading] = useState(false)

  const applySelection = useCallback((id: number | null) => {
    setSelectedEsnIdState(id)
    setCurrentEsnId(id)
    if (id != null) {
      localStorage.setItem(STORAGE_KEY, String(id))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const refreshEsns = useCallback(async () => {
    if (!user) {
      setEsns([])
      applySelection(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await authApi.myEsns()
      setEsns(list)
      const stored = getCurrentEsnId()
      const storedValid = stored != null && list.some((e) => e.id === stored)
      const defaultValid = user.esnId != null && list.some((e) => e.id === user.esnId)
      const next = storedValid
        ? stored
        : defaultValid
          ? user.esnId
          : (list[0]?.id ?? null)
      if (next !== getCurrentEsnId()) {
        applySelection(next)
      }
    } finally {
      setLoading(false)
    }
  }, [user, applySelection])

  useEffect(() => {
    void refreshEsns()
  }, [refreshEsns])

  const selectEsn = useCallback(
    (id: number) => {
      if (esns.some((e) => e.id === id)) {
        applySelection(id)
      }
    },
    [esns, applySelection],
  )

  const addEsn = useCallback(
    async (payload: AddEsnPayload) => {
      const created = await authApi.addEsn(payload)
      const list = await authApi.myEsns()
      setEsns(list)
      applySelection(created.id)
      return created
    },
    [applySelection],
  )

  const selectedEsn = esns.find((e) => e.id === selectedEsnId) ?? null

  const value = useMemo<EsnState>(
    () => ({
      esns,
      selectedEsnId,
      selectedEsn,
      loading,
      refreshEsns,
      selectEsn,
      addEsn,
      canAddEsn: user?.role === 'RESPONSIBLE_SOC',
    }),
    [esns, selectedEsnId, selectedEsn, loading, refreshEsns, selectEsn, addEsn, user?.role],
  )

  return <EsnContext.Provider value={value}>{children}</EsnContext.Provider>
}

export function useEsn(): EsnState {
  const ctx = useContext(EsnContext)
  if (!ctx) {
    throw new Error('useEsn doit être utilisé dans un EsnProvider')
  }
  return ctx
}
