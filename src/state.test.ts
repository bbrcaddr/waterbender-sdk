import { describe, it, expect, beforeEach } from 'vitest'
import { getClient } from './index'
import type { WbClient } from './index'

let rt: WbClient

beforeEach(() => {
  ;(window as any).$wb?.__cleanup?.()
  ;(window as any).$wb = undefined
  document.body.innerHTML = ''
  rt = getClient(window)
})

describe('state store', () => {
  it('get/set/has/remove/keys/all', () => {
    rt.state.set('a', 1)
    rt.state.set('b', 'two')
    expect(rt.state.get('a')).toBe(1)
    expect(rt.state.has('a')).toBe(true)
    expect(rt.state.has('missing')).toBe(false)
    expect(rt.state.keys().sort()).toEqual(['a', 'b'])
    expect(rt.state.all()).toEqual({ a: 1, b: 'two' })

    rt.state.remove('a')
    expect(rt.state.has('a')).toBe(false)
  })

  it('update derives from the previous value', () => {
    rt.state.set('n', 10)
    rt.state.update<number>('n', (prev) => prev + 5)
    expect(rt.state.get('n')).toBe(15)
  })

  it('all() returns a copy, not the live store', () => {
    rt.state.set('a', 1)
    const snap = rt.state.all()
    ;(snap as any).a = 999
    expect(rt.state.get('a')).toBe(1)
  })

  it('watch fires with the new value and can be unsubscribed', () => {
    const seen: unknown[] = []
    const stop = rt.state.watch('k', (v) => seen.push(v))
    rt.state.set('k', 'x')
    rt.state.set('k', 'y')
    stop()
    rt.state.set('k', 'z')
    expect(seen).toEqual(['x', 'y'])
  })

  it('does not notify when the value is unchanged', () => {
    let calls = 0
    rt.state.watch('k', () => calls++)
    rt.state.set('k', 1)
    rt.state.set('k', 1) // no change → no notify
    rt.state.set('k', 2)
    expect(calls).toBe(2)
  })

  it('subscribe observes every key change', () => {
    const events: string[] = []
    const stop = rt.state.subscribe((key, value) => events.push(`${key}=${value}`))
    rt.state.set('a', 1)
    rt.state.set('b', 2)
    stop()
    rt.state.set('c', 3)
    expect(events).toEqual(['a=1', 'b=2'])
  })

  it('reset clears the store and notifies existing keys', () => {
    rt.state.set('a', 1)
    rt.state.set('b', 2)
    const cleared: string[] = []
    rt.state.subscribe((key) => cleared.push(key))
    rt.state.reset()
    expect(rt.state.all()).toEqual({})
    expect(cleared.sort()).toEqual(['a', 'b'])
  })

  it('shares one store with blueprint variables (getVar/setVar)', () => {
    const seen: unknown[] = []
    rt.state.watch('shared', (v) => seen.push(v))
    // A blueprint would call setVar directly — the SDK watcher still fires.
    rt.setVar('shared', 'from-blueprint')
    expect(rt.state.get('shared')).toBe('from-blueprint')
    expect(rt.getVar('shared')).toBe('from-blueprint')
    expect(seen).toEqual(['from-blueprint'])
  })
})
