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
}

export interface RegisterResult {
    user_id: string
    email: string
}

export const authApi = {
    login(params: LoginParams): Promise<TokenPair> {
        return http.post('/auth/login', params)
    },  

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