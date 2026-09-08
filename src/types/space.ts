export interface SpaceVO {
    space_id:string
    space_key:string
    name:string
    status:string
    created_by: string |null
    effective_role?: string | null
    capabilities?: string[]
    visibility_summary?: 'public' | 'team' | 'private'
    permission_sources?: { subject_type: string; group_id?: string | null; tenant_membership_id?: string | null; role: string }[]
}
