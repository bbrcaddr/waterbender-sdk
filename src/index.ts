// @waterbender/sdk — the full-JS client for Waterbender apps.
//
// Hook into application state, components, and events from a plain .js file,
// no blueprints required:
//
//   import { wb } from '@waterbender/sdk'
//
//   wb.component('save-btn').onClick(() => {
//     const name = wb.component('name-input').value()
//     wb.state.set('user', name)
//   })
//   wb.state.watch('user', (u) => wb.component('greeting').text('Hi ' + u))
//
// In an attached script the host element id arrives as the `__self__` parameter:
//
//   wb.component(__self__).hide()
//
// `wb` binds lazily to the app-provided runtime (window.$wb). Standalone, it
// installs its own compatible runtime on first use.

import { getClient } from './install'
import type { WbClient } from './types'

export { installRuntime, getClient, RUNTIME_SOURCE } from './install'
export type {
  WbRuntime,
  WbClient,
  ComponentHandle,
  StateStore,
  Unsubscribe,
  EventHandler,
  ChangeHandler,
} from './types'

/**
 * The default client. It is a lazy view over the runtime: the runtime is
 * installed on first property access, so importing this module has no effect
 * until you actually use it (SSR/Node-safe).
 */
export const wb: WbClient = new Proxy({} as WbClient, {
  get(_t, prop) {
    return (getClient() as unknown as Record<PropertyKey, unknown>)[prop]
  },
  has(_t, prop) {
    return prop in (getClient() as unknown as object)
  },
})
