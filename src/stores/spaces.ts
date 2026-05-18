import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listSpaces, createSpace as apiCreateSpace } from '@/api/spaces'
import type { SpaceVO } from '@/types/space'

export const useSpacesStore = defineStore('spaces', () => {
    const spaces = ref<SpaceVO[]>([])
    const currentSpaceId = ref(localStorage.getItem('current_space_id') ?? '')

    const currentSpace = computed<SpaceVO | null>(() =>
        spaces.value.find(s => s.space_id === currentSpaceId.value)
        ?? spaces.value[0] ?? null
    )

    async function fetchSpaces() {
        spaces.value = await listSpaces()
    }

    function switchSpace(id: string) {
        currentSpaceId.value = id
        localStorage.setItem('current_space_id', id)
    }

    async function createSpace(name: string) {
        const space = await apiCreateSpace(name)
        spaces.value.push(space)
        switchSpace(space.space_id)
        return space
    }

    return { spaces, currentSpace, fetchSpaces, switchSpace, createSpace }
})
