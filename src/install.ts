import { RUNTIME_SOURCE } from './runtime-source.js'
import type { WbRuntime, WbClient } from './types.js'

interface RuntimeHost {
  $wb?: WbRuntime
  wb?: WbRuntime
}

function defaultTarget(): RuntimeHost {
  // Prefer the DOM's window when present; fall back to the module global.
  return (typeof window !== 'undefined' ? window : globalThis) as unknown as RuntimeHost
}

/**
 * Installs the Waterbender runtime onto `target` (default: the current window)
 * and returns it. Idempotent: a runtime already carrying the ergonomic API is
 * reused as-is; an older/partial `$wb` is upgraded in place.
 *
 * In a Waterbender app or exported site the runtime is already installed by
 * `runtime.js`, so this simply returns it.
 */
export function installRuntime(target: Window | RuntimeHost = defaultTarget()): WbRuntime {
  const host = target as RuntimeHost
  if (host.$wb && typeof host.$wb.component === 'function') {
    return host.$wb
  }
  // RUNTIME_SOURCE assigns to `this.$wb` / `this.wb`; bind `this` to the target.
  new Function(RUNTIME_SOURCE).call(host)
  return host.$wb as WbRuntime
}

/** Returns the Waterbender client, installing the runtime first if necessary. */
export function getClient(target: Window | RuntimeHost = defaultTarget()): WbClient {
  return installRuntime(target)
}

export { RUNTIME_SOURCE }
