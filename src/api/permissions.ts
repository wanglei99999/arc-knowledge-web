import http from '@/utils/http'
import type { SpaceVO } from '@/types/space'
export type Role = 'VIEWER' | 'EDITOR' | 'MANAGER'
export interface Group { id: string; name: string; parent_group_id: string | null; status: string }
export interface Member { membership_id: string; user_id: string; email: string; role: 'TENANT_ADMIN' | 'MEMBER'; status: 'active' | 'suspended' | 'left' }
export interface DirectoryMember { membership_id: string; email: string }
export interface GrantInput { subject_type: 'TENANT' | 'GROUP' | 'MEMBER'; group_id?: string; tenant_membership_id?: string; role: Role }
export interface Grant extends GrantInput { id: string; source: string; created_at: string }
export interface Audit { id: string; action: string; resource_type: string; resource_id: string; metadata: Record<string, unknown>; created_at: string; actor_membership_id: string }
export const permissionsApi = {
  directory: () => http.get<{ members: DirectoryMember[]; groups: Group[] }>('/tenant/directory'),
  grants: (id: string) => http.get<Grant[]>(`/spaces/${id}/grants`),
  grant: (id: string, data: GrantInput) => http.put<Grant>(`/spaces/${id}/grants`, data),
  revoke: (id: string, grantId: string) => http.delete(`/spaces/${id}/grants/${grantId}`),
  rename: (id: string, name: string) => http.patch(`/spaces/${id}`, { name }),
  members: () => http.get<Member[]>('/tenant/members'),
  addMember: (email: string, role: Member['role']) => http.post('/tenant/members', { email, role }),
  updateMember: (id: string, data: Partial<Pick<Member, 'role' | 'status'>>) => http.patch(`/tenant/members/${id}`, data),
  groups: () => http.get<Group[]>('/groups'),
  addGroup: (name: string, parent_group_id?: string) => http.post('/groups', { name, parent_group_id }),
  updateGroup: (id: string, data: { name: string; parent_group_id: string | null }) => http.patch(`/groups/${id}`, data),
  archiveGroup: (id: string) => http.delete(`/groups/${id}`),
  groupMembers: (id: string) => http.get<DirectoryMember[]>(`/groups/${id}/members`),
  addGroupMember: (id: string, membership_id: string) => http.post(`/groups/${id}/members`, { membership_id }),
  removeGroupMember: (id: string, membershipId: string) => http.delete(`/groups/${id}/members/${membershipId}`),
  spaces: () => http.get<SpaceVO[]>('/tenant/spaces'),
  takeover: (id: string, reason: string) => http.post(`/tenant/spaces/${id}/takeover`, { reason }),
  audit: () => http.get<Audit[]>('/tenant/audit'),
}
