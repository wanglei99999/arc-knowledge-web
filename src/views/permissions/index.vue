<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSpacesStore } from '@/stores/spaces'
import { permissionsApi as api, type Member, type Group, type Grant, type GrantInput, type DirectoryMember, type Audit } from '@/api/permissions'
import { restoreSpace, type CreateSpace } from '@/api/spaces'
import type { SpaceVO } from '@/types/space'

const auth = useAuthStore()
const spaces = useSpacesStore()
const busy = ref(false)
const error = ref('')
const notice = ref('')
const directory = ref<{ members: DirectoryMember[]; groups: Group[] }>({ members: [], groups: [] })
const grants = ref<Grant[]>([])
const selected = ref('')
const current = computed(() => spaces.spaces.find(s => s.space_id === selected.value))
const canManage = computed(() => current.value?.capabilities?.includes('space.manage') ?? false)
const draft = ref<CreateSpace>({ name: '', preset: 'private', group_role: 'VIEWER' })
const name = ref('')
const grant = ref<GrantInput>({ subject_type: 'MEMBER', role: 'VIEWER' })
const members = ref<Member[]>([])
const groups = ref<Group[]>([])
const allSpaces = ref<SpaceVO[]>([])
const audit = ref<Audit[]>([])
const memberEmail = ref('')
const memberRole = ref<Member['role']>('MEMBER')
const groupId = ref('')
const groupName = ref('')
const parentId = ref('')
const groupMembers = ref<DirectoryMember[]>([])
const groupMemberId = ref('')
const takeoverId = ref('')
const reason = ref('')

async function refresh() {
  await spaces.fetchSpaces()
  directory.value = await api.directory()
  if (auth.isAdmin) {
    const values = await Promise.all([api.members(), api.groups(), api.spaces(), api.audit()])
    ;[members.value, groups.value, allSpaces.value, audit.value] = values
  }
}
async function run(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action(); notice.value = '已保存' } catch (e) {
    const detail = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
    error.value = typeof detail === 'string' ? detail : '操作失败，请检查权限并重试'
  } finally { busy.value = false }
}
let grantVersion = 0
async function loadGrants() {
  const version = ++grantVersion
  grants.value = []
  name.value = current.value?.name ?? ''
  if (!canManage.value) return
  const rows = await api.grants(selected.value)
  if (version === grantVersion) grants.value = rows
}
watch(selected, () => { void run(loadGrants) })
async function create() {
  await spaces.createSpace({ name: draft.value.name.trim(), preset: draft.value.preset, ...(draft.value.preset === 'group' ? { group_id: draft.value.group_id, group_role: draft.value.group_role } : {}) })
  draft.value.name = ''; await refresh()
}
async function saveGrant() {
  const data: GrantInput = { subject_type: grant.value.subject_type, role: grant.value.role }
  if (data.subject_type === 'GROUP') data.group_id = grant.value.group_id
  if (data.subject_type === 'MEMBER') data.tenant_membership_id = grant.value.tenant_membership_id
  await api.grant(selected.value, data); await refresh(); await loadGrants()
}
async function selectGroup() {
  const item = groups.value.find(g => g.id === groupId.value)
  groupName.value = item?.name ?? ''; parentId.value = item?.parent_group_id ?? ''
  groupMembers.value = groupId.value ? await api.groupMembers(groupId.value) : []
}
function subjectLabel(row: Grant) {
  if (row.subject_type === 'TENANT') return '整个组织'
  if (row.subject_type === 'GROUP') return directory.value.groups.find(g => g.id === row.group_id)?.name ?? row.group_id
  return directory.value.members.find(m => m.membership_id === row.tenant_membership_id)?.email ?? row.tenant_membership_id
}
onMounted(() => { void run(refresh) })
</script>

<template>
  <div class="permissions p-6 space-y-6 max-w-5xl">
    <h1 class="text-2xl">权限与组织</h1>
    <p>当前组织：{{ auth.context?.tenant_name }} · {{ auth.context?.tenant_role }}</p>
    <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <fieldset :disabled="busy" class="space-y-6">
      <section>
        <h2>创建知识空间</h2>
        <form @submit.prevent="run(create)" class="flex flex-wrap gap-3">
          <input v-model="draft.name" aria-label="空间名称" placeholder="空间名称" required maxlength="200" />
          <select v-model="draft.preset" aria-label="可见范围">
            <option value="private">私有 · 仅自己</option><option value="group">团队共享</option><option v-if="auth.isAdmin" value="public">组织公开</option>
          </select>
          <template v-if="draft.preset === 'group'">
            <select v-model="draft.group_id" required aria-label="共享团队"><option v-for="g in directory.groups" :key="g.id" :value="g.id">{{ g.name }}</option></select>
            <select v-model="draft.group_role" aria-label="团队角色"><option>VIEWER</option><option>EDITOR</option></select>
          </template>
          <button type="submit">创建空间</button>
        </form>
      </section>
      <section>
        <h2>空间共享与管理</h2>
        <select v-model="selected" aria-label="管理空间"><option value="">选择可访问空间</option><option v-for="s in spaces.spaces" :key="s.space_id" :value="s.space_id">{{ s.name }} · {{ s.visibility_summary }} · {{ s.effective_role }}</option></select>
        <div v-if="current" class="mt-3 space-y-3">
          <p>有效权限：{{ current.effective_role }}；来源：{{ current.permission_sources?.map(s => `${s.subject_type}: ${s.role}`).join('，') || '无' }}</p>
          <p v-if="!canManage">此空间需要 space.manage 权限才能调整共享设置。</p>
          <template v-else>
            <form @submit.prevent="run(async () => { await api.rename(selected, name.trim()); await refresh() })" class="flex gap-3"><input v-model="name" aria-label="重命名空间" required /><button>重命名</button><button type="button" @click="run(async () => { await spaces.deleteSpace(selected); selected = ''; await refresh() })">归档空间</button></form>
            <ul><li v-for="row in grants" :key="row.id" class="flex gap-3 py-2"><span>{{ subjectLabel(row) }} · {{ row.role }} · 来源 {{ row.source }}</span><button @click="run(async () => { await api.revoke(selected, row.id); await refresh(); await loadGrants() })">撤销授权</button></li></ul>
            <form @submit.prevent="run(saveGrant)" class="flex flex-wrap gap-3">
              <select v-model="grant.subject_type" aria-label="授权对象类型"><option value="MEMBER">成员</option><option value="GROUP">团队</option><option v-if="auth.isAdmin" value="TENANT">整个组织</option></select>
              <select v-if="grant.subject_type === 'MEMBER'" v-model="grant.tenant_membership_id" required aria-label="授权成员"><option v-for="m in directory.members" :key="m.membership_id" :value="m.membership_id">{{ m.email }}</option></select>
              <select v-if="grant.subject_type === 'GROUP'" v-model="grant.group_id" required aria-label="授权团队"><option v-for="g in directory.groups" :key="g.id" :value="g.id">{{ g.name }}</option></select>
              <select v-model="grant.role" aria-label="授权角色"><option>VIEWER</option><option>EDITOR</option><option>MANAGER</option></select>
              <button data-test="save-grant">保存授权</button>
            </form>
          </template>
        </div>
      </section>
      <template v-if="auth.isAdmin">
        <section>
          <h2>组织成员管理</h2>
          <form @submit.prevent="run(async () => { await api.addMember(memberEmail.trim(), memberRole); memberEmail = ''; await refresh() })" class="flex gap-3"><input v-model="memberEmail" type="email" aria-label="成员邮箱" placeholder="已注册用户邮箱" required /><select v-model="memberRole" aria-label="成员角色"><option>MEMBER</option><option>TENANT_ADMIN</option></select><button>添加成员</button></form>
          <table><thead><tr><th>邮箱</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="m in members" :key="m.membership_id"><td>{{ m.email }}</td><td><select v-model="m.role" :aria-label="`${m.email}角色`"><option>MEMBER</option><option>TENANT_ADMIN</option></select></td><td><select v-model="m.status" :aria-label="`${m.email}状态`"><option>active</option><option>suspended</option><option>left</option></select></td><td><button @click="run(async () => { await api.updateMember(m.membership_id, { role: m.role, status: m.status }); await refresh(); await auth.loadContext() })">保存</button></td></tr></tbody></table>
        </section>
        <section>
          <h2>团队与成员</h2>
          <select v-model="groupId" aria-label="编辑团队" @change="run(selectGroup)"><option value="">新建团队</option><option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} · {{ g.status }}</option></select>
          <form @submit.prevent="run(async () => { if (groupId) await api.updateGroup(groupId, { name: groupName.trim(), parent_group_id: parentId || null }); else await api.addGroup(groupName.trim(), parentId || undefined); await refresh() })" class="flex gap-3 mt-3">
            <input v-model="groupName" aria-label="团队名称" placeholder="团队名称" required /><select v-model="parentId" aria-label="父团队"><option value="">无父团队</option><option v-for="g in groups.filter(g => g.id !== groupId && g.status === 'active')" :key="g.id" :value="g.id">{{ g.name }}</option></select><button>保存团队</button><button v-if="groupId" type="button" @click="run(async () => { await api.archiveGroup(groupId); groupId = ''; await refresh(); await selectGroup() })">归档团队</button>
          </form>
          <div v-if="groupId" class="mt-3">
            <p v-for="m in groupMembers" :key="m.membership_id">{{ m.email }} <button @click="run(async () => { await api.removeGroupMember(groupId, m.membership_id); await selectGroup() })">移出团队</button></p>
            <form @submit.prevent="run(async () => { await api.addGroupMember(groupId, groupMemberId); await selectGroup() })" class="flex gap-3"><select v-model="groupMemberId" required aria-label="添加团队成员"><option v-for="m in directory.members" :key="m.membership_id" :value="m.membership_id">{{ m.email }}</option></select><button>加入团队</button></form>
          </div>
        </section>
        <section>
          <h2>组织空间目录与接管</h2>
          <p>元数据不代表内容访问权限。接管会创建 MANAGER 授权并记录审计，请填写具体原因。</p>
          <table><thead><tr><th>空间</th><th>状态</th><th>可见范围</th><th>操作</th></tr></thead><tbody><tr v-for="s in allSpaces" :key="s.space_id"><td>{{ s.name }}</td><td>{{ s.status }}</td><td>{{ s.visibility_summary }}</td><td><button @click="takeoverId = s.space_id">选择接管</button><button v-if="s.status === 'archived'" @click="run(async () => { await restoreSpace(s.space_id); await refresh() })">恢复空间</button><button v-else @click="run(async () => { await spaces.deleteSpace(s.space_id); await refresh() })">归档空间</button></td></tr></tbody></table>
          <form v-if="takeoverId" @submit.prevent="run(async () => { if (!reason.trim()) return; await api.takeover(takeoverId, reason.trim()); reason = ''; takeoverId = ''; await refresh() })" class="flex gap-3"><span>{{ allSpaces.find(s => s.space_id === takeoverId)?.name }}</span><input v-model="reason" aria-label="接管原因" placeholder="接管原因（必填）" required /><button>确认接管并记录审计</button></form>
        </section>
        <section><h2>最近审计记录</h2><ul><li v-for="entry in audit" :key="entry.id" class="py-2 break-all">{{ entry.created_at }} · {{ entry.action }} · {{ entry.resource_type }}/{{ entry.resource_id }} · {{ entry.actor_membership_id }}<pre class="whitespace-pre-wrap">{{ JSON.stringify(entry.metadata) }}</pre></li></ul></section>
      </template>
    </fieldset>
  </div>
</template>

<style scoped>
section { border: 1px solid #dedbd5; border-radius: 8px; padding: 20px; }
h2 { font-size: 18px; margin-bottom: 14px; }
input, select, button { border: 1px solid #c9c6c0; border-radius: 4px; padding: 6px 10px; background: white; max-width: 100%; }
button { cursor: pointer; color: #244b85; } button:hover { background: #f0f3f8; }
fieldset:disabled { opacity: .65; } table { width: 100%; margin-top: 12px; text-align: left; } td, th { padding: 8px 4px; border-bottom: 1px solid #eee; }
</style>
