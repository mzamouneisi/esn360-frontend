import { api } from './client'
import type { CraDto, CraExchangeDto, SaveCraRequest } from './types'

export const crasApi = {
  getOrCreate: (consultantId: number, year: number, month: number, type = 'CRA') =>
    api.get<CraDto>(`/cras/consultant/${consultantId}/${year}/${month}`, { type }),
  getById: (id: number) => api.get<CraDto>(`/cras/${id}`),
  exchanges: (id: number) => api.get<CraExchangeDto[]>(`/cras/${id}/exchanges`),
  findByConsultant: (consultantId: number, year: number) =>
    api.get<CraDto[]>(`/cras/consultant/${consultantId}/${year}`),
  findByMonth: (year: number, month: number, socId?: number) =>
    api.get<CraDto[]>(`/cras/month/${year}/${month}`, { socId }),
  findBySocYear: (socId: number, year: number) =>
    api.get<CraDto[]>(`/cras/soc/${socId}/${year}`),
  save: (id: number, request: SaveCraRequest) =>
    api.put<CraDto>(`/cras/${id}/days`, request),
  submit: (id: number) => api.post<CraDto>(`/cras/${id}/submit`),
  convertToCra: (id: number) => api.post<CraDto>(`/cras/${id}/convert`),
  validate: (id: number) => api.post<CraDto>(`/cras/${id}/validate`),
  reject: (id: number, comment: string) =>
    api.post<CraDto>(`/cras/${id}/reject`, { comment }),
  delete: (id: number) => api.delete<void>(`/cras/${id}`),
  exportCsv: (params: { socId?: number; month: number; year: number }) =>
    api.download(`/cras/export/csv?month=${params.month}&year=${params.year}${params.socId ? `&socId=${params.socId}` : ''}`, `cra-${params.month}-${params.year}.csv`),
  exportPdf: (params: { socId?: number; month: number; year: number }) =>
    api.download(`/cras/export/pdf?month=${params.month}&year=${params.year}${params.socId ? `&socId=${params.socId}` : ''}`, `cra-${params.month}-${params.year}.pdf`),
  exportClientPdf: (id: number) =>
    api.download(`/cras/${id}/export/client`, `cra-client.pdf`),
}
