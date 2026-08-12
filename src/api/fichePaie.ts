import { api } from './client'
import type { FichePaieDto } from './types'

export interface CreateFichePaieRequest {
  consultantId: number
  period: string
  grossSalary: number
  netSalary: number
  employerCost?: number | null
  taxes?: number | null
  issuedAt?: string | null
  comment?: string | null
}

export const fichePaieApi = {
  findByConsultant: (consultantId: number) =>
    api.get<FichePaieDto[]>(`/fiche-paie/consultant/${consultantId}`),
  findBySoc: (socId: number) => api.get<FichePaieDto[]>(`/fiche-paie/soc/${socId}`),
  create: (request: CreateFichePaieRequest) =>
    api.post<FichePaieDto>('/fiche-paie', request),
  uploadFile: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<FichePaieDto>(`/fiche-paie/${id}/upload`, formData)
  },
  download: (id: number, period: string) =>
    api.download(`/fiche-paie/${id}/download`, `fiche-paie-${period}.pdf`),
  delete: (id: number) => api.delete<void>(`/fiche-paie/${id}`),
}
