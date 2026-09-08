import http from '@/utils/http'

export interface LoginParams {
    email: string
    password: string
}

export interface TokenPair {
    access_token: string
    refresh_token: string
    token_type: string
}

export interface RegisterParams {
    email: string
    password: string
    tenant_name: string
}

export interface Membership { tenant_id: string; tenant_name: string; membership_id: string; tenant_role: 'TENANT_ADMIN' | 'MEMBER' }
export interface AuthContext extends Membership { user_id: string; email: string }
export interface TenantSelection { selection_token: string; memberships: Membership[] }

export interface RegisterResult {
    user_id: string
    email: string
}

export const authApi = {
    login(params: LoginParams): Promise<TokenPair | TenantSelection> {
        return http.post('/auth/login', params)
    },  
    context: () => http.get<AuthContext>('/me/context'),
    tenants: () => http.get<Membership[]>('/me/tenants'),
    switchTenant: (tenant_id: string, token?: string) => http.post<TokenPair>('/auth/switch-tenant', { tenant_id }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),

    logout(refresh_token: string): Promise<void> {
        return http.post('/auth/logout', { refresh_token })
    },

    refresh(refresh_token: string): Promise<{ access_token: string }> {
        return http.post('/auth/refresh', { refresh_token })
    },

    register(params: RegisterParams): Promise<RegisterResult> {
        return http.post('/auth/register', params)
    },
}
