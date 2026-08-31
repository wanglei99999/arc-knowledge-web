<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ArchiveRestore, FolderArchive, RotateCcw, Search } from 'lucide-vue-next'

import { useArchiveStore } from '@/stores/archive'

const archiveStore = useArchiveStore()
const restoringSession = ref<string | null>(null)
const restoringSpace = ref<string | null>(null)

const spaceOptions = computed(() => {
  const spaces = new Map<string, string>()
  for (const item of archiveStore.items) {
    spaces.set(item.space.space_id, item.space.name)
  }
  return [...spaces.entries()].map(([id, name]) => ({ id, name }))
})

const visibleGroups = computed(() => {
  const query = archiveStore.query.trim().toLocaleLowerCase()
  return archiveStore.groupedSessions
    .filter(group => (
      !archiveStore.spaceId || group.space.space_id === archiveStore.spaceId
    ))
    .map(group => ({
      ...group,
      sessions: group.sessions.filter(session => (
        !query
        || session.title.toLocaleLowerCase().includes(query)
        || group.space.name.toLocaleLowerCase().includes(query)
      )),
    }))
    .filter(group => group.sessions.length > 0)
})

function archiveTime(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function fetchArchived() {
  try {
    await archiveStore.fetchArchived()
  } catch {
    // store.error 是页面内联错误的唯一来源。
  }
}

async function submitSearch() {
  archiveStore.offset = 0
  await fetchArchived()
}

async function restoreSession(sessionId: string) {
  restoringSession.value = sessionId
  try {
    await archiveStore.restore(sessionId)
  } finally {
    restoringSession.value = null
  }
}

async function restoreSpace(spaceId: string) {
  restoringSpace.value = spaceId
  try {
    await archiveStore.restoreSpace(spaceId)
  } finally {
    restoringSpace.value = null
  }
}

onMounted(fetchArchived)
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-xl py-2xl">
    <header class="mb-xl">
      <h1 class="text-title-lg text-graphite">已归档聊天</h1>
      <p class="mt-xs text-body-sm text-graphite-45">
        归档聊天不会出现在侧边栏。你可以按原知识空间查找并恢复。
      </p>
    </header>

    <form class="mb-lg flex flex-wrap gap-sm" role="search" @submit.prevent="submitSearch">
      <label class="relative min-w-[240px] flex-1">
        <span class="sr-only">搜索归档聊天</span>
        <Search
          aria-hidden="true"
          class="pointer-events-none absolute left-sm top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-45"
          :stroke-width="1.5"
        />
        <input
          v-model="archiveStore.query"
          type="search"
          placeholder="搜索标题或空间"
          class="h-9 w-full rounded-md border border-rule bg-paper pl-9 pr-sm text-body-sm text-graphite outline-none focus:border-rule-strong"
        />
      </label>
      <label>
        <span class="sr-only">按空间筛选</span>
        <select
          v-model="archiveStore.spaceId"
          class="h-9 min-w-40 rounded-md border border-rule bg-paper px-sm text-body-sm text-graphite outline-none focus:border-rule-strong"
          @change="submitSearch"
        >
          <option value="">全部空间</option>
          <option v-for="space in spaceOptions" :key="space.id" :value="space.id">
            {{ space.name }}
          </option>
        </select>
      </label>
      <button
        type="submit"
        class="h-9 rounded-md bg-graphite px-md text-label text-paper hover:bg-graphite-80"
      >
        搜索
      </button>
    </form>

    <div v-if="archiveStore.loading" class="space-y-sm" aria-label="正在加载归档聊天">
      <div v-for="index in 3" :key="index" class="h-16 animate-breathe rounded-md bg-desk-hover" />
    </div>

    <div
      v-else-if="archiveStore.error"
      role="alert"
      class="rounded-md border border-alert-ink/30 bg-alert-ink/5 p-lg text-body-sm text-graphite"
    >
      <p>归档聊天加载失败：{{ archiveStore.error }}</p>
      <button type="button" class="mt-sm text-label text-accent-blue hover:underline" @click="fetchArchived">
        重试
      </button>
    </div>

    <div
      v-else-if="!archiveStore.items.length && !archiveStore.query"
      class="rounded-md border border-dashed border-rule p-2xl text-center"
    >
      <FolderArchive class="mx-auto h-7 w-7 text-graphite-45" :stroke-width="1.5" />
      <p class="mt-sm text-body text-graphite">还没有归档聊天</p>
      <p class="mt-xs text-body-sm text-graphite-45">归档后的会话会按原空间显示在这里。</p>
    </div>

    <div
      v-else-if="!visibleGroups.length"
      class="rounded-md border border-dashed border-rule p-2xl text-center text-body-sm text-graphite-45"
    >
      没有匹配的归档聊天
    </div>

    <div v-else class="space-y-md">
      <details
        v-for="group in visibleGroups"
        :key="group.space.space_id"
        open
        class="overflow-hidden rounded-md border border-rule bg-paper"
      >
        <summary class="flex cursor-pointer list-none items-center gap-sm bg-desk px-md py-sm">
          <FolderArchive class="h-4 w-4 shrink-0 text-graphite-45" :stroke-width="1.5" />
          <span class="min-w-0 flex-1 truncate text-label text-graphite">{{ group.space.name }}</span>
          <span class="font-callnum text-callnum-sm text-graphite-45">{{ group.sessions.length }}</span>
          <span
            v-if="group.space.status === 'archived'"
            class="rounded-full bg-desk-sunken px-sm py-[2px] text-meta text-graphite-45"
          >
            空间已归档
          </span>
        </summary>

        <div class="divide-y divide-rule">
          <article
            v-for="session in group.sessions"
            :key="session.id"
            class="flex items-center gap-md px-md py-sm"
          >
            <ArchiveRestore class="h-4 w-4 shrink-0 text-graphite-45" :stroke-width="1.5" />
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-body-sm text-graphite">{{ session.title }}</h2>
              <p class="mt-[2px] font-callnum text-callnum-sm text-graphite-45">
                {{ session.message_count }} 条消息 · 归档于 {{ archiveTime(session.archived_at) }}
              </p>
            </div>

            <div v-if="group.space.status === 'archived'" class="flex items-center gap-sm">
              <button
                type="button"
                :aria-label="`恢复空间 ${group.space.name}`"
                :disabled="restoringSpace === group.space.space_id"
                class="rounded-sm border border-rule-strong px-sm py-xs text-label text-graphite hover:bg-desk-hover disabled:opacity-50"
                @click="restoreSpace(group.space.space_id)"
              >
                先恢复空间
              </button>
              <button
                type="button"
                :aria-label="`恢复会话 ${session.title}`"
                disabled
                class="rounded-sm px-sm py-xs text-label text-graphite-45 opacity-50"
              >
                恢复
              </button>
            </div>

            <button
              v-else
              type="button"
              :aria-label="`恢复会话 ${session.title}`"
              :disabled="restoringSession === session.id"
              class="flex items-center gap-xs rounded-sm border border-rule-strong px-sm py-xs text-label text-graphite hover:bg-desk-hover disabled:opacity-50"
              @click="restoreSession(session.id)"
            >
              <RotateCcw class="h-3.5 w-3.5" :stroke-width="1.5" />
              恢复
            </button>
          </article>
        </div>
      </details>
    </div>
  </section>
</template>
