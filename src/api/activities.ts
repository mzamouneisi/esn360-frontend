import { api } from './client'
import type { ActivityDto, ActivityRequest, ActivityTypeDto } from './types'

export const activitiesApi = {
  findAll: (params?: { esnId?: number; typeId?: number }) =>
    api.get<ActivityDto[]>('/activities', params),
  getById: (id: number) => api.get<ActivityDto>(`/activities/${id}`),
  create: (request: ActivityRequest) => api.post<ActivityDto>('/activities', request),
  update: (id: number, request: ActivityRequest) =>
    api.put<ActivityDto>(`/activities/${id}`, request),
  delete: (id: number) => api.delete<void>(`/activities/${id}`),
}

export const activityTypesApi = {
  findAll: () => api.get<ActivityTypeDto[]>('/activity-types'),
  create: (body: Partial<ActivityTypeDto>) => api.post<ActivityTypeDto>('/activity-types', body),
  update: (id: number, body: Partial<ActivityTypeDto>) =>
    api.put<ActivityTypeDto>(`/activity-types/${id}`, body),
}
