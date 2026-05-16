import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams, type RegisterParams } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref(localStorage.getItem('access_token') ?? '')
    const refreshToken = ref(localStorage.getItem('refresh_token') ?? '')
    const email = ref(localStorage.getItem('auth_email') ?? '')

    const isLoggedIn = computed(() => !!accessToken.value)
    // 邮箱 @ 前的部分作为显示名，如 lei@example.com → lei
    const displayName = computed(() => email.value.split('@')[0] || '用户')
    // 显示名首字母大写，用于头像
    const avatarLetter = computed(() => displayName.value[0]?.toUpperCase() ?? 'U')

    async function login(params: LoginParams) {
        const pair = await authApi.login(params)
        accessToken.value = pair.access_token
        refreshToken.value = pair.refresh_token
        email.value = params.email
        localStorage.setItem('access_token', pair.access_token)
        localStorage.setItem('refresh_token', pair.refresh_token)
        localStorage.setItem('auth_email', params.email)
    }

    async function logout() {
        if (refreshToken.value) {
            await authApi.logout(refreshToken.value).catch(() => {})
        }
        accessToken.value = ''
        refreshToken.value = ''
        email.value = ''
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('auth_email')
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

    return { accessToken, refreshToken, email, displayName, avatarLetter, isLoggedIn, login, logout, refresh, register }
})