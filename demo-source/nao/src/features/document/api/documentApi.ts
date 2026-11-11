import { ApiError, apiFetch, tokenStorage } from '../../../api/client'
import type { DocumentInfo, DocumentList } from '../types'

function toApiError(status: number, text: string): ApiError {
  try {
    const p = JSON.parse(text) as { code?: string; detail?: string; errors?: { field: string; message: string }[] }
    return new ApiError(status, p.code ?? 'ERROR', p.errors?.[0]?.message ?? p.detail ?? `Upload failed (${status})`, p.errors ?? [])
  } catch {
    return new ApiError(status, 'ERROR', `Upload failed (${status})`)
  }
}

export const documentApi = {
  list: (applicationId: string) => apiFetch<DocumentList>(`/applications/${applicationId}/documents`),

  /** multipart upload; XMLHttpRequest because fetch can't report upload progress */
  upload(applicationId: string, docType: string, file: File, onProgress: (percent: number) => void) {
    if (import.meta.env.VITE_DEMO_BACKEND === 'true') {
      const form = new FormData()
      form.append('docType', docType)
      form.append('file', file)
      onProgress(100)
      return import('../../../demo/mockServer').then(async ({ demoFetch }) => {
        const r = await demoFetch(`/api/applications/${applicationId}/documents`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${tokenStorage.get()}` } })
        if (r.status !== 201) throw toApiError(r.status, await r.text())
        return (await r.json()) as DocumentInfo
      })
    }
    return new Promise<DocumentInfo>((resolve, reject) => {
      const body = new FormData()
      body.append('docType', docType)
      body.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/applications/${applicationId}/documents`)
      const token = tokenStorage.get()
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
      xhr.onload = () =>
        xhr.status === 201 ? resolve(JSON.parse(xhr.responseText) as DocumentInfo) : reject(toApiError(xhr.status, xhr.responseText))
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?'))
      xhr.send(body)
    })
  },

  /** downloads the file with the token and opens it in a new tab */
  async preview(documentId: string) {
    const token = tokenStorage.get()
    const response = await fetch(`/api/documents/${documentId}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!response.ok) throw new ApiError(response.status, 'ERROR', 'Could not open the file')
    const url = URL.createObjectURL(await response.blob())
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },

  remove: (documentId: string) => apiFetch<void>(`/documents/${documentId}`, { method: 'DELETE' }),
}
