import { api } from './client'
import type { SocDetailDto, SocDto } from './types'

export interface SocDependency {
  type: string
  id: number
  label: string
}

export const socsApi = {
  findAll: () => api.get<SocDto[]>('/socs'),
  getById: (id: number) => api.get<SocDetailDto>(`/socs/${id}`),
  update: (id: number, request: Partial<SocDto>) =>
    api.put<SocDto>(`/socs/${id}`, request),
  remove: (id: number) => api.delete<void>(`/socs/${id}`),
  dependencies: (id: number) => api.get<SocDependency[]>(`/socs/${id}/dependencies`),
  removeDependency: (socId: number, type: string, id: number) =>
    api.delete<void>(`/socs/${socId}/dependencies/${type}/${id}`),
}
