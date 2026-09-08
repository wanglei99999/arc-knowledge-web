const controller = new AbortController()
export function contextSignal() { return controller.signal }
export function invalidateContext() {
  controller.abort()
  document.getElementById('app')?.setAttribute('hidden', '')
}
