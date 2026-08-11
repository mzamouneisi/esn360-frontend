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
import { getCurrentSocId, setCurrentSocId } from '../api/client'
import type { AddSocPayload, SocLiteDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface SocState {
  socs: SocLiteDto[]
  selectedSocId: number | null
  selectedSoc: SocLiteDto | null
  loading: boolean
  refreshSocs: () => Promise<void>
  selectSoc: (id: number) => void
  addSoc: (payload: AddSocPayload) => Promise<SocLiteDto>
  canAddSoc: boolean
}

const SocContext = createContext<SocState | undefined>(undefined)

const STORAGE_KEY = 'soc360.selectedSocId'

export function SocProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [socs, setSocs] = useState<SocLiteDto[]>([])
  const [selectedSocId, setSelectedSocIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? Number(raw) : null
  })
  const [loading, setLoading] = useState(false)

  const applySelection = useCallback((id: number | null) => {
    setSelectedSocIdState(id)
    setCurrentSocId(id)
    if (id != null) {
      localStorage.setItem(STORAGE_KEY, String(id))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const refreshSocs = useCallback(async () => {
    if (!user) {
      setSocs([])
      applySelection(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await authApi.mySocs()
      setSocs(list)
      const stored = getCurrentSocId()
      const storedValid = stored != null && list.some((e) => e.id === stored)
      const defaultValid = user.socId != null && list.some((e) => e.id === user.socId)
      const next = storedValid
        ? stored
        : defaultValid
          ? user.socId
          : (list[0]?.id ?? null)
      if (next !== getCurrentSocId()) {
        applySelection(next)
      }
    } finally {
      setLoading(false)
    }
  }, [user, applySelection])

  useEffect(() => {
    void refreshSocs()
  }, [refreshSocs])

  const selectSoc = useCallback(
    (id: number) => {
      if (socs.some((e) => e.id === id)) {
        applySelection(id)
      }
    },
    [socs, applySelection],
  )

  const addSoc = useCallback(
    async (payload: AddSocPayload) => {
      const created = await authApi.addSoc(payload)
      const list = await authApi.mySocs()
      setSocs(list)
      applySelection(created.id)
      return created
    },
    [applySelection],
  )

  const selectedSoc = socs.find((e) => e.id === selectedSocId) ?? null

  const value = useMemo<SocState>(
    () => ({
      socs,
      selectedSocId,
      selectedSoc,
      loading,
      refreshSocs,
      selectSoc,
      addSoc,
      canAddSoc: user?.role === 'RESPONSIBLE_SOC',
    }),
    [socs, selectedSocId, selectedSoc, loading, refreshSocs, selectSoc, addSoc, user?.role],
  )

  return <SocContext.Provider value={value}>{children}</SocContext.Provider>
}

export function useSoc(): SocState {
  const ctx = useContext(SocContext)
  if (!ctx) {
    throw new Error('useSoc doit être utilisé dans un SocProvider')
  }
  return ctx
}
