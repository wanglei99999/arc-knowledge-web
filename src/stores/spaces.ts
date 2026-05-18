import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listSpaces, createSpace as apiCreateSpace } from '@/api/spaces'
import type { SpaceVO } from '@/types/space'

export const useSpacesStore = defineStore('spaces', () => {
    const spaces = ref<SpaceVO[]>([])
    const currentSpaceKey = ref(localStorage.getItem('current_space_key') ?? 'default')

    const currentSpace = computed<SpaceVO | null>(() =>
        spaces.value.find(s => s.space_key === currentSpaceKey.value)
        ?? spaces.value[0] ?? null
    )

    async function fetchSpaces() {
        spaces.value = await listSpaces()
    }

    function switchSpace(key: string) {
        currentSpaceKey.value = key
        localStorage.setItem('current_space_key', key)
    }

    async function createSpace(name: string) {
        const space = await apiCreateSpace(name)
        spaces.value.push(space)
        switchSpace(space.space_key)
        return space
    }

    return { spaces, currentSpace, fetchSpaces, switchSpace, createSpace }
})
