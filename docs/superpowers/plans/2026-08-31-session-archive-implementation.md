# User Session Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-owned session archiving, a personal-settings archive center grouped by knowledge space, safe restoration, and the supporting space-restore dependency.

**Architecture:** PostgreSQL timestamps are the source of truth for archive and future pin state. The Python service enforces ownership, busy-session, and archived-space rules; the Vue app keeps active chat runtime separate from the archive-center query state. Both repositories are changed, tested, and committed independently.

**Tech Stack:** FastAPI, SQLAlchemy text queries, PostgreSQL, pytest, Vue 3, TypeScript, Pinia, Vue Router, Vitest, Ant Design Vue, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-session-archive-design.md`

## Global Constraints

- A session remains permanently associated with its original `space_id`.
- Archive and restore operations must filter by `tenant_id`, `user_id`, and `session_id`; cross-user access returns `404`.
- `waiting_files` and `answering` sessions return `409 SESSION_BUSY` when archived.
- A session whose space is archived returns `409 SPACE_ARCHIVED` when restored.
- Archive never deletes messages, attachments, citations, memories, or drafts.
- Active session lists always exclude rows whose `archived_at` is non-null.
- Archive and restore are idempotent.
- UI actions use real buttons and remain available to keyboard and touch users.
- Do not stage or overwrite existing unrelated changes in either repository.

---

## File Map

### `arc-knowledge-ai`

- `scripts/migrate.py` — schema columns and partial indexes.
- `app/domain/memory.py` — session archive fields and archived-list projection.
- `app/infrastructure/postgres/repositories/session_repo.py` — active filtering, archive/restore, archived query and count.
- `app/infrastructure/postgres/repositories/chat_turn_repo.py` — authoritative busy-session query.
- `app/infrastructure/postgres/repositories/space_repo.py` — idempotent space restore and space lookup by ID.
- `app/services/session_service.py` — lifecycle policy and domain errors.
- `app/services/space_service.py` — space restore operation.
- `app/api/routers/session.py` — archive, restore, archived-list HTTP contracts.
- `app/api/routers/spaces.py` — space restore endpoint.
- `tests/unit/infrastructure/test_session_archive_repo.py` — repository behavior.
- `tests/unit/services/test_session_archive_service.py` — lifecycle policy.
- `tests/unit/api/test_session_archive_api.py` — session endpoint mapping.
- `tests/unit/api/test_space_restore_api.py` — space restore contract.

### `arc-knowledge-web`

- `src/types/chat.ts` — active and archived session view types.
- `src/api/chat.ts` — session archive/restore/list calls.
- `src/api/spaces.ts` — space restore call.
- `src/stores/chat.ts` — archive active runtime and restore undo.
- `src/stores/archive.ts` — archive-center query, grouping and restore state.
- `src/components/layout/SessionRow.vue` — accessible row actions.
- `src/components/layout/SessionRow.test.ts` — row interaction tests.
- `src/components/layout/AppSidebar.vue` — compose `SessionRow`; remove active-list physical delete.
- `src/components/layout/AppSidebar.test.ts` — integration behavior.
- `src/components/layout/AppHeader.vue` — personal-settings entry.
- `src/router/index.ts` — user-settings nested routes.
- `src/views/settings/UserSettingsLayout.vue` — settings navigation.
- `src/views/settings/ArchivedChatsView.vue` — grouped archive center.
- `src/views/settings/ArchivedChatsView.test.ts` — settings behavior.
- `package.json`, `playwright.config.ts`, `tests/e2e/session-archive.spec.ts`, `.github/workflows/ci.yml` — end-to-end gate.
- `PROGRESS.md`, `../docs/CHANGELOG.md` — delivered behavior and migration notes.

---

### Task 1: Persist Session Archive State and Query It Safely

**Files:**
- Modify: `../arc-knowledge-ai/scripts/migrate.py`
- Modify: `../arc-knowledge-ai/app/domain/memory.py`
- Modify: `../arc-knowledge-ai/app/infrastructure/postgres/repositories/session_repo.py`
- Create: `../arc-knowledge-ai/tests/unit/infrastructure/test_session_archive_repo.py`

**Interfaces:**
- Produces: `Session.archived_at`, `Session.pinned_at`.
- Produces: `ArchivedSession` with `session_id`, `space_id`, `space_name`, `space_status`, `title`, `message_count`, and `archived_at`.
- Produces: `archive(session_id: str, tenant_id: str, user_id: str) -> bool`.
- Produces: `restore(session_id: str, tenant_id: str, user_id: str) -> bool`.
- Produces: `list_archived(tenant_id: str, user_id: str, query: str | None, space_id: str | None, limit: int, offset: int) -> tuple[list[ArchivedSession], int]`.

- [ ] **Step 1: Write failing repository tests**

Create focused fake-result tests that assert the emitted SQL and row mapping:

```python
async def test_active_list_filters_archived_sessions(repo, db):
    await repo.list("tenant-1", "user-1", space_id="space-1")
    sql = db.executed_sql.lower()
    assert "archived_at is null" in sql


async def test_archive_is_owned_and_clears_pin(repo, db):
    db.rowcount = 1
    assert await repo.archive("session-1", "tenant-1", "user-1") is True
    sql, params = db.last_execute
    assert "archived_at = coalesce(archived_at, now())" in sql.lower()
    assert "pinned_at = null" in sql.lower()
    assert params == {
        "session_id": "session-1",
        "tenant_id": "tenant-1",
        "user_id": "user-1",
    }


async def test_archived_query_joins_space_and_counts(repo, db):
    items, total = await repo.list_archived(
        "tenant-1", "user-1", query="上传", space_id=None, limit=50, offset=0
    )
    assert total == 1
    assert items[0].space_name == "产品文档"
    assert items[0].space_status == "active"
```

- [ ] **Step 2: Run the tests and verify red**

Run:

```powershell
cd ..\arc-knowledge-ai
uv run pytest tests/unit/infrastructure/test_session_archive_repo.py -q
```

Expected: failures because the fields and repository methods do not exist.

- [ ] **Step 3: Add the backward-compatible schema**

Add both columns to the fresh `CREATE TABLE sessions` definition and append idempotent upgrades inside `DDL`:

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_active_space
ON sessions (tenant_id, user_id, space_id, updated_at DESC)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_archived_user
ON sessions (tenant_id, user_id, archived_at DESC)
WHERE archived_at IS NOT NULL;
```

- [ ] **Step 4: Add domain fields and the archive projection**

```python
archived_at: datetime | None = None
pinned_at: datetime | None = None


@dataclass(frozen=True)
class ArchivedSession:
    session_id: str
    space_id: str
    space_name: str
    space_status: str
    title: str | None
    message_count: int
    archived_at: datetime
```

Update every session `SELECT` and `_row_to_session()` so these fields always map from database rows.

- [ ] **Step 5: Implement repository lifecycle methods**

Use owned, idempotent updates:

```python
async def archive(self, session_id: str, tenant_id: str, user_id: str) -> bool:
    sql = text("""
        UPDATE sessions
        SET archived_at = COALESCE(archived_at, NOW()), pinned_at = NULL
        WHERE session_id = :session_id
          AND tenant_id = :tenant_id
          AND user_id = :user_id
    """)
    # execute, commit, return rowcount > 0


async def restore(self, session_id: str, tenant_id: str, user_id: str) -> bool:
    sql = text("""
        UPDATE sessions
        SET archived_at = NULL
        WHERE session_id = :session_id
          AND tenant_id = :tenant_id
          AND user_id = :user_id
    """)
```

Add `archived_at IS NULL` to the existing active `list()`. Implement `list_archived()` with an owned session query joined to `spaces`, optional title and space filters, `archived_at DESC`, and a separate `COUNT(*)` query.

- [ ] **Step 6: Run repository tests**

```powershell
uv run pytest tests/unit/infrastructure/test_session_archive_repo.py -q
```

Expected: all tests pass.

- [ ] **Step 7: Commit backend persistence**

```powershell
git add scripts/migrate.py app/domain/memory.py app/infrastructure/postgres/repositories/session_repo.py tests/unit/infrastructure/test_session_archive_repo.py
git commit -m "feat(session): persist archive state"
```

---

### Task 2: Enforce Session Lifecycle Rules and Expose the API

**Files:**
- Modify: `../arc-knowledge-ai/app/infrastructure/postgres/repositories/chat_turn_repo.py`
- Modify: `../arc-knowledge-ai/app/infrastructure/postgres/repositories/space_repo.py`
- Modify: `../arc-knowledge-ai/app/services/session_service.py`
- Modify: `../arc-knowledge-ai/app/api/routers/session.py`
- Create: `../arc-knowledge-ai/tests/unit/services/test_session_archive_service.py`
- Create: `../arc-knowledge-ai/tests/unit/api/test_session_archive_api.py`

**Interfaces:**
- Consumes: repository methods from Task 1.
- Produces: `SessionBusyError`, `SessionSpaceArchivedError`.
- Produces: `SessionService.archive(session_id: str, tenant_id: str, user_id: str) -> bool`.
- Produces: `SessionService.restore(session_id: str, tenant_id: str, user_id: str) -> bool`.
- Produces: `SessionService.list_archived(tenant_id: str, user_id: str, query: str | None, space_id: str | None, limit: int, offset: int) -> ArchivedSessionPage`.
- Produces: `POST /sessions/{id}/archive`, `POST /sessions/{id}/restore`, `GET /sessions/archived`.

- [ ] **Step 1: Write failing service tests**

```python
async def test_archive_rejects_active_turn(service, turn_repo):
    turn_repo.has_active_turn.return_value = True
    with pytest.raises(SessionBusyError):
        await service.archive("session-1", "tenant-1", "user-1")


async def test_restore_rejects_archived_space(service, session_repo, space_repo):
    session_repo.get_by_id.return_value = Session(
        session_id="session-1",
        tenant_id="tenant-1",
        user_id="user-1",
        space_id="space-1",
        archived_at=datetime(2026, 8, 31, tzinfo=timezone.utc),
    )
    space_repo.get_by_id.return_value = Space(
        space_id="space-1",
        tenant_id="tenant-1",
        space_key="product-docs",
        name="产品文档",
        status="archived",
    )
    with pytest.raises(SessionSpaceArchivedError):
        await service.restore("session-1", "tenant-1", "user-1")


async def test_archive_is_idempotent(service, session_repo, turn_repo):
    turn_repo.has_active_turn.return_value = False
    session_repo.archive.return_value = True
    assert await service.archive("session-1", "tenant-1", "user-1") is True
```

- [ ] **Step 2: Run service tests and verify red**

```powershell
uv run pytest tests/unit/services/test_session_archive_service.py -q
```

Expected: missing errors and lifecycle methods.

- [ ] **Step 3: Add the authoritative busy query**

```python
async def has_active_turn(
    self, session_id: str, tenant_id: str, user_id: str
) -> bool:
    sql = text("""
        SELECT EXISTS (
            SELECT 1 FROM messages
            WHERE session_id = :session_id
              AND tenant_id = :tenant_id
              AND user_id = :user_id
              AND role = 'user'
              AND processing_status IN ('waiting_files', 'answering')
        )
    """)
```

Return the scalar boolean.

- [ ] **Step 4: Implement service policy**

Add exact domain errors and methods:

```python
class SessionBusyError(Exception):
    pass


class SessionSpaceArchivedError(Exception):
    pass


async def archive(self, session_id: str, tenant_id: str, user_id: str) -> bool:
    owned = await self._session_repo.get_by_id(session_id, tenant_id, user_id)
    if owned is None:
        return False
    if await self._attachment_repo.has_active_turn(session_id, tenant_id, user_id):
        raise SessionBusyError
    return await self._session_repo.archive(session_id, tenant_id, user_id)
```

Add `space_repo: SpaceRepository | None = None` to the service constructor. Add this repository query before implementing `restore()`:

```python
async def get_by_id(self, tenant_id: str, space_id: str) -> Space | None:
    sql = text("""
        SELECT id, tenant_id, space_key, name, status, created_by, created_at
        FROM spaces
        WHERE id = :space_id AND tenant_id = :tenant_id
    """)
```

`restore()` first loads the owned session, then loads its space, raises `SessionSpaceArchivedError` unless the space is active, and finally calls the repository restore. `list_archived()` delegates with validated pagination.

- [ ] **Step 5: Write failing API tests**

Use FastAPI dependency overrides and a mocked `_service` to assert:

```python
def test_archive_busy_returns_409(client, service):
    service.archive.side_effect = SessionBusyError()
    response = client.post("/sessions/session-1/archive")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "SESSION_BUSY"


def test_archived_list_returns_space_summary(client, service):
    response = client.get("/sessions/archived?query=上传&limit=50&offset=0")
    assert response.status_code == 200
    assert response.json()["items"][0]["space"]["name"] == "产品文档"
```

- [ ] **Step 6: Implement API models and static route order**

Declare `GET /archived` before `GET /{session_id}`. Add:

```python
class SpaceSummaryOut(BaseModel):
    space_id: str
    name: str
    status: str


class ArchivedSessionOut(BaseModel):
    session_id: str
    title: str | None
    message_count: int
    archived_at: datetime
    space: SpaceSummaryOut


class ArchivedSessionPageOut(BaseModel):
    items: list[ArchivedSessionOut]
    total: int
```

Map `SessionBusyError` and `SessionSpaceArchivedError` to structured `409` details. Map false returns to `404`. Archive and restore return `204`.

- [ ] **Step 7: Run backend session tests**

```powershell
uv run pytest tests/unit/services/test_session_archive_service.py tests/unit/api/test_session_archive_api.py -q
```

Expected: all pass.

- [ ] **Step 8: Commit backend lifecycle API**

```powershell
git add app/infrastructure/postgres/repositories/chat_turn_repo.py app/infrastructure/postgres/repositories/space_repo.py app/services/session_service.py app/api/routers/session.py tests/unit/services/test_session_archive_service.py tests/unit/api/test_session_archive_api.py
git commit -m "feat(session): add archive lifecycle API"
```

---

### Task 3: Add the Required Space Restore Operation

**Files:**
- Modify: `../arc-knowledge-ai/app/infrastructure/postgres/repositories/space_repo.py`
- Modify: `../arc-knowledge-ai/app/services/space_service.py`
- Modify: `../arc-knowledge-ai/app/api/routers/spaces.py`
- Create: `../arc-knowledge-ai/tests/unit/api/test_space_restore_api.py`

**Interfaces:**
- Consumes: `SpaceRepository.get_by_id(tenant_id: str, space_id: str) -> Space | None` from Task 2.
- Produces: `SpaceRepository.restore(tenant_id: str, space_id: str) -> bool`.
- Produces: `SpaceService.restore_space(tenant_id: str, space_id: str) -> bool`.
- Produces: `POST /spaces/{space_id}/restore`.

- [ ] **Step 1: Write failing idempotency and isolation tests**

```python
def test_restore_space_returns_204(client, service):
    service.restore_space.return_value = True
    assert client.post("/spaces/space-1/restore").status_code == 204


def test_restore_unknown_space_returns_404(client, service):
    service.restore_space.return_value = False
    assert client.post("/spaces/missing/restore").status_code == 404
```

- [ ] **Step 2: Run the test and verify red**

```powershell
uv run pytest tests/unit/api/test_space_restore_api.py -q
```

- [ ] **Step 3: Implement idempotent restore**

```python
async def restore(self, tenant_id: str, space_id: str) -> bool:
    sql = text("""
        UPDATE spaces SET status = 'active', updated_at = NOW()
        WHERE id = :space_id AND tenant_id = :tenant_id
    """)
```

Add `get_by_id(tenant_id, space_id)` for session restore policy. Service delegates to the repository. Router returns `204` or tenant-scoped `404`.

- [ ] **Step 4: Run the space and session service tests**

```powershell
uv run pytest tests/unit/api/test_space_restore_api.py tests/unit/services/test_session_archive_service.py -q
```

- [ ] **Step 5: Commit space restore**

```powershell
git add app/infrastructure/postgres/repositories/space_repo.py app/services/space_service.py app/api/routers/spaces.py tests/unit/api/test_space_restore_api.py
git commit -m "feat(space): support restoring archived spaces"
```

---

### Task 4: Add Frontend Archive APIs and Separate Store State

**Files:**
- Modify: `src/types/chat.ts`
- Modify: `src/api/chat.ts`
- Modify: `src/api/chat.test.ts`
- Modify: `src/api/spaces.ts`
- Modify: `src/stores/chat.ts`
- Modify: `src/stores/chat.test.ts`
- Create: `src/stores/archive.ts`
- Create: `src/stores/archive.test.ts`

**Interfaces:**
- Produces: `ArchivedSessionVO`, `ArchivedSessionPageVO`.
- Produces: `archiveSession(id)`, `restoreSession(id)`, `listArchivedSessions(params)` API functions.
- Produces: `chatStore.archiveSession(id)`, `chatStore.restoreArchivedSession(id)`, public `isSessionBusy(id)`.
- Produces: `archiveStore.fetchArchived()`, `restore(id)`, `restoreSpace(id)` and `groupedSessions`.

- [ ] **Step 1: Write failing API mapping tests**

```typescript
it('maps archived sessions with their space summary', async () => {
  httpMock.get.mockResolvedValue({
    items: [{
      session_id: 'session-1',
      title: '旧版上传流程',
      message_count: 2,
      archived_at: '2026-08-21T09:30:00Z',
      space: { space_id: 'space-1', name: '产品文档', status: 'active' },
    }],
    total: 1,
  })
  const page = await listArchivedSessions({ query: '', limit: 50, offset: 0 })
  expect(page.items[0].space.name).toBe('产品文档')
})
```

- [ ] **Step 2: Add exact frontend types and API functions**

```typescript
export interface ArchivedSessionVO {
  id: string
  title: string
  message_count: number
  archived_at: string
  space: { space_id: string; name: string; status: 'active' | 'archived' }
}

export const archiveSession = (id: string) =>
  http.post<void>(`/sessions/${id}/archive`)

export const restoreSession = (id: string) =>
  http.post<void>(`/sessions/${id}/restore`)
```

Add `restoreSpace(spaceId)` to `src/api/spaces.ts` using `POST /spaces/{id}/restore`.

- [ ] **Step 3: Run API tests**

```powershell
npm test -- src/api/chat.test.ts
```

- [ ] **Step 4: Write failing chat-store archive tests**

```typescript
it('archives the active session and opens a new-session state', async () => {
  store.sessions = [session('session-a'), session('session-b')]
  await store.switchSession('session-a')
  await store.archiveSession('session-a')
  expect(store.sessions.map(s => s.id)).toEqual(['session-b'])
  expect(store.activeSessionId).toBeNull()
  expect(store.pendingNew).toBe(true)
})


it('keeps a session visible when archive fails', async () => {
  chatApi.archiveSession.mockRejectedValue(new Error('network'))
  await expect(store.archiveSession('session-a')).rejects.toThrow()
  expect(store.sessions.some(s => s.id === 'session-a')).toBe(true)
})
```

- [ ] **Step 5: Implement confirmed-update chat behavior**

Expose `isSessionBusy`. `chatStore.archiveSession(id)` rejects locally when busy, waits for API success, clears the notification, removes the session, and calls `newSession()` only when the archived ID was active. `restoreArchivedSession(id)` calls the API and refetches active sessions only when the restored session belongs to the current space.

- [ ] **Step 6: Write failing archive-store tests**

```typescript
it('groups archived sessions by space in archive-time order', async () => {
  await store.fetchArchived()
  expect(store.groupedSessions[0].space.name).toBe('产品文档')
  expect(store.groupedSessions[0].sessions.map(s => s.id)).toEqual(['newer', 'older'])
})


it('does not remove an archived row when restore fails', async () => {
  chatApi.restoreSession.mockRejectedValue(new Error('SPACE_ARCHIVED'))
  await expect(store.restore('session-1')).rejects.toThrow()
  expect(store.items).toHaveLength(1)
})
```

- [ ] **Step 7: Implement `archiveStore`**

State is limited to `items`, `total`, `loading`, `error`, `query`, `spaceId`, `limit`, and `offset`. `groupedSessions` groups by `space.space_id` and sorts each group by descending `archived_at`. Restore and space restore mutate the list only after server success.

- [ ] **Step 8: Run store tests**

```powershell
npm test -- src/stores/chat.test.ts src/stores/archive.test.ts src/api/chat.test.ts
```

- [ ] **Step 9: Commit frontend data/state layer**

```powershell
git add src/types/chat.ts src/api/chat.ts src/api/chat.test.ts src/api/spaces.ts src/stores/chat.ts src/stores/chat.test.ts src/stores/archive.ts src/stores/archive.test.ts
git commit -m "feat(session): add archive client state"
```

---

### Task 5: Replace Sidebar Deletion with Accessible Archive Actions

**Files:**
- Create: `src/components/layout/SessionRow.vue`
- Create: `src/components/layout/SessionRow.test.ts`
- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/components/layout/AppSidebar.test.ts`

**Interfaces:**
- Consumes: `SessionVO`, notification status, `busy`, and `active` props.
- Produces: `open`, `archive`, and later-compatible `pin` emits.

- [ ] **Step 1: Write failing `SessionRow` accessibility tests**

```typescript
it('exposes archive as a named button and emits the session id', async () => {
  const wrapper = mount(SessionRow, { props: { session, active: false, busy: false } })
  await wrapper.get('[aria-label="归档会话 接入鉴权方案"]').trigger('click')
  expect(wrapper.emitted('archive')).toEqual([['session-1']])
})


it('disables archive while the session is busy', () => {
  const wrapper = mount(SessionRow, { props: { session, active: false, busy: true } })
  expect(wrapper.get('[aria-label^="归档会话"]').attributes('disabled')).toBeDefined()
})
```

- [ ] **Step 2: Implement the focused row component**

Use a real row button for opening and separate real icon buttons for actions. Actions hidden on pointer idle must use both `group-hover` and `group-focus-within`; at coarse pointer sizes expose a labeled “更多” button/menu. Keep `SessionNotificationDot` inside this component.

- [ ] **Step 3: Run `SessionRow` tests**

```powershell
npm test -- src/components/layout/SessionRow.test.ts
```

- [ ] **Step 4: Write the failing sidebar integration test**

```typescript
it('archives without opening a destructive confirmation', async () => {
  const wrapper = mountSidebar()
  await wrapper.get('[aria-label="归档会话 已完成会话"]').trigger('click')
  expect(chatApi.archiveSession).toHaveBeenCalledWith('session-complete')
  expect(Modal.confirm).not.toHaveBeenCalled()
})
```

- [ ] **Step 5: Integrate and add undo notification**

Replace inline session rows with `SessionRow`. Remove the active-list physical-delete button and `confirmDeleteSession`. After successful archive, open one Ant Design notification keyed by session ID with an “撤销” button whose handler calls `chatStore.restoreArchivedSession(id)`.

Do not remove space deletion; it remains a separate space lifecycle action.

- [ ] **Step 6: Run sidebar tests**

```powershell
npm test -- src/components/layout/SessionRow.test.ts src/components/layout/AppSidebar.test.ts
```

- [ ] **Step 7: Commit sidebar interaction**

```powershell
git add src/components/layout/SessionRow.vue src/components/layout/SessionRow.test.ts src/components/layout/AppSidebar.vue src/components/layout/AppSidebar.test.ts
git commit -m "feat(sidebar): archive user sessions"
```

---

### Task 6: Build Personal Settings and the Grouped Archive Center

**Files:**
- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/router/index.ts`
- Create: `src/views/settings/UserSettingsLayout.vue`
- Create: `src/views/settings/ArchivedChatsView.vue`
- Create: `src/views/settings/ArchivedChatsView.test.ts`

**Interfaces:**
- Consumes: `archiveStore.groupedSessions`, `fetchArchived`, `restore`, `restoreSpace`.
- Produces: `/settings/archived-chats` and avatar-menu entry.

- [ ] **Step 1: Write failing archive-center tests**

```typescript
const archivedSession: ArchivedSessionVO = {
  id: 'session-1',
  title: '旧版上传流程',
  message_count: 2,
  archived_at: '2026-08-21T09:30:00Z',
  space: { space_id: 'space-1', name: '产品文档', status: 'active' },
}


it('renders archived sessions grouped by their original space', async () => {
  const wrapper = mountArchivedChats()
  expect(wrapper.text()).toContain('产品文档')
  expect(wrapper.text()).toContain('旧版上传流程')
})


it('requires space restoration before session restoration', async () => {
  const wrapper = mountArchivedChats({ spaceStatus: 'archived' })
  expect(wrapper.get('[aria-label="恢复会话 旧版上传流程"]').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('先恢复空间')
})


it('distinguishes no archives from no search results', async () => {
  const wrapper = mountArchivedChats({ items: [] })
  expect(wrapper.text()).toContain('还没有归档聊天')
  await wrapper.unmount()
  const searched = mountArchivedChats({ items: [archivedSession], query: '' })
  await searched.get('input[type="search"]').setValue('不存在')
  expect(searched.text()).toContain('没有匹配的归档聊天')
})
```

- [ ] **Step 2: Add nested user-settings routes**

```typescript
{
  path: 'settings',
  component: () => import('@/views/settings/UserSettingsLayout.vue'),
  children: [
    { path: '', redirect: { name: 'archived-chats' } },
    {
      path: 'archived-chats',
      name: 'archived-chats',
      component: () => import('@/views/settings/ArchivedChatsView.vue'),
    },
  ],
}
```

Update the header title mapping for `/settings/archived-chats`.

- [ ] **Step 3: Implement settings navigation and avatar entry**

`UserSettingsLayout.vue` renders a compact settings navigation with “已归档聊天” and a nested `RouterView`. Give the avatar trigger `aria-label="用户菜单"`, add “个人设置” to its dropdown, and rename the sidebar `/admin` label from “设置” to “管理配置”.

- [ ] **Step 4: Implement the archive center**

On mount, fetch the first page. Render search, space filter, collapsible space sections, counts, archive time, and restore controls. Active spaces expose “恢复”; archived spaces expose “先恢复空间” or “联系管理员”. Loading uses skeleton rows; request failure uses an inline retry action.

- [ ] **Step 5: Run settings tests and build**

```powershell
npm test -- src/views/settings/ArchivedChatsView.test.ts
npm run build
```

- [ ] **Step 6: Commit personal settings**

```powershell
git add src/components/layout/AppHeader.vue src/components/layout/AppSidebar.vue src/router/index.ts src/views/settings/UserSettingsLayout.vue src/views/settings/ArchivedChatsView.vue src/views/settings/ArchivedChatsView.test.ts
git commit -m "feat(settings): manage archived chats"
```

---

### Task 7: Add End-to-End Coverage, CI Gates, and Delivery Notes

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/session-archive.spec.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `PROGRESS.md`
- Modify: `../docs/CHANGELOG.md`

**Interfaces:**
- Consumes: all user-visible routes and API contracts from Tasks 1–6.
- Produces: a repeatable browser regression test and CI gate.

- [ ] **Step 1: Add a failing browser test with mocked API boundaries**

```typescript
test('archive in sidebar and restore from personal settings', async ({ page }) => {
  await installArchiveApiMocks(page)
  await page.goto('/chat')
  await page.getByLabel('归档会话 接入鉴权方案').click()
  await expect(page.getByText('接入鉴权方案')).toHaveCount(0)

  await page.getByRole('button', { name: /用户菜单/ }).click()
  await page.getByRole('link', { name: '个人设置' }).click()
  await expect(page.getByRole('heading', { name: '已归档聊天' })).toBeVisible()
  await expect(page.getByText('产品文档')).toBeVisible()
  await page.getByRole('button', { name: '恢复会话 接入鉴权方案' }).click()
  await expect(page.getByText('接入鉴权方案')).toHaveCount(0)
})
```

`installArchiveApiMocks` must mock auth-independent `GET /spaces`, active sessions, archive, archived list, restore, and message endpoints with a mutable in-memory array so the test proves state transitions instead of static screenshots.

- [ ] **Step 2: Add Playwright configuration and scripts**

Add to `package.json`:

```json
"test:e2e": "playwright test"
```

Configure `playwright.config.ts` with Chromium, `baseURL: 'http://127.0.0.1:3300'`, and:

```typescript
webServer: {
  command: 'npm run dev -- --host 127.0.0.1',
  url: 'http://127.0.0.1:3300',
  reuseExistingServer: !process.env.CI,
}
```

- [ ] **Step 3: Run the end-to-end test**

```powershell
npx playwright test tests/e2e/session-archive.spec.ts --project=chromium
```

Expected: pass through archive, settings navigation, grouping, and restore.

- [ ] **Step 4: Make CI run unit and browser tests**

After `npm ci`, add:

```yaml
- name: 单元测试
  run: npm test
- name: 安装 Chromium
  run: npx playwright install --with-deps chromium
- name: 端到端测试
  run: npm run test:e2e
- name: 构建
  run: npm run build
```

- [ ] **Step 5: Update delivery documentation**

Add a completed “用户会话归档” section to `PROGRESS.md`. Add one changelog entry listing the migration, lifecycle endpoints, personal settings route, grouped archive center, space restore dependency, and tests. Do not rewrite historical entries.

- [ ] **Step 6: Run complete verification in both repositories**

Backend:

```powershell
cd ..\arc-knowledge-ai
uv run pytest tests/unit -q
```

Frontend:

```powershell
cd ..\arc-knowledge-web
npm test
npm run test:e2e
npm run build
```

Expected: every command exits zero.

- [ ] **Step 7: Commit verification and documentation separately**

Frontend repository:

```powershell
git add package.json playwright.config.ts tests/e2e/session-archive.spec.ts .github/workflows/ci.yml PROGRESS.md
git commit -m "test(session): cover archive lifecycle"
```

Documentation repository or owning worktree:

```powershell
git add docs/CHANGELOG.md
git commit -m "docs: record session archive delivery"
```

If `docs/CHANGELOG.md` is not inside a Git repository, leave it modified and report that no standalone commit was possible.
