import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams, type RegisterParams, type TokenPair, type Membership, type AuthContext } from '@/api/auth'
import { invalidateContext } from '@/utils/context'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('access_token') ?? '')
  const refreshToken = ref(localStorage.getItem('refresh_token') ?? '')
  const email = ref(localStorage.getItem('auth_email') ?? '')
  const context = ref<AuthContext | null>(null)
  const memberships = ref<Membership[]>([])
  const selectionToken = ref('')
  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => context.value?.tenant_role === 'TENANT_ADMIN')
  const displayName = computed(() => email.value.split('@')[0] || '用户')
  const avatarLetter = computed(() => displayName.value[0]?.toUpperCase() ?? 'U')
  function save(pair: TokenPair) {
    accessToken.value = pair.access_token
    refreshToken.value = pair.refresh_token
    localStorage.setItem('access_token', pair.access_token)
    localStorage.setItem('refresh_token', pair.refresh_token)
  }
  async function loadContext() {
    context.value = await authApi.context()
    email.value = context.value.email
    localStorage.setItem('auth_email', email.value)
  }
  async function loadTenants() { memberships.value = await authApi.tenants() }
  async function login(params: LoginParams) {
    const result = await authApi.login(params)
    if ('selection_token' in result) {
      clear()
      selectionToken.value = result.selection_token
      memberships.value = result.memberships
      return
    }
    save(result)
    await loadContext()
  }
  function clear() {
    accessToken.value = ''; refreshToken.value = ''; email.value = ''; context.value = null
    selectionToken.value = ''; memberships.value = []
    for (const key of ['access_token', 'refresh_token', 'auth_email', 'current_space_id']) localStorage.removeItem(key)
    for (const key of Object.keys(localStorage)) if (key.startsWith('arc-chat-runtime:')) localStorage.removeItem(key)
  }
  async function switchTenant(tenantId: string) {
    const pair = await authApi.switchTenant(tenantId, selectionToken.value || undefined)
    invalidateContext()
    clear()
    save(pair)
    window.location.replace('/')
  }
  async function logout() {
    const token = refreshToken.value
    invalidateContext()
    clear()
    if (token) await authApi.logout(token).catch(() => {})
    window.location.replace('/login')
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
  return { accessToken, refreshToken, email, context, memberships, selectionToken, isAdmin, displayName, avatarLetter, isLoggedIn, login, logout, refresh, register, loadContext, loadTenants, switchTenant, clear }
})
