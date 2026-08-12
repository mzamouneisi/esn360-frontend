import { api } from './client'
import type { HrDocumentDto } from './types'

export interface DocumentUploadRequest {
  consultantId?: number | null
  socId?: number | null
  category: string
  expiresAt?: string | null
  description?: string | null
}

export const documentsApi = {
  findAll: (params?: { consultantId?: number; socId?: number }) =>
    api.get<HrDocumentDto[]>('/documents', params),
  upload: (file: File, request: DocumentUploadRequest) => {
    const formData = new FormData()
    formData.append('file', file)
    if (request.consultantId) formData.append('consultantId', String(request.consultantId))
    if (request.socId) formData.append('socId', String(request.socId))
    formData.append('category', request.category)
    if (request.expiresAt) formData.append('expiresAt', request.expiresAt)
    if (request.description) formData.append('description', request.description)
    return api.upload<HrDocumentDto>('/documents/upload', formData)
  },
  download: (id: number, name: string) => api.download(`/documents/${id}/download`, name),
  delete: (id: number) => api.delete<void>(`/documents/${id}`),
}
