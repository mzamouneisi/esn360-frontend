import { api } from './client'
import type { PageResponse, UserDto } from './types'

export const usersApi = {
  findAll: (params: { page?: number; size?: number; search?: string }) =>
    api.get<PageResponse<UserDto>>('/users', params),
  getById: (id: number) => api.get<UserDto>(`/users/${id}`),
  delete: (id: number) => api.delete<void>(`/users/${id}`),
}
