import { describe, it, expect, beforeEach } from 'vitest'
import { getClient } from './index'
import type { WbClient } from './index'

let rt: WbClient

beforeEach(() => {
  ;(window as any).$wb?.__cleanup?.()
  ;(window as any).$wb = undefined
  rt = getClient(window)
  // Mirror the DemoPreview / exported-site DOM: a wrapper <div id> with the
  // interactive control as a descendant.
  document.body.innerHTML = `
    <div id="btn"><button>Old</button></div>
    <div id="field"><input /></div>
    <div id="check"><input type="checkbox" /></div>
    <div id="box"><span>hi</span></div>`
})

describe('ComponentHandle', () => {
  it('reads and writes text on the inner control without destroying it', () => {
    const h = rt.component('btn')
    expect(h.text()).toBe('Old')
    const chained = h.text('New')
    expect(chained).toBe(h) // mutators chain
    expect(document.querySelector('#btn button')).not.toBeNull()
    expect(document.querySelector('#btn button')!.textContent).toBe('New')
  })

  it('reads and writes an input value', () => {
    const input = document.querySelector('#field input') as HTMLInputElement
    rt.component('field').value('typed')
    expect(input.value).toBe('typed')
    expect(rt.component('field').value()).toBe('typed')
  })

  it('reads and writes a checkbox checked state', () => {
    const box = document.querySelector('#check input') as HTMLInputElement
    expect(rt.component('check').checked()).toBe(false)
    rt.component('check').checked(true)
    expect(box.checked).toBe(true)
    expect(rt.component('check').checked()).toBe(true)
  })

  it('generic get/set delegates to the runtime', () => {
    rt.component('btn').set('text', 'Z')
    expect(rt.component('btn').get('text')).toBe('Z')
  })

  it('applies styles from a name/value pair and from an object', () => {
    rt.component('box').style('background', 'red')
    expect((document.getElementById('box') as HTMLElement).style.background).toBe('red')

    rt.component('box').style({ color: 'blue' })
    expect((document.getElementById('box') as HTMLElement).style.color).toBe('blue')
  })

  it('moves and resizes the wrapper element', () => {
    rt.component('box').move(12, 34).resize(100, 50)
    const el = document.getElementById('box') as HTMLElement
    expect(el.style.left).toBe('12px')
    expect(el.style.top).toBe('34px')
    expect(el.style.width).toBe('100px')
    expect(el.style.height).toBe('50px')
  })

  it('show/hide/toggle drive display', () => {
    const el = document.getElementById('box') as HTMLElement
    rt.component('box').hide()
    expect(el.style.display).toBe('none')
    rt.component('box').show()
    expect(el.style.display).toBe('')
    rt.component('box').toggle()
    expect(el.style.display).toBe('none')
  })

  it('onClick binds to the element and fires', () => {
    let clicks = 0
    rt.component('btn').onClick(() => clicks++)
    document.querySelector('#btn button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(clicks).toBe(1)
  })

  it('onChange reports the new value', () => {
    const input = document.querySelector('#field input') as HTMLInputElement
    let captured = ''
    rt.component('field').onChange((_e, value) => { captured = value })
    input.value = 'hello'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(captured).toBe('hello')
  })

  it('on(type) returns an unsubscribe that removes the listener', () => {
    let count = 0
    const stop = rt.component('box').on('click', () => count++)
    const el = document.getElementById('box')!
    el.click()
    stop()
    el.click()
    expect(count).toBe(1)
  })

  it('exists/el/control reflect the DOM', () => {
    expect(rt.component('btn').exists()).toBe(true)
    expect(rt.component('nope').exists()).toBe(false)
    expect(rt.component('btn').el()).toBe(document.getElementById('btn'))
    expect(rt.component('btn').control()!.tagName).toBe('BUTTON')
  })
})
