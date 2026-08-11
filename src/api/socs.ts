import { api } from './client'
import type { SocDetailDto, SocDto } from './types'

export const socsApi = {
  findAll: () => api.get<SocDto[]>('/socs'),
  getById: (id: number) => api.get<SocDetailDto>(`/socs/${id}`),
  update: (id: number, request: Partial<SocDto>) =>
    api.put<SocDto>(`/socs/${id}`, request),
}
