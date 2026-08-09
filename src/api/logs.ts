import { api } from './client'

export interface LogsResponse {
  file: string
  lines: string[]
}

export const logsApi = {
  tail: (lines: number) => api.get<LogsResponse>('/logs', { lines }),
}
