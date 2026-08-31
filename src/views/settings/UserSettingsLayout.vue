<script setup lang="ts">
import { Archive } from 'lucide-vue-next'
</script>

<template>
  <div class="flex min-h-full bg-paper">
    <aside class="w-52 shrink-0 border-r border-rule px-md py-xl">
      <p class="mb-sm px-sm text-meta text-graphite-45">个人设置</p>
      <nav aria-label="个人设置">
        <RouterLink
          to="/settings/archived-chats"
          class="flex h-9 items-center gap-sm rounded-sm px-sm text-label text-graphite-70 hover:bg-desk-hover hover:text-graphite"
          active-class="bg-desk-sunken text-graphite"
        >
          <Archive class="h-4 w-4" :stroke-width="1.5" />
          已归档聊天
        </RouterLink>
      </nav>
    </aside>
    <div class="min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
