import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  listArchivedSessions,
  restoreSession,
} from '@/api/chat'
import { restoreSpace as apiRestoreSpace } from '@/api/spaces'
import type { ArchivedSessionVO } from '@/types/chat'

export interface ArchivedSessionGroup {
  space: ArchivedSessionVO['space']
  sessions: ArchivedSessionVO[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '加载归档聊天失败'
}

export const useArchiveStore = defineStore('archive', () => {
  const items = ref<ArchivedSessionVO[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const query = ref('')
  const spaceId = ref('')
  const limit = ref(50)
  const offset = ref(0)

  const groupedSessions = computed<ArchivedSessionGroup[]>(() => {
    const groups = new Map<string, ArchivedSessionGroup>()
    for (const item of items.value) {
      const existing = groups.get(item.space.space_id)
      if (existing) {
        existing.sessions.push(item)
      } else {
        groups.set(item.space.space_id, {
          space: item.space,
          sessions: [item],
        })
      }
    }

    return [...groups.values()]
      .map(group => ({
        ...group,
        sessions: [...group.sessions].sort((left, right) => (
          Date.parse(right.archived_at) - Date.parse(left.archived_at)
        )),
      }))
      .sort((left, right) => (
        Date.parse(right.sessions[0].archived_at)
        - Date.parse(left.sessions[0].archived_at)
      ))
  })

  async function fetchArchived() {
    loading.value = true
    error.value = null
    try {
      const page = await listArchivedSessions({
        query: query.value.trim() || undefined,
        space_id: spaceId.value || undefined,
        limit: limit.value,
        offset: offset.value,
      })
      items.value = page.items
      total.value = page.total
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function restore(sessionId: string) {
    await restoreSession(sessionId)
    if (!items.value.some(item => item.id === sessionId)) return
    items.value = items.value.filter(item => item.id !== sessionId)
    total.value = Math.max(0, total.value - 1)
  }

  async function restoreSpace(spaceToRestore: string) {
    await apiRestoreSpace(spaceToRestore)
    items.value = items.value.map(item => (
      item.space.space_id === spaceToRestore
        ? {
            ...item,
            space: { ...item.space, status: 'active' },
          }
        : item
    ))
  }

  return {
    items,
    total,
    loading,
    error,
    query,
    spaceId,
    limit,
    offset,
    groupedSessions,
    fetchArchived,
    restore,
    restoreSpace,
  }
})
