import { api } from './client'
import type {
  AddSocPayload,
  AuthResponse,
  ConnectionDto,
  EmailSentResponse,
  SocLiteDto,
  ResetResponse,
  UserDto,
} from './types'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterSocPayload {
  socName: string
  siret?: string
  adminFirstName: string
  adminLastName: string
  username: string
  email: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResponse>('/auth/login', payload),
  registerSoc: (payload: RegisterSocPayload) =>
    api.post<EmailSentResponse>('/auth/register-soc', payload),
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
  mySocs: () => api.get<SocLiteDto[]>('/auth/me/socs'),
  addSoc: (payload: AddSocPayload) =>
    api.post<SocLiteDto>('/auth/me/socs', payload),
  connections: () => api.get<ConnectionDto[]>('/auth/connections'),
}
