import { api } from './client'
import type { PageResponse, SupportExchangeDto, SupportTicketDto, TicketPriority, TicketStatus } from './types'

export const supportApi = {
  findAll: (params: { page?: number; size?: number; mine?: boolean }) =>
    api.get<PageResponse<SupportTicketDto>>('/support', params),
  getById: (id: number) => api.get<SupportTicketDto>(`/support/${id}`),
  exchanges: (id: number) => api.get<SupportExchangeDto[]>(`/support/${id}/exchanges`),
  create: (request: {
    title: string
    description: string
    priority: TicketPriority
    category?: string
  }) => api.post<SupportTicketDto>('/support', request),
  addExchange: (id: number, body: string) =>
    api.post<SupportTicketDto>(`/support/${id}/exchanges`, { body }),
  updateStatus: (id: number, status: TicketStatus, assignedToId?: number) =>
    api.put<SupportTicketDto>(`/support/${id}/status`, { status, assignedToId }),
}
