# @waterbender/sdk

The full-JS client for [Waterbender](../../) apps. Hook into **application
state**, **components**, and **events** from plain JavaScript — no blueprints
required.

The SDK is a typed view over the same runtime (`window.$wb`) that Waterbender
installs in the Demo and in exported static sites. Anything a blueprint can do,
you can do in code — and the two share **one reactive state store**, so a value
a blueprint sets is observable from a script and vice‑versa.

- [Install](#install)
- [Two ways to use it](#two-ways-to-use-it)
- [Core concepts](#core-concepts)
- [API reference](#api-reference)
  - [Entry points](#entry-points)
  - [Components — `wb.component(id)`](#components--wbcomponentid)
  - [Reading & writing values](#reading--writing-values)
  - [Events](#events)
  - [Reactive state — `wb.state`](#reactive-state--wbstate)
  - [Timers & async](#timers--async)
  - [Navigation](#navigation)
  - [DOM & utilities](#dom--utilities)
  - [Low-level primitives](#low-level-primitives)
  - [Lifecycle & cleanup](#lifecycle--cleanup)
- [Recipes](#recipes)
- [TypeScript](#typescript)

## Install

```bash
npm install @waterbender/sdk
# or: pnpm add @waterbender/sdk   yarn add @waterbender/sdk
```

## Two ways to use it

**1. Attached script (inside the editor / exported site).**
When you attach a `.js` file to a component or window, Waterbender runs it with
the runtime as `ctx` and the host element's id as `__self__`. The global `wb`
(and `window.$wb`) is also available — they are the **same object**.

```js
// attached to a button — toggles itself on click
ctx.component(__self__).onClick(() => ctx.component(__self__).toggle())
```

**2. Bundled import (your own build).**
Import `wb` for full types and autocomplete. It binds lazily to the
app‑provided runtime (`window.$wb`) if present, or installs its own compatible
runtime on first use.

```js
import { wb } from '@waterbender/sdk'

wb.component('save-btn').onClick(() => {
  const name = wb.component('name-input').value()
  wb.state.set('user', name)
})
wb.state.watch('user', (name) => wb.component('greeting').text('Hi ' + name))
```

> `ctx`, the global `wb`, `window.$wb`, and `window.wb` all refer to the same
> runtime instance. Use whichever is convenient.

## Core concepts

- **Everything is addressed by element id.** `wb.component('save-btn')` targets
  the element whose id is `save-btn` — the id you set in the Properties panel.
- **The wrapper vs. the control.** Each component renders as a wrapper
  `<div id="…">` containing the real control (`<input>`, `<button>`, `<select>`,
  `<progress>`, …). Value/text/checked operate on the **control**; style,
  position, size and visibility operate on the **wrapper**.
- **`__self__`** is the id of the element a script is attached to. Reuse the same
  script on many components — each invocation gets its own `__self__`.
- **Shared state.** `wb.state` is the same store as blueprint variables
  (`getVar`/`setVar`). Scripts and blueprints stay in sync automatically.
- **Handlers are cleaned up between Demo runs.** The runtime tracks every
  listener/timer/subscription so re‑running the Demo (or leaving it) tears them
  down — you don't accumulate duplicates.

## API reference

### Entry points

```js
import { wb, getClient, installRuntime, RUNTIME_SOURCE } from '@waterbender/sdk'
```

| Export | Description |
| --- | --- |
| `wb` | The default client — a lazy proxy. The runtime is installed on **first property access**, so importing is side‑effect‑free (SSR/Node‑safe). |
| `getClient(target?)` | Returns the runtime for `target` (default: `window`), installing it if needed. |
| `installRuntime(target?)` | Installs/upgrades the runtime on a window (or a `{}` host) and returns it. Idempotent — an already‑installed runtime is reused. |
| `RUNTIME_SOURCE` | The runtime as injectable **source text** — exactly what Waterbender ships in `assets/runtime.js`. Advanced/embedding use. |

Types are exported too: `WbClient`, `WbRuntime`, `ComponentHandle`,
`StateStore`, `Unsubscribe`, `EventHandler`, `ChangeHandler`.

### Components — `wb.component(id)`

Returns a **chainable handle**. Every mutator returns the handle, so calls
chain; getters return a value.

```js
wb.component('greeting')
  .text('Hello')
  .style({ color: 'tomato', fontSize: 18 })
  .move(20, 40)
  .show()
```

| Method | Returns | Description |
| --- | --- | --- |
| `.id` | `string` | The element id this handle targets. |
| `.exists()` | `boolean` | Whether the wrapper is currently in the DOM. |
| `.el()` | `HTMLElement \| null` | The wrapper `<div>`. |
| `.control()` | `HTMLElement \| null` | The inner control (input/select/button/progress/…), or the wrapper if there is none. |
| `.get(prop)` | `unknown` | Read a property (see [values](#reading--writing-values)). |
| `.set(prop, value)` | handle | Write a property. |
| `.text()` / `.text(v)` | `string` / handle | Get or set the text/value. |
| `.value()` / `.value(v)` | `string` / handle | Alias of `text` — reads a field's `.value`. |
| `.checked()` / `.checked(v)` | `boolean` / handle | Get or set a checkbox/switch/radio. |
| `.style(name, value)` | handle | Set one CSS property (camelCase or kebab‑case). |
| `.style(obj)` | handle | Set many: `{ color: 'red', fontSize: 14 }`. |
| `.move(x, y)` | handle | Set wrapper `left`/`top` (px). |
| `.resize(w, h)` | handle | Set wrapper `width`/`height` (px). |
| `.show()` / `.hide()` / `.toggle()` | handle | Toggle wrapper visibility (`display`). |
| `.on(type, fn)` | `Unsubscribe` | Bind any DOM event; **returns an unsubscribe**. |
| `.onClick(fn)` | handle | Click handler (chainable). |
| `.onChange(fn)` / `.onInput(fn)` | handle | Value‑change handler, `fn(event, value)`. |
| `.onHoverEnter(fn)` / `.onHoverLeave(fn)` | handle | Pointer enter/leave. |

> **Chaining vs. unbinding:** `.onClick(fn)` returns the handle (so you can keep
> chaining) and cannot be individually unbound. If you need to remove a listener
> later, use `.on('click', fn)` and keep the returned `Unsubscribe`.

### Reading & writing values

`get`/`set` (and `text`/`value`/`checked`) resolve against the inner control:

| Prop | Read | Write |
| --- | --- | --- |
| `value` / `text` | `.value` for fields (`input`/`textarea`/`select`/`progress`/`meter`), else `textContent` | same |
| `checked` | `.checked` (checkbox/radio/switch) | `.checked = !!value` |
| anything else | `getAttribute(prop)` | `setAttribute(prop, value)` |

```js
const email = wb.component('email').value()             // read a field
wb.component('agree').checked(true)                     // check a checkbox
wb.component('bar').value(75)                            // drive a <progress> bar
wb.component('title').text('Dashboard')                 // set label/heading text
wb.component('email').set('placeholder', 'you@x.dev')   // set an attribute
```

> `set(prop, value)` uses `setAttribute` for non‑`value`/`checked` props, so it
> can add or change an attribute but not remove one. To flip a boolean DOM
> property like `disabled`, reach for the element: `wb.component('btn').control().disabled = true`.

### Events

Component‑scoped events bind directly to that element (no document‑wide
leakage). There are also global helpers on `wb`:

| Call | Description |
| --- | --- |
| `wb.on(id, type, fn)` | Bind `type` on element `id`; returns an `Unsubscribe`. |
| `wb.off(unsub)` | Call an unsubscribe (same as invoking it). |
| `wb.onClick(id, fn)` / `wb.onDblClick(id, fn)` | Click / double‑click. |
| `wb.onHoverEnter(id, fn)` / `wb.onHoverLeave(id, fn)` | Pointer enter/leave. |
| `wb.onChange(id, fn)` | Value change — `fn(event, value)`, fires live on input. |
| `wb.onKey(key, fn)` | Keydown for a specific `key` (e.g. `'Enter'`). |
| `wb.onKey(fn)` | Keydown for **any** key. |
| `wb.onReady(fn)` | Run when the DOM is ready (or immediately if it already is). |

```js
wb.onKey('Enter', () => wb.component('save-btn').el()?.click())
wb.component('search').onChange((_e, value) => runSearch(value))
```

### Reactive state — `wb.state`

A key/value store shared with blueprint variables. Watchers fire only when a
value actually changes.

| Method | Description |
| --- | --- |
| `get(key)` | Current value (`undefined` if unset). |
| `set(key, value)` | Set a value (notifies watchers if changed). |
| `update(key, fn)` | `set(key, fn(prev))` — great for counters. |
| `has(key)` / `remove(key)` | Presence / deletion. |
| `keys()` / `all()` | All keys / a shallow copy of the whole store. |
| `reset()` | Clear everything (notifies each removed key). |
| `watch(key, fn)` | Observe one key: `fn(value, key)`. Returns an `Unsubscribe`. |
| `subscribe(fn)` | Observe every change: `fn(key, value)`. Returns an `Unsubscribe`. |

```js
wb.state.set('count', 0)
wb.state.watch('count', (n) => wb.component('count-label').text(String(n)))
wb.component('inc').onClick(() => wb.state.update('count', (n = 0) => n + 1))

// low-level equivalents (what blueprints call): wb.getVar / wb.setVar
```

### Timers & async

| Call | Returns | Description |
| --- | --- | --- |
| `wb.delay(ms)` | `Promise<void>` | `await` a pause inside an async handler. |
| `wb.timeout(fn, ms)` | `number` | Tracked `setTimeout`. |
| `wb.interval(fn, ms)` | `number` | Tracked `setInterval`. |

All timers are **tracked** and cleared by [`__cleanup`](#lifecycle--cleanup).
`interval`/`timeout` return the numeric id — stop one early with
`clearInterval(id)` / `clearTimeout(id)`.

```js
const id = wb.interval(() => wb.state.update('ticks', (t = 0) => t + 1), 1000)
// later: clearInterval(id)

wb.component('btn').onClick(async () => {
  wb.component('btn').text('Saving…')
  await wb.delay(500)
  wb.component('btn').text('Saved')
})
```

### Navigation

```js
wb.navigate('about')   // window id OR name
```

In an exported multi‑page site this loads the matching page; in the single‑page
Demo it sets `location.hash` so the previewed window switches.

### DOM & utilities

| Call | Description |
| --- | --- |
| `wb.query(sel)` | `document.querySelector(sel)`. |
| `wb.queryAll(sel)` | `document.querySelectorAll(sel)` as an array. |
| `wb.compare(a, op, b)` | Smart compare with numeric coercion; `op` ∈ `== != > < >= <=`. |
| `wb.log(...args)` | `console.log('[blueprint]', …)`. |
| `wb.alert(message)` | `window.alert` (falls back to `console.log`). |

### Low-level primitives

`wb.component(id)` is sugar over these; use them directly if you prefer:

`getEl(id)`, `getControl(id)`, `getProp(id, prop)`, `setProp(id, prop, value)`,
`setStyle(id, style, value)`, `setPos(id, x, y)`, `setSize(id, w, h)`,
`setVisible(id, visible)`, `toggleVisible(id)`, `getVar(name)`,
`setVar(name, value)`.

### Lifecycle & cleanup

`wb.__cleanup()` removes **all** handlers, timers and state subscriptions
registered on the runtime. Waterbender calls it automatically between Demo runs
and when leaving the Demo, so you normally never call it yourself.

## Recipes

**Counter shared with a blueprint**

```js
// A blueprint elsewhere can read/write the same 'count' via Get/Set Variable.
wb.state.set('count', 0)
wb.state.watch('count', (n) => wb.component('count').text(String(n)))
wb.component('plus').onClick(() => wb.state.update('count', (n = 0) => n + 1))
wb.component('minus').onClick(() => wb.state.update('count', (n = 0) => n - 1))
```

**Form validation**

```js
const emailOk = (v) => /.+@.+\..+/.test(v)
wb.component('email').onInput((_e, v) => {
  const ok = emailOk(v)
  wb.component('email-error').style('display', ok ? 'none' : 'block')
  const submit = wb.component('submit').control()   // the <button> element
  if (submit) submit.disabled = !ok
})
```

**Live search (debounced with `delay`)**

```js
let token = 0
wb.component('q').onChange(async (_e, value) => {
  const mine = ++token
  await wb.delay(250)                 // debounce
  if (mine !== token) return          // a newer keystroke won
  const results = await fetch('/search?q=' + encodeURIComponent(value)).then((r) => r.json())
  wb.component('results').text(results.length + ' results')
})
```

**A reusable attached script (`__self__`)**

```js
// Attach to any component: fades it out on hover, back on leave.
ctx.component(__self__)
  .onHoverEnter(() => ctx.component(__self__).style('opacity', 0.5))
  .onHoverLeave(() => ctx.component(__self__).style('opacity', 1))
```

**Standalone (outside a Waterbender app)**

```js
import { installRuntime } from '@waterbender/sdk'
const wb = installRuntime(window)   // installs $wb on this window
wb.component('root').text('Hello from the SDK')
```

## TypeScript

Fully typed. `text()`/`value()`/`checked()`/`style()` are overloaded — no
argument reads (returns a value), an argument writes (returns the handle):

```ts
import { wb, type ComponentHandle } from '@waterbender/sdk'

const h: ComponentHandle = wb.component('name')
const current: string = h.value()          // getter
h.value('Ada').style({ color: 'green' })    // setters chain
wb.state.get<number>('count')               // generic read
```

## License

[MIT](LICENSE)
