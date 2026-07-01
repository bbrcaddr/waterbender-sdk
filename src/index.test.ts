import { describe, it, expect, beforeEach } from 'vitest'
import { wb } from './index'

beforeEach(() => {
  ;(window as any).$wb?.__cleanup?.()
  ;(window as any).$wb = undefined
  document.body.innerHTML = '<div id="lbl"><span>hi</span></div>'
})

describe('default `wb` client', () => {
  it('lazily installs the runtime on first use', () => {
    expect((window as any).$wb).toBeUndefined()
    // touching a property installs the runtime
    expect(typeof wb.component).toBe('function')
    expect((window as any).$wb).toBeDefined()
  })

  it('drives components through the proxy', () => {
    wb.component('lbl').text('changed')
    // A control-less wrapper stores text on itself (like a label).
    expect(document.getElementById('lbl')!.textContent).toBe('changed')
  })

  it('shares state through the proxy', () => {
    wb.state.set('x', 7)
    expect(wb.state.get('x')).toBe(7)
  })

  it('supports the `in` operator via the has trap', () => {
    expect('component' in wb).toBe(true)
    expect('state' in wb).toBe(true)
  })
})
