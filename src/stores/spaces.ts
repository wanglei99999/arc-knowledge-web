import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listSpaces, createSpace as apiCreateSpace, deleteSpace as apiDeleteSpace } from '@/api/spaces'
import type { SpaceVO } from '@/types/space'

export const useSpacesStore = defineStore('spaces', () => {
    const spaces = ref<SpaceVO[]>([])
    const currentSpaceId = ref(localStorage.getItem('current_space_id') ?? '')

    /**
     * 不兜底到 spaces[0]：那样「没选空间」就永远表达不出来，叉掉也会立刻弹回第一个。
     * 首次进来的自动选择放在 fetchSpaces 里做一次，之后由用户说了算。
     */
    const currentSpace = computed<SpaceVO | null>(() =>
        spaces.value.find(s => s.space_id === currentSpaceId.value) ?? null
    )

    async function fetchSpaces() {
        spaces.value = await listSpaces()
        // 只在从没选过时替用户选一次。这里必须比对 null 而不是假值：
        // 叉掉之后存的是 ''，那是「主动清空」，重进不该又替他选回来
        if (localStorage.getItem('current_space_id') === null && spaces.value.length) {
            switchSpace(spaces.value[0].space_id)
        }
    }

    function switchSpace(id: string) {
        currentSpaceId.value = id
        localStorage.setItem('current_space_id', id)
    }

    /** 叉掉当前空间。/chat 的 space_id 是必填，所以清空之后发送必须挡住 */
    function clearSpace() {
        currentSpaceId.value = ''
        localStorage.setItem('current_space_id', '')
    }

    async function createSpace(name: string) {
        const space = await apiCreateSpace(name)
        spaces.value.push(space)
        switchSpace(space.space_id)
        return space
    }

    async function deleteSpace(spaceId: string) {
        await apiDeleteSpace(spaceId)
        spaces.value = spaces.value.filter(s => s.space_id !== spaceId)
        if (currentSpaceId.value === spaceId) {
            switchSpace(spaces.value[0]?.space_id ?? '')
        }
    }

    return { spaces, currentSpace, fetchSpaces, switchSpace, clearSpace, createSpace, deleteSpace }
})
