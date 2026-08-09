import { api } from './client'
import type { EsnDetailDto, EsnDto } from './types'

export const esnsApi = {
  findAll: () => api.get<EsnDto[]>('/esns'),
  getById: (id: number) => api.get<EsnDetailDto>(`/esns/${id}`),
  update: (id: number, request: Partial<EsnDto>) =>
    api.put<EsnDto>(`/esns/${id}`, request),
}
