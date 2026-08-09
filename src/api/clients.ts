import { api } from './client'
import type { ClientDto, ClientRequest } from './types'

export const clientsApi = {
  findAll: (esnId?: number) => api.get<ClientDto[]>('/clients', { esnId }),
  create: (request: ClientRequest) => api.post<ClientDto>('/clients', request),
  update: (id: number, request: ClientRequest) =>
    api.put<ClientDto>(`/clients/${id}`, request),
  delete: (id: number) => api.delete<void>(`/clients/${id}`),
}
