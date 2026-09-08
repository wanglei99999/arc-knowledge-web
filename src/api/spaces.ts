import http from '@/utils/http'
import type { SpaceVO } from '@/types/space'

export const listSpaces = () =>
    http.get<SpaceVO[]>('/spaces')

export interface CreateSpace { name: string; preset: 'private' | 'group' | 'public'; group_id?: string; group_role?: 'VIEWER' | 'EDITOR' }
export const createSpace = (input: string | CreateSpace) =>
    http.post<SpaceVO>('/spaces', typeof input === 'string' ? { name: input, preset: 'private' } : input)

export const deleteSpace = (space_id: string) =>
    http.delete(`/spaces/${space_id}`)

export const restoreSpace = (spaceId: string) =>
    http.post<void>(`/spaces/${spaceId}/restore`)
