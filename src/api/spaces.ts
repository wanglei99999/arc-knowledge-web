import http from '@/utils/http'
import type { SpaceVO } from '@/types/space'

export const listSpaces = () =>
    http.get<SpaceVO[]>('/spaces')

export const createSpace = (name: string) =>
    http.post<SpaceVO>('/spaces', { name })

export const deleteSpace = (space_id: string) =>
    http.delete(`/spaces/${space_id}`)

export const restoreSpace = (spaceId: string) =>
    http.post<void>(`/spaces/${spaceId}/restore`)
