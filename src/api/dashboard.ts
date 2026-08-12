import { api } from './client'
import type { DashboardOverview } from './types'

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/dashboard/overview'),
}
