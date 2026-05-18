import http from '@/utils/http'
import type { SpaceVO } from '@/types/space'

export const listSpaces = () =>
    http.get<SpaceVO[]>('/spaces')

export const createSpace = (name: string) =>
    http.post<SpaceVO>('/spaces', { name })