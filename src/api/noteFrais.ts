import { api } from './client'
import type { CreateNoteFraisRequest, NoteFraisDto } from './types'

export const noteFraisApi = {
  findByEsnYear: (esnId: number, year: number) =>
    api.get<NoteFraisDto[]>(`/note-frais/esn/${esnId}/${year}`),
  findByConsultantYear: (consultantId: number, year: number) =>
    api.get<NoteFraisDto[]>(`/note-frais/consultant/${consultantId}/${year}`),
  getById: (id: number) => api.get<NoteFraisDto>(`/note-frais/${id}`),
  create: (request: CreateNoteFraisRequest) =>
    api.post<NoteFraisDto>('/note-frais', request),
  update: (id: number, request: CreateNoteFraisRequest) =>
    api.put<NoteFraisDto>(`/note-frais/${id}`, request),
  submit: (id: number) => api.post<NoteFraisDto>(`/note-frais/${id}/submit`),
  validate: (id: number) => api.post<NoteFraisDto>(`/note-frais/${id}/validate`),
  reject: (id: number, comment: string) =>
    api.post<NoteFraisDto>(`/note-frais/${id}/reject`, { comment }),
  delete: (id: number) => api.delete<void>(`/note-frais/${id}`),
  totalsByMonth: (esnId: number, year: number) =>
    api.get<Record<string, number>>(`/note-frais/stats/by-month/${esnId}/${year}`),
  totalsByCategory: (esnId: number, year: number) =>
    api.get<Record<string, number>>(`/note-frais/stats/by-category/${esnId}/${year}`),
  totalsByConsultant: (esnId: number, year: number) =>
    api.get<Record<string, number>>(`/note-frais/stats/by-consultant/${esnId}/${year}`),
}
