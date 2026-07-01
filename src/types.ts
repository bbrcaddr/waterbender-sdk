// Public types for the Waterbender client runtime. These describe the object
// installed by RUNTIME_SOURCE (window.$wb / window.wb), giving full-JS authors
// autocomplete and type-safety without changing what ships at runtime.

export type Unsubscribe = () => void
export type EventHandler = (event: Event) => void
export type ChangeHandler = (event: Event, value: string) => void

/** A chainable handle over a single component (by its element id). */
export interface ComponentHandle {
  readonly id: string
  /** Whether the component's wrapper element is currently in the DOM. */
  exists(): boolean
  /** The wrapper `<div id=...>` element (or null). */
  el(): HTMLElement | null
  /** The interactive control inside the wrapper (input/select/button/…), or the wrapper itself. */
  control(): HTMLElement | null

  get(prop: string): unknown
  set(prop: string, value: unknown): ComponentHandle

  /** Get the text/value; or set it and return the handle for chaining. */
  text(): string
  text(value: unknown): ComponentHandle
  value(): string
  value(value: unknown): ComponentHandle
  checked(): boolean
  checked(value: boolean): ComponentHandle

  style(name: string, value: string | number): ComponentHandle
  style(styles: Record<string, string | number>): ComponentHandle

  move(x: number, y: number): ComponentHandle
  resize(width: number, height: number): ComponentHandle
  show(): ComponentHandle
  hide(): ComponentHandle
  toggle(): ComponentHandle

  /** Bind an event; returns an unsubscribe. */
  on(type: string, handler: EventHandler): Unsubscribe
  onClick(handler: EventHandler): ComponentHandle
  onChange(handler: ChangeHandler): ComponentHandle
  onInput(handler: ChangeHandler): ComponentHandle
  onHoverEnter(handler: EventHandler): ComponentHandle
  onHoverLeave(handler: EventHandler): ComponentHandle
}

/** Reactive key/value application state, shared with blueprint variables. */
export interface StateStore {
  get<T = unknown>(key: string): T
  set(key: string, value: unknown): void
  update<T = unknown>(key: string, updater: (prev: T) => unknown): void
  has(key: string): boolean
  remove(key: string): void
  keys(): string[]
  all(): Record<string, unknown>
  reset(): void
  /** Observe one key; the callback receives the new value. Returns an unsubscribe. */
  watch<T = unknown>(key: string, fn: (value: T, key: string) => void): Unsubscribe
  /** Observe every change. Returns an unsubscribe. */
  subscribe(fn: (key: string, value: unknown) => void): Unsubscribe
}

/** The full client surface installed on `window.$wb` (aliased as `window.wb`). */
export interface WbRuntime {
  // ── Components / DOM ──
  getEl(id: string): HTMLElement | null
  getControl(id: string): HTMLElement | null
  getProp(id: string, prop: string): unknown
  setProp(id: string, prop: string, value: unknown): void
  setStyle(id: string, style: string, value: string | number): void
  setPos(id: string, x: number, y: number): void
  setSize(id: string, width: number, height: number): void
  setVisible(id: string, visible: boolean): void
  toggleVisible(id: string): void
  compare(a: unknown, op: string, b: unknown): boolean
  component(id: string): ComponentHandle
  query(selector: string): Element | null
  queryAll(selector: string): Element[]

  // ── State ──
  getVar<T = unknown>(name: string): T
  setVar(name: string, value: unknown): void
  state: StateStore

  // ── Events / lifecycle ──
  on(id: string, type: string, handler: EventHandler): Unsubscribe
  off(unsub: Unsubscribe): void
  onClick(id: string, handler: EventHandler): void
  onDblClick(id: string, handler: EventHandler): void
  onHoverEnter(id: string, handler: EventHandler): void
  onHoverLeave(id: string, handler: EventHandler): void
  onChange(id: string, handler: ChangeHandler): void
  onKey(key: string | EventHandler, handler?: EventHandler): void
  onReady(fn: () => void): void
  navigate(page: string): void

  // ── Timers ──
  delay(ms: number): Promise<void>
  interval(fn: () => void, ms: number): number
  setInterval(fn: () => void, ms: number): number
  timeout(fn: () => void, ms: number): number

  // ── Misc ──
  log(...args: unknown[]): void
  alert(message: unknown): void
  /** Remove all handlers, timers, and subscriptions registered on this runtime. */
  __cleanup(): void
}

/** Alias — the client and the runtime are the same object. */
export type WbClient = WbRuntime
