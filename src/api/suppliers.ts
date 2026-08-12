import { api } from './client'
import type { SupplierDto, SupplierRequest } from './types'

export const suppliersApi = {
  findAll: (socId?: number) => api.get<SupplierDto[]>('/suppliers', { socId }),
  create: (request: SupplierRequest) => api.post<SupplierDto>('/suppliers', request),
  update: (id: number, request: SupplierRequest) =>
    api.put<SupplierDto>(`/suppliers/${id}`, request),
  delete: (id: number) => api.delete<void>(`/suppliers/${id}`),
}
