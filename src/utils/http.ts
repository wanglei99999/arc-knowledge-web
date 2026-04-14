import axios, { type AxiosError } from 'axios'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 30_000,
})

// 请求拦截：注入租户 Header
http.interceptors.request.use((config) => {
  const appStore = useAppStore()
  config.headers['X-Tenant-Id'] = appStore.tenantId
  return config
})

// 响应拦截：统一错误处理
http.interceptors.response.use(
  (res) => res.data,
  (error: AxiosError<{ detail?: string }>) => {
    const msg = error.response?.data?.detail ?? '请求失败，请稍后重试'
    message.error(msg)
    return Promise.reject(error)
  }
)

export default http
