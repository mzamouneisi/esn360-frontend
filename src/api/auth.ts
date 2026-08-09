import { api } from './client'
import type { AuthResponse, ConnectionDto, ResetResponse, UserDto } from './types'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterEsnPayload {
  esnName: string
  siret?: string
  adminFirstName: string
  adminLastName: string
  username: string
  email: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResponse>('/auth/login', payload),
  registerEsn: (payload: RegisterEsnPayload) =>
    api.post<AuthResponse>('/auth/register-esn', payload),
  forgotPassword: (email: string) =>
    api.post<ResetResponse>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<void>('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),
  me: () => api.get<UserDto>('/auth/me'),
  connections: () => api.get<ConnectionDto[]>('/auth/connections'),
}
