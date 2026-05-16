import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 登录页：不需要登录就能访问，不挂 meta.requiresAuth
    { //公开路由
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/login.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/register.vue'),
    },
    { //受保护的路由
      path: '/',
      component: AppLayout,
      // 挂在父路由上，所有子路由自动继承，不用每个子路由单独写
      meta: {requiresAuth: true},
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue'),
        },
        {
          path: 'documents',
          name: 'documents',
          component: () => import('@/views/document/index.vue'),
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('@/views/chat/index.vue'),
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/search/index.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/admin/index.vue'),
        },
      ],
    },
  ],
})

// 全局导航守卫：每次路由跳转前执行，to 是目标路由对象
router.beforeEach((to)=>{
  const authStore = useAuthStore()
  // 目标页需要登录但未登录 → 拦截并跳转到登录页
  if(to.meta.requiresAuth && !authStore.isLoggedIn){
    return {name:'login'}
  }
  // 已登录还访问登录/注册页 → 跳回首页，避免重复登录
  if((to.name === 'login' || to.name === 'register') && authStore.isLoggedIn){
    return {name:'dashboard'}
  }
  // 返回 undefined 表示放行，正常跳转
})


export default router
