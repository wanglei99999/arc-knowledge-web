<template>
  <div class="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 overflow-hidden">

    <!-- 背景装饰 -->
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
        <h2 class="text-xl font-semibold text-gray-800 mb-6">创建账号</h2>

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
            :rules="[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }]"
          >
            <a-input-password v-model:value="form.password" placeholder="至少 8 位" size="large" />
            <!-- 密码强度指示器 -->
            <div v-if="form.password" class="mt-2">
              <div class="flex gap-1 h-1">
                <div class="flex-1 rounded-full transition-colors duration-300"
                  :class="strength ? 'bg-red-400' : 'bg-gray-200'" />
                <div class="flex-1 rounded-full transition-colors duration-300"
                  :class="strength && strength.level >= 2 ? 'bg-yellow-400' : 'bg-gray-200'" />
                <div class="flex-1 rounded-full transition-colors duration-300"
                  :class="strength && strength.level >= 3 ? 'bg-green-400' : 'bg-gray-200'" />
              </div>
              <p class="text-xs mt-1" :class="strength?.color">{{ strength?.label }}</p>
            </div>
          </a-form-item>

          <a-form-item
            label="确认密码"
            name="confirm"
            :rules="[{ required: true, message: '请确认密码' }, { validator: checkConfirm }]"
          >
            <a-input-password v-model:value="form.confirm" placeholder="再输一次密码" size="large" />
          </a-form-item>

          <a-button
            type="primary"
            html-type="submit"
            :loading="loading"
            size="large"
            class="w-full mt-2"
          >
            注册
          </a-button>
        </a-form>

        <div class="mt-6 text-center text-sm text-gray-500">
          已有账号？
          <router-link to="/login" class="text-blue-600 font-medium hover:underline">去登录</router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({ email: '', password: '', confirm: '' })

// 密码强度：根据长度和字符种类计算 1-3 级
const strength = computed(() => {
  const pwd = form.password
  if (!pwd) return null
  const types = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pwd)).length
  if (pwd.length < 8) return { level: 1, label: '强度：弱', color: 'text-red-500' }
  if (types <= 2)     return { level: 2, label: '强度：中', color: 'text-yellow-500' }
  return               { level: 3, label: '强度：强', color: 'text-green-500' }
})

function checkConfirm(_: unknown, value: string) {
  if (value && value !== form.password) {
    return Promise.reject('两次密码不一致')
  }
  return Promise.resolve()
}

async function onSubmit() {
  loading.value = true
  try {
    await authStore.register({ email: form.email, password: form.password })
    message.success('注册成功，欢迎加入！')
    router.push({ name: 'dashboard' })
  } finally {
    loading.value = false
  }
}
</script>
