// The canonical Waterbender client runtime, authored as source text because it
// is injected verbatim into generated apps (Demo, and the static-site export's
// `assets/runtime.js`). It installs `this.$wb` — the object every compiled
// blueprint AND every full-JS script talks to — and aliases it as `this.wb`.
//
// This is the single source of truth: the editor app re-exports RUNTIME_SOURCE
// from `generateRuntimeHelpers()`, so what ships in an exported site is exactly
// what this SDK's typed API (`installRuntime`/`getClient`/`wb`) describes.
//
// Two layers live here:
//   - low-level primitives (getProp/setProp/setStyle/onClick/getVar/…) — the
//     surface compiled blueprints depend on; kept byte-for-byte stable.
//   - an ergonomic layer for humans writing full-JS: reactive `state`,
//     `component(id)` handles, a generic `on`, timers and `onReady`.

export const RUNTIME_SOURCE = `
// ── Waterbender Client Runtime ──
this.$wb = this.$wb || {};
(function(ctx) {
  const vars = {};
  const els = {};

  ctx.getEl = (id) => {
    // Re-resolve if the cached node left the DOM (e.g. Demo re-render).
    if (!els[id] || !els[id].isConnected) els[id] = document.getElementById(id);
    return els[id];
  };

  // The component wrapper is <div id=...>; the real control (button/input/
  // select/checkbox) is its descendant. Value/text/checked operate on that
  // control, while style/position/size/visibility operate on the wrapper.
  ctx.getControl = (id) => {
    const el = ctx.getEl(id);
    if (!el) return null;
    return el.querySelector('input, select, textarea, button, progress, meter') || el;
  };

  // Elements whose "value"/"text" lives on a DOM .value property rather than in
  // textContent: form fields plus <progress>/<meter> (so a progress bar's value
  // can be driven at runtime by a blueprint or full-JS script).
  const hasValueProp = (tag) =>
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'PROGRESS' || tag === 'METER';

  ctx.getProp = (id, prop) => {
    const el = ctx.getControl(id);
    if (!el) return undefined;
    const tag = el.tagName;
    if (prop === 'checked') return el.checked ?? false;
    if (prop === 'value' || prop === 'text') {
      return hasValueProp(tag) ? (el.value ?? '') : (el.textContent ?? '');
    }
    return el.getAttribute(prop) ?? '';
  };

  ctx.setProp = (id, prop, val) => {
    const el = ctx.getControl(id);
    if (!el) return;
    const tag = el.tagName;
    if (prop === 'checked') el.checked = !!val;
    else if (prop === 'value' || prop === 'text') {
      if (hasValueProp(tag)) el.value = String(val);
      else el.textContent = String(val);
    } else el.setAttribute(prop, String(val));
  };

  ctx.setStyle = (id, style, val) => {
    const el = ctx.getEl(id);
    if (!el) return;
    // setProperty needs kebab-case; accept camelCase too (fontSize -> font-size).
    const prop = String(style).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    el.style.setProperty(prop, String(val));
  };

  // Smart comparison: coerce both operands to numbers when both look numeric
  // (a field value is a string, so "5" > 3 would otherwise compare as strings).
  ctx.compare = (a, op, b) => {
    const na = Number(a), nb = Number(b);
    const numeric = a !== '' && b !== '' && a != null && b != null && !isNaN(na) && !isNaN(nb);
    const x = numeric ? na : a;
    const y = numeric ? nb : b;
    switch (op) {
      case '==': return x === y;
      case '!=': return x !== y;
      case '>': return x > y;
      case '<': return x < y;
      case '>=': return x >= y;
      case '<=': return x <= y;
      default: return false;
    }
  };

  ctx.setPos = (id, x, y) => {
    const el = ctx.getEl(id);
    if (!el) return;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  };

  ctx.setSize = (id, w, h) => {
    const el = ctx.getEl(id);
    if (!el) return;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  };

  ctx.setVisible = (id, visible) => {
    const el = ctx.getEl(id);
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  };

  ctx.toggleVisible = (id) => {
    const el = ctx.getEl(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? '' : 'none';
  };

  // ── Reactive application state ──
  // Blueprint variables and full-JS state are the SAME store, so a value set by
  // a blueprint is observable from a script and vice versa. getVar/setVar are
  // the legacy primitives; ctx.state is the ergonomic, subscribable view.
  const stateAny = [];
  const stateKeyed = {};
  const notifyState = (name) => {
    for (const fn of stateAny.slice()) { try { fn(name, vars[name]); } catch (e) {} }
    const list = stateKeyed[name];
    if (list) for (const fn of list.slice()) { try { fn(vars[name], name); } catch (e) {} }
  };

  ctx.getVar = (name) => vars[name];
  ctx.setVar = (name, val) => {
    const changed = vars[name] !== val;
    vars[name] = val;
    if (changed) notifyState(name);
  };

  ctx.state = {
    get: (name) => vars[name],
    set: (name, val) => { ctx.setVar(name, val); },
    update: (name, fn) => { ctx.setVar(name, fn(vars[name])); },
    has: (name) => Object.prototype.hasOwnProperty.call(vars, name),
    remove: (name) => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) { delete vars[name]; notifyState(name); }
    },
    keys: () => Object.keys(vars),
    all: () => Object.assign({}, vars),
    reset: () => {
      const ks = Object.keys(vars);
      for (const k of ks) delete vars[k];
      for (const k of ks) notifyState(k);
    },
    watch: (name, fn) => {
      (stateKeyed[name] = stateKeyed[name] || []).push(fn);
      return () => {
        const list = stateKeyed[name];
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      };
    },
    subscribe: (fn) => {
      stateAny.push(fn);
      return () => { const i = stateAny.indexOf(fn); if (i >= 0) stateAny.splice(i, 1); };
    },
  };

  ctx.delay = (ms) => new Promise((r) => {
    // Tracked so __cleanup can clear a pending delay between Demo sessions.
    const id = setTimeout(r, ms);
    (ctx.__timeouts = ctx.__timeouts || []).push(id);
  });
  ctx.navigate = (page) => { window.location.hash = page; };

  // Tracked timers so __cleanup can clear them — otherwise every Demo re-run
  // would spawn another live timer that fires forever.
  ctx.__intervals = [];
  ctx.__timeouts = [];
  ctx.setInterval = (fn, ms) => {
    const id = setInterval(fn, ms);
    ctx.__intervals.push(id);
    return id;
  };
  ctx.interval = (fn, ms) => ctx.setInterval(fn, ms);
  ctx.timeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    ctx.__timeouts.push(id);
    return id;
  };

  ctx.log = (...args) => { try { console.log('[blueprint]', ...args); } catch (e) {} };
  ctx.alert = (msg) => {
    try { if (typeof window !== 'undefined' && window.alert) window.alert(String(msg)); else console.log('[alert]', msg); }
    catch (e) { console.log('[alert]', msg); }
  };

  // Event handlers — window.__wb_self__ is resolved by the Demo replacer (or the
  // static-site loader's __self__ param) to the attached component's id. DOM
  // events bind directly to that element, so each handler only fires for its own
  // component. Track them for cleanup between Demo sessions.
  ctx.__handlers = [];
  const add = (target, type, fn) => {
    if (!target) return;
    target.addEventListener(type, fn);
    ctx.__handlers.push({ target, type, fn });
  };
  const bind = (id, type, fn) => add(ctx.getEl(id), type, fn);
  ctx.onClick = (id, fn) => { bind(id, 'click', (e) => fn(e)); };
  ctx.onDblClick = (id, fn) => { bind(id, 'dblclick', (e) => fn(e)); };
  ctx.onHoverEnter = (id, fn) => { bind(id, 'mouseenter', (e) => fn(e)); };
  ctx.onHoverLeave = (id, fn) => { bind(id, 'mouseleave', (e) => fn(e)); };
  ctx.onChange = (id, fn) => {
    // Bind only 'input' — it fires live for text/range/select/checkbox in modern
    // browsers; also binding 'change' double-fired the handler on blur.
    bind(id, 'input', (e) => fn(e, e.target && e.target.value));
  };
  ctx.onKey = (key, fn) => {
    if (typeof key === 'function') { fn = key; key = ''; }
    add(document, 'keydown', (e) => { if (!key || e.key === key) fn(e); });
  };

  // Generic per-element binding that returns an unsubscribe (used by component
  // handles and by full-JS code that wants fine-grained control).
  ctx.on = (id, type, fn) => {
    const el = ctx.getEl(id);
    if (!el) return () => {};
    const wrapped = (e) => fn(e);
    el.addEventListener(type, wrapped);
    ctx.__handlers.push({ target: el, type, fn: wrapped });
    return () => {
      el.removeEventListener(type, wrapped);
      const i = ctx.__handlers.findIndex((h) => h.fn === wrapped);
      if (i >= 0) ctx.__handlers.splice(i, 1);
    };
  };
  ctx.off = (unsub) => { if (typeof unsub === 'function') unsub(); };

  ctx.query = (sel) => document.querySelector(sel);
  ctx.queryAll = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));
  ctx.onReady = (fn) => {
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => fn());
    } else fn();
  };

  // Ergonomic, chainable handle over a single component.
  ctx.component = (id) => {
    const h = {
      id: id,
      exists: () => !!ctx.getEl(id),
      el: () => ctx.getEl(id),
      control: () => ctx.getControl(id),
      get: (p) => ctx.getProp(id, p),
      set: (p, v) => { ctx.setProp(id, p, v); return h; },
      text: (v) => (v === undefined ? ctx.getProp(id, 'text') : (ctx.setProp(id, 'text', v), h)),
      value: (v) => (v === undefined ? ctx.getProp(id, 'value') : (ctx.setProp(id, 'value', v), h)),
      checked: (v) => (v === undefined ? ctx.getProp(id, 'checked') : (ctx.setProp(id, 'checked', v), h)),
      style: (name, v) => {
        if (name && typeof name === 'object') { for (const k in name) ctx.setStyle(id, k, name[k]); }
        else { ctx.setStyle(id, name, v); }
        return h;
      },
      move: (x, y) => { ctx.setPos(id, x, y); return h; },
      resize: (w, hh) => { ctx.setSize(id, w, hh); return h; },
      show: () => { ctx.setVisible(id, true); return h; },
      hide: () => { ctx.setVisible(id, false); return h; },
      toggle: () => { ctx.toggleVisible(id); return h; },
      on: (type, fn) => ctx.on(id, type, fn),
      onClick: (fn) => { ctx.onClick(id, fn); return h; },
      onChange: (fn) => { ctx.onChange(id, fn); return h; },
      onInput: (fn) => { ctx.onChange(id, fn); return h; },
      onHoverEnter: (fn) => { ctx.onHoverEnter(id, fn); return h; },
      onHoverLeave: (fn) => { ctx.onHoverLeave(id, fn); return h; },
    };
    return h;
  };

  // Cleanup all registered handlers, timers, and state subscriptions.
  ctx.__cleanup = () => {
    for (const h of ctx.__handlers) {
      if (h.target) h.target.removeEventListener(h.type, h.fn);
    }
    ctx.__handlers = [];
    for (const id of ctx.__intervals) clearInterval(id);
    ctx.__intervals = [];
    for (const id of ctx.__timeouts) clearTimeout(id);
    ctx.__timeouts = [];
    stateAny.length = 0;
    for (const k in stateKeyed) delete stateKeyed[k];
  };
})(this.$wb);
this.wb = this.$wb;
`.trim()
