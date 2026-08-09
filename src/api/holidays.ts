import { api } from './client'
import type { PublicHolidayDto } from './types'

export const holidaysApi = {
  findByCountryYear: (country: string, year: number) =>
    api.get<PublicHolidayDto[]>(`/holidays/${country}/${year}`),
  countries: () => api.get<string[]>('/holidays/countries'),
}
