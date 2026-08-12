import { api } from './client'
import type { PageResponse } from './types'
import type { ConsultantDto, ConsultantRequest, ConsultantSummary, ManagerSummary } from './types'

export const consultantsApi = {
  findAll: (params: {
    socId?: number
    search?: string
    page?: number
    size?: number
  }) => api.get<PageResponse<ConsultantDto>>('/consultants', params),
  summaries: (socId: number) => api.get<ConsultantSummary[]>('/consultants/summaries', { socId }),
  managers: (socId: number) => api.get<ManagerSummary[]>('/consultants/managers', { socId }),
  getById: (id: number) => api.get<ConsultantDto>(`/consultants/${id}`),
  create: (request: ConsultantRequest) => api.post<ConsultantDto>('/consultants', request),
  update: (id: number, request: ConsultantRequest) =>
    api.put<ConsultantDto>(`/consultants/${id}`, request),
  delete: (id: number) => api.delete<void>(`/consultants/${id}`),
  importCsv: (file: File, socId: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('socId', String(socId))
    return api.upload<{ imported: number; errors: number; errorLines: string[] }>(
      '/batch/consultant/import',
      formData,
    )
  },
}
