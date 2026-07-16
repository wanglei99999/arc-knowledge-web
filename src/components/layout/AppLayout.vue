<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSpacesStore } from '@/stores/spaces'

const spacesStore = useSpacesStore()
onMounted(() => spacesStore.fetchSpaces())
</script>

<template>
  <!-- 桌板铺满，纸压在上面。纸与桌板之间不画边框——接触影已经是那条边了 -->
  <div class="flex h-screen overflow-hidden bg-desk">
    <AppSidebar />

    <div class="m-sm ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-paper shadow-contact">
      <AppHeader />
      <!--
        内边距归各页自己：问答页要满幅（输入器贴底），其余页要留白。
        这里统一 p-6 会逼得问答页用负边距去抵消，那是补丁不是设计。
      -->
      <main class="min-h-0 flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
