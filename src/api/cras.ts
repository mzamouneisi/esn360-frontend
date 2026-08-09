import { api } from './client'
import type { CraDto, SaveCraRequest } from './types'

export const crasApi = {
  getOrCreate: (consultantId: number, year: number, month: number) =>
    api.get<CraDto>(`/cras/consultant/${consultantId}/${year}/${month}`),
  getById: (id: number) => api.get<CraDto>(`/cras/${id}`),
  findByConsultant: (consultantId: number, year: number) =>
    api.get<CraDto[]>(`/cras/consultant/${consultantId}/${year}`),
  findByMonth: (year: number, month: number, esnId?: number) =>
    api.get<CraDto[]>(`/cras/month/${year}/${month}`, { esnId }),
  save: (id: number, request: SaveCraRequest) =>
    api.put<CraDto>(`/cras/${id}/days`, request),
  submit: (id: number) => api.post<CraDto>(`/cras/${id}/submit`),
  validate: (id: number) => api.post<CraDto>(`/cras/${id}/validate`),
  reject: (id: number, comment: string) =>
    api.post<CraDto>(`/cras/${id}/reject`, { comment }),
  exportCsv: (params: { esnId?: number; month: number; year: number }) =>
    api.download(`/cras/export/csv?month=${params.month}&year=${params.year}${params.esnId ? `&esnId=${params.esnId}` : ''}`, `cra-${params.month}-${params.year}.csv`),
  exportPdf: (params: { esnId?: number; month: number; year: number }) =>
    api.download(`/cras/export/pdf?month=${params.month}&year=${params.year}${params.esnId ? `&esnId=${params.esnId}` : ''}`, `cra-${params.month}-${params.year}.pdf`),
}
