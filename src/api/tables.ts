import { api } from './client'

export interface ColumnDetails {
  columnName: string
  dataType: string
  nullable: boolean
}

export interface TableRelation {
  tableName: string
  columnName: string
  targetTable: string
  targetPk: string
}

export const tablesApi = {
  list: () => api.get<string[]>('/tables'),
  getLines: (table: string) =>
    api.get<Record<string, unknown>[]>(`/tables/${encodeURIComponent(table)}`),
  getColumns: (table: string) =>
    api.get<ColumnDetails[]>(`/tables/${encodeURIComponent(table)}/columns`),
  executeSql: (sql: string) => api.postText<Record<string, unknown>[]>('/tables/execute', sql),
  getRelations: () => api.get<TableRelation[]>('/tables/relations'),
}
