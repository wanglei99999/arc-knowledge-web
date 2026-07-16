import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

/**
 * 这个实例的响应拦截器把 `res.data` 拆了出来（见下方 `(res) => res.data`），
 * 所以调用方实到手的是 T，不是 AxiosResponse<T>。
 *
 * axios 自带的类型描述的是「没装拦截器的 axios」，跟这个实例对不上。
 * 结果是调用方要么信一个错的类型（`(await listSpaces()).map` 报错，可它运行时明明是数组），
 * 要么在每个调用点 `as` 一次——两条都是让类型去将就工具，而不是描述事实。
 *
 * 这里按实际行为重新声明一次。类型跟着运行时走，不是反过来。
 */
export interface HttpClient {
  <T>(config: AxiosRequestConfig): Promise<T>
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  defaults: AxiosInstance['defaults']
  interceptors: AxiosInstance['interceptors']
}

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

/**
 * 双重断言是必需的：AxiosInstance 与 HttpClient 的方法返回类型不重叠
 * （Promise<AxiosResponse<T>> vs Promise<T>），TS 不接受单步断言。
 * 这不是绕过检查——拦截器确实改了运行时契约，这一行只是把它写下来。
 * 唯一的代价：拦截器哪天不再解包，这行不会报错。所以两者必须一起改。
 */
export default http as unknown as HttpClient