import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
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
      ],
    },
  ],
})

export default router
