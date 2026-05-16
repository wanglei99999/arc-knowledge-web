import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams, type RegisterParams } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref(localStorage.getItem('access_token') ?? '')
    const refreshToken = ref(localStorage.getItem('refresh_token') ?? '')

    const isLoggedIn = computed(() => !!accessToken.value)

    async function login(params: LoginParams) {
        const pair = await authApi.login(params)
        accessToken.value = pair.access_token
        refreshToken.value = pair.refresh_token
        localStorage.setItem('access_token', pair.access_token)
        localStorage.setItem('refresh_token', pair.refresh_token)
    }

    async function logout() {
        if (refreshToken.value) {
            await authApi.logout(refreshToken.value).catch(() => {})
        }
        accessToken.value = ''
        refreshToken.value = ''
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
    }

    async function refresh() {
        const res = await authApi.refresh(refreshToken.value)
        accessToken.value = res.access_token
        localStorage.setItem('access_token', res.access_token)
        return res.access_token
    }

    async function register(params: RegisterParams) {
        await authApi.register(params)
        await login({ email: params.email, password: params.password })
    }

    return { accessToken, refreshToken, isLoggedIn, login, logout, refresh, register }
})