import { describe, it, expect, beforeEach } from 'vitest'
import { installRuntime, getClient, RUNTIME_SOURCE } from './index'

function reset() {
  ;(window as any).$wb?.__cleanup?.()
  ;(window as any).$wb = undefined
  ;(window as any).wb = undefined
  document.body.innerHTML = ''
}

beforeEach(reset)

describe('installRuntime', () => {
  it('installs a runtime with the full API surface', () => {
    const rt = installRuntime(window)
    for (const m of ['getProp', 'setProp', 'setStyle', 'component', 'state', 'on', 'navigate', 'delay']) {
      expect(typeof (rt as any)[m]).toBe(m === 'state' ? 'object' : 'function')
    }
    expect((window as any).$wb).toBe(rt)
    expect((window as any).wb).toBe(rt)
  })

  it('is idempotent — a second call returns the same runtime', () => {
    const a = installRuntime(window)
    a.setVar('keep', 42)
    const b = installRuntime(window)
    expect(b).toBe(a)
    expect(b.getVar('keep')).toBe(42) // not re-initialised
  })

  it('getClient installs on demand and returns the runtime', () => {
    expect((window as any).$wb).toBeUndefined()
    const client = getClient(window)
    expect(typeof client.component).toBe('function')
    expect((window as any).$wb).toBe(client)
  })
})

describe('RUNTIME_SOURCE', () => {
  it('is valid, injectable JavaScript', () => {
    expect(() => new Function(RUNTIME_SOURCE)).not.toThrow()
  })

  it('exposes both the low-level and ergonomic surfaces', () => {
    // low-level (blueprint) methods
    expect(RUNTIME_SOURCE).toContain('ctx.setProp')
    expect(RUNTIME_SOURCE).toContain('ctx.getVar')
    // ergonomic (full-JS) methods
    expect(RUNTIME_SOURCE).toContain('ctx.component')
    expect(RUNTIME_SOURCE).toContain('ctx.state')
    // installs the friendly alias
    expect(RUNTIME_SOURCE).toContain('this.wb = this.$wb;')
  })
})
