import { api } from './client'
import type { NotificationDto, PageResponse } from './types'

export const notificationsApi = {
  myNotifications: (page = 0, size = 20) =>
    api.get<PageResponse<NotificationDto>>('/notifications', { page, size }),
  unreadCount: () => api.get<number>('/notifications/unread-count'),
  markRead: (id: number) => api.put<NotificationDto>(`/notifications/${id}/read`),
  markAllRead: () => api.put<void>('/notifications/read-all'),
  delete: (id: number) => api.delete<void>(`/notifications/${id}`),
  deleteAll: () => api.delete<void>('/notifications/all'),
}
