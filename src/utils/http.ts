import axios, { type AxiosError } from 'axios'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 30_000,
})

// 请求拦截：注入租户 Header 和 Bearer Token
http.interceptors.request.use((config) => {
  const appStore = useAppStore()
  const authStore = useAuthStore()
  config.headers['X-Tenant-Id'] = appStore.tenantId
  if (authStore.accessToken) {
    config.headers['Authorization'] = `Bearer ${authStore.accessToken}`
  }
  return config
})

// 后端英文错误 → 中文映射
const errorMap: Record<string, string> = {
  'Email already registered': '该邮箱已被注册',
  'Invalid email or password': '邮箱或密码不正确',
  'Invalid or expired refresh token': '登录已过期，请重新登录',
}

// 响应拦截：401 自动刷新 token，其他错误统一提示
http.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError<{ detail?: string }>) => {
    const authStore = useAuthStore()
    if (error.response?.status === 401 && authStore.refreshToken) {
      try {
        await authStore.refresh()
        const config = error.config!
        config.headers['Authorization'] = `Bearer ${authStore.accessToken}`
        return http(config)
      } catch {
        await authStore.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    const raw = error.response?.data?.detail ?? '请求失败，请稍后重试'
    message.error(errorMap[raw] ?? raw)
    return Promise.reject(error)
  }
)

export default http