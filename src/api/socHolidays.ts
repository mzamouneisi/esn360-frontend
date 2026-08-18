import { api } from './client'
import type { SocHolidayDto } from './types'

export const socHolidaysApi = {
  list: (year: number) => api.get<SocHolidayDto[]>(`/soc-holidays/${year}`),
  create: (date: string, label: string) =>
    api.post<SocHolidayDto>('/soc-holidays', { date, label }),
  delete: (id: number) => api.delete<void>(`/soc-holidays/${id}`),
  duplicate: (year: number) => api.post<number>(`/soc-holidays/${year}/duplicate`),
}