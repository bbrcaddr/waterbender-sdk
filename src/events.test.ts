import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getClient } from './index'
import type { WbClient } from './index'

let rt: WbClient

beforeEach(() => {
  ;(window as any).$wb?.__cleanup?.()
  ;(window as any).$wb = undefined
  document.body.innerHTML = '<div id="a"></div><input id="b" />'
  rt = getClient(window)
})

describe('events & lifecycle', () => {
  it('on() returns an unsubscribe', () => {
    let n = 0
    const stop = rt.on('a', 'click', () => n++)
    const el = document.getElementById('a')!
    el.click()
    expect(n).toBe(1)
    stop()
    el.click()
    expect(n).toBe(1)
    // off() also works with an unsubscribe
    let m = 0
    const stop2 = rt.on('a', 'click', () => m++)
    rt.off(stop2)
    el.click()
    expect(m).toBe(0)
  })

  it('onReady fires when the document is already parsed', () => {
    let ready = false
    rt.onReady(() => { ready = true })
    expect(ready).toBe(true) // jsdom document is "complete" during tests
  })

  it('onKey filters by key', () => {
    const hits: string[] = []
    rt.onKey('Enter', () => hits.push('enter'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(hits).toEqual(['enter'])
  })

  it('navigate sets the location hash', () => {
    rt.navigate('about')
    expect(window.location.hash).toBe('#about')
  })

  it('query / queryAll reach into the DOM', () => {
    expect(rt.query('#a')).toBe(document.getElementById('a'))
    expect(rt.queryAll('div').length).toBe(1)
  })
})

describe('timers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('interval fires repeatedly and is cleared by __cleanup', () => {
    let ticks = 0
    rt.interval(() => ticks++, 100)
    vi.advanceTimersByTime(350)
    expect(ticks).toBe(3)
    rt.__cleanup()
    vi.advanceTimersByTime(1000)
    expect(ticks).toBe(3) // frozen
  })

  it('timeout fires once and is tracked for cleanup', () => {
    let fired = 0
    rt.timeout(() => fired++, 200)
    vi.advanceTimersByTime(199)
    expect(fired).toBe(0)
    vi.advanceTimersByTime(1)
    expect(fired).toBe(1)
  })

  it('a pending timeout does not fire after __cleanup', () => {
    let fired = 0
    rt.timeout(() => fired++, 200)
    rt.__cleanup()
    vi.advanceTimersByTime(1000)
    expect(fired).toBe(0)
  })

  it('delay resolves after the given time', async () => {
    let done = false
    const p = rt.delay(50).then(() => { done = true })
    vi.advanceTimersByTime(50)
    await p
    expect(done).toBe(true)
  })
})
