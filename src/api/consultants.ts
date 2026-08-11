import { api } from './client'
import type { PageResponse } from './types'
import type { ConsultantDto, ConsultantRequest, ConsultantSummary, ManagerSummary } from './types'

export const consultantsApi = {
  findAll: (params: {
    esnId?: number
    search?: string
    page?: number
    size?: number
  }) => api.get<PageResponse<ConsultantDto>>('/consultants', params),
  summaries: (esnId: number) => api.get<ConsultantSummary[]>('/consultants/summaries', { esnId }),
  managers: (esnId: number) => api.get<ManagerSummary[]>('/consultants/managers', { esnId }),
  getById: (id: number) => api.get<ConsultantDto>(`/consultants/${id}`),
  create: (request: ConsultantRequest) => api.post<ConsultantDto>('/consultants', request),
  update: (id: number, request: ConsultantRequest) =>
    api.put<ConsultantDto>(`/consultants/${id}`, request),
  delete: (id: number) => api.delete<void>(`/consultants/${id}`),
  importCsv: (file: File, esnId: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('esnId', String(esnId))
    return api.upload<{ imported: number; errors: number; errorLines: string[] }>(
      '/batch/consultant/import',
      formData,
    )
  },
}
