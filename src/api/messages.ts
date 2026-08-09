import { api } from './client'
import type { MessageDto, PageResponse } from './types'

export const messagesApi = {
  inbox: (page = 0, size = 20) =>
    api.get<PageResponse<MessageDto>>('/messages/inbox', { page, size }),
  sent: (page = 0, size = 20) =>
    api.get<PageResponse<MessageDto>>('/messages/sent', { page, size }),
  unreadCount: () => api.get<number>('/messages/unread-count'),
  send: (recipientId: number, subject: string, body: string) =>
    api.post<MessageDto>('/messages', { recipientId, subject, body }),
  markRead: (id: number) => api.put<MessageDto>(`/messages/${id}/read`),
  delete: (id: number) => api.delete<void>(`/messages/${id}`),
}
