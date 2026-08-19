import { api } from './client'
import type { PageResponse, Role, UserDto } from './types'

export interface UpdateUserRequest {
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: Role
  socId: number | null
  active: boolean
}

export interface CreateUserRequest {
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: Role
  socId: number | null
  password: string
}

export const usersApi = {
  findAll: (params: { page?: number; size?: number; search?: string }) =>
    api.get<PageResponse<UserDto>>('/users', params),
  getById: (id: number) => api.get<UserDto>(`/users/${id}`),
  create: (request: CreateUserRequest) => api.post<UserDto>('/users', request),
  update: (id: number, request: UpdateUserRequest) =>
    api.put<UserDto>(`/users/${id}`, request),
  delete: (id: number) => api.delete<void>(`/users/${id}`),
}
