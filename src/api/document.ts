import http from '@/utils/http'
import type { DocumentListResult, ChunkListResult } from '@/types/document'

export const listDocuments = (params?: { space_id?: string; limit?: number; offset?: number }) =>
  http.get<DocumentListResult>('/documents', { params })

export const uploadDocument = (file: File, spaceId: string, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return http.post('/documents/upload', form, {
    params: { space_id: spaceId },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}

export const getDocumentStatus = (documentId: string) =>
  http.get(`/documents/${documentId}/status`)

export const listChunks = (documentId: string) =>
  http.get<ChunkListResult>(`/documents/${documentId}/chunks`)

export const deleteDocument = (documentId: string) =>
  http.delete(`/documents/${documentId}`)
