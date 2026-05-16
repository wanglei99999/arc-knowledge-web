<template>
  <div class="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 overflow-hidden">

    <!-- 背景装饰：模糊光晕，营造景深感 -->
    <div class="absolute -top-32 -right-32 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-3xl pointer-events-none" />
    <div class="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl pointer-events-none" />

    <div class="relative w-full max-w-md px-4">

      <!-- 品牌区 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
          <span class="text-white text-2xl font-bold">A</span>
        </div>
        <h1 class="text-2xl font-bold text-white">ArcKnowledge</h1>
        <p class="text-sm text-blue-200 mt-1">智能知识库检索平台</p>
      </div>

      <!-- 表单卡片 -->
      <div class="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-white/10 p-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">欢迎回来</h2>

        <a-form :model="form" layout="vertical" @finish="onSubmit">
          <a-form-item
            label="邮箱"
            name="email"
            :rules="[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]"
          >
            <a-input v-model:value="form.email" placeholder="请输入邮箱" size="large" />
          </a-form-item>

          <a-form-item
            label="密码"
            name="password"
            :rules="[{ required: true, message: '请输入密码' }]"
          >
            <a-input-password v-model:value="form.password" placeholder="请输入密码" size="large" />
          </a-form-item>

          <a-button
            type="primary"
            html-type="submit"
            :loading="loading"
            size="large"
            class="w-full mt-2"
          >
            登录
          </a-button>
        </a-form>

        <div class="mt-6 text-center text-sm text-gray-500">
          没有账号？
          <router-link to="/register" class="text-blue-600 font-medium hover:underline">去注册</router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({ email: '', password: '' })

async function onSubmit() {
  loading.value = true
  try {
    await authStore.login(form)
    router.push({ name: 'dashboard' })
  } finally {
    loading.value = false
  }
}
</script>
