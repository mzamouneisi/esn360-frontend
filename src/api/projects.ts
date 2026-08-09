import { api } from './client'
import type { ProjectDto, ProjectRequest } from './types'

export const projectsApi = {
  findAll: (params?: { esnId?: number; clientId?: number }) =>
    api.get<ProjectDto[]>('/projects', params),
  getById: (id: number) => api.get<ProjectDto>(`/projects/${id}`),
  create: (request: ProjectRequest) => api.post<ProjectDto>('/projects', request),
  update: (id: number, request: ProjectRequest) =>
    api.put<ProjectDto>(`/projects/${id}`, request),
  delete: (id: number) => api.delete<void>(`/projects/${id}`),
}
