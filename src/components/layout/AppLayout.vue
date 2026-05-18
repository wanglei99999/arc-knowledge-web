<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSpacesStore } from '@/stores/spaces'

const spacesStore = useSpacesStore()
onMounted(() => spacesStore.fetchSpaces())

</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 主内容区 -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
