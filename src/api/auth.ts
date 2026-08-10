import { api } from './client'
import type {
  AddEsnPayload,
  AuthResponse,
  ConnectionDto,
  EmailSentResponse,
  EsnLiteDto,
  ResetResponse,
  UserDto,
} from './types'

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
    api.post<EmailSentResponse>('/auth/register-esn', payload),
  verifyEmail: (token: string) =>
    api.post<AuthResponse>('/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    api.post<EmailSentResponse>('/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    api.post<ResetResponse>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<void>('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),
  me: () => api.get<UserDto>('/auth/me'),
  myEsns: () => api.get<EsnLiteDto[]>('/auth/me/esns'),
  addEsn: (payload: AddEsnPayload) =>
    api.post<EsnLiteDto>('/auth/me/esns', payload),
  connections: () => api.get<ConnectionDto[]>('/auth/connections'),
}
