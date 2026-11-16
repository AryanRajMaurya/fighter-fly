// fighter · fly — a standalone rebuild of the UI8 Forge "fighter" scene.
//
// The renderer (src/lib/*) is the original scene code, unchanged. This file is the
// harness around it: the canvas loop, the keyboard / pointer / touch / gamepad input,
// the line of help, and the control panel that the fragment's host used to provide.

import { createScene, DEFAULT_PARAMS } from './lib/scene.ts'
import { createFlameLayer } from './lib/flame-layer.ts'
import { STORY } from './story.ts'

const wrap = document.getElementById('scene') as HTMLDivElement
const canvas = document.getElementById('view') as HTMLCanvasElement
const fire = document.getElementById('fire') as HTMLCanvasElement
const hintEl = document.getElementById('hint') as HTMLParagraphElement
const hintWrap = document.getElementById('hint-wrap') as HTMLDivElement
const panel = document.getElementById('panel') as HTMLDivElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

// ── settings ────────────────────────────────────────────────────────────
// The scene's own defaults, overridden by the values the original page shipped with.
const params: Record<string, unknown> = { ...DEFAULT_PARAMS }
const PUBLISHED: Record<string, unknown> = {
  altitude: 110,
  jetScale: 0.6,
  intro: false,
  flameStyle: 'realistic',
  afterburner: 1,
}
for (const k of Object.keys(PUBLISHED)) params[k] = PUBLISHED[k]

// these three are props of the component in the original, not scene settings
let pixelSize = 3
let showHint = true
let touchControls: 'auto' | 'on' | 'off' = 'auto'

let noFire = false // true where WebGL cannot draw the smooth flames
let fingerScreen = false
let boosting = false
let padInput = ''

const scene = createScene(params)
const held = new Set<string>()
let steerPtr: any = null
let scale = 4
let layer: ReturnType<typeof createFlameLayer> = null
let fireDead = false
let image: ImageData | null = null
let hintTimer = 0
let hintOn = true
let hintMode = scene.view

const KEYS = Object.keys(DEFAULT_PARAMS)
const FLY: Record<string, string> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'boost', ShiftRight: 'boost',
  TouchBoost: 'boost',
}

const padKind = (id: string) => (/054c|dualsense|dualshock|playstation/i.test(id) ? 'ps' : 'pad')
const viewOf = (v: string) => (v === 'cockpit' ? 'cockpit' : v === 'chase' ? 'chase' : 'top')

const hintFor = (view: string, input: string, stick: boolean) => {
  const next = view === 'top' ? 'chase view' : view === 'chase' ? 'the cockpit' : 'overhead'
  const upDown = stick ? 'Down climbs, up dives' : 'Up climbs, down dives'
  if (input === 'ps' || input === 'pad') {
    const [roll, thrust, change] = input === 'ps' ? ['✕', 'R2', '△'] : ['A', 'RT', 'Y']
    const fly = view === 'top' ? 'Left stick to fly' : `Left stick to turn · ${upDown}`
    return `${fly} · ${roll} to roll · Hold ${thrust} for the thrusters · ${change} for ${next}`
  }
  const fingers = input === 'touch'
  const steerWord = view === 'top' ? `${fingers ? 'Touch' : 'Move'} to steer` : `${fingers ? 'Touch' : 'Point'} to turn · ${upDown}`
  return fingers
    ? `${steerWord} · Tap to roll · Hold Boost for the thrusters · View for ${next}`
    : `${steerWord} · Click to roll · Hold to fire the thrusters · Space for ${next}`
}

const revealHint = (mode: string, seconds: number) => {
  hintMode = mode
  hintOn = true
  paintHint()
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => { hintOn = false; paintHint() }, seconds * 1000)
}

const buttons = () => touchControls === 'on' || (touchControls === 'auto' && fingerScreen)
const paintHint = () => {
  const mode = viewOf(String(params.view))
  hintWrap.style.opacity = hintOn && showHint ? '1' : '0'
  hintWrap.className = `hint-wrap ${buttons() || mode === 'cockpit' ? 'top' : 'bottom'}`
  hintEl.textContent = hintFor(mode, padInput || (buttons() ? 'touch' : 'pointer'), Boolean(params.invertY))
}

// ── layout ──────────────────────────────────────────────────────────────
const layout = () => {
  const cw = wrap.clientWidth
  const ch = wrap.clientHeight
  if (!cw || !ch) return
  const auto = Math.min(12, Math.max(2, Math.round(Math.sqrt((cw * ch) / 100000))))
  const px = pixelSize > 0 ? Math.round(pixelSize) : auto
  const lw = Math.ceil(cw / px)
  const lh = Math.ceil(ch / px)
  if (canvas.width !== lw || canvas.height !== lh) {
    canvas.width = lw
    canvas.height = lh
    scene.resize(lw, lh)
    image = null
  }
  canvas.style.width = lw * px + 'px'
  canvas.style.height = lh * px + 'px'
  canvas.style.left = Math.round((cw - lw * px) / 2) + 'px'
  canvas.style.top = Math.round((ch - lh * px) / 2) + 'px'
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const fw = Math.round(lw * px * dpr)
  const fh = Math.round(lh * px * dpr)
  if (fire.width !== fw || fire.height !== fh) { fire.width = fw; fire.height = fh }
  fire.style.width = canvas.style.width
  fire.style.height = canvas.style.height
  fire.style.left = canvas.style.left
  fire.style.top = canvas.style.top
  scale = px
}

// ── the loop ────────────────────────────────────────────────────────────
const pad = { turn: 0, climb: 0, thrust: 0, roll: false, view: false, off: false }
let raf = 0
let last = performance.now()

function sendKeys() {
  let turn = 0, climb = 0, boost = false
  held.forEach((code) => {
    const k = FLY[code]
    if (k === 'left') turn -= 1
    else if (k === 'right') turn += 1
    else if (k === 'up') climb += 1
    else if (k === 'down') climb -= 1
    else if (k === 'boost') boost = true
  })
  scene.setKeys(turn + pad.turn, climb + pad.climb, boost, pad.thrust)
}

const readPad = () => {
  if (pad.off || !navigator.getGamepads) return
  let gp: Gamepad | null = null
  try {
    const all = navigator.getGamepads()
    for (let i = 0; i < all.length; i++) {
      const g = all[i]
      if (g && g.connected && (!gp || (g.mapping === 'standard' && (gp as Gamepad).mapping !== 'standard'))) gp = g
    }
  } catch {
    pad.off = true
    return
  }
  let turn = 0, climb = 0, thrust = 0, roll = false, view = false
  if (gp) {
    const g = gp as Gamepad
    const dead = (v: number) => (Math.abs(v) < 0.16 ? 0 : (Math.sign(v) * (Math.abs(v) - 0.16)) / 0.84)
    const button = (i: number) => {
      const b = g.buttons[i]
      return b ? (b.value || (b.pressed ? 1 : 0)) : 0
    }
    turn = dead(g.axes[0] || 0) + (button(15) > 0.5 ? 1 : 0) - (button(14) > 0.5 ? 1 : 0)
    climb = -dead(g.axes[1] || 0) + (button(12) > 0.5 ? 1 : 0) - (button(13) > 0.5 ? 1 : 0)
    thrust = button(7) < 0.06 ? 0 : button(7)
    roll = button(0) > 0.5
    view = button(3) > 0.5
    if (turn || climb || thrust || roll || view) {
      if (padInput !== padKind(g.id)) { padInput = padKind(g.id); revealHint(scene.view, 7) }
    }
  }
  if (roll && !pad.roll) scene.roll()
  if (view && !pad.view) { scene.toggleView(); revealHint(scene.view, 7) }
  const changed = turn !== pad.turn || climb !== pad.climb || thrust !== pad.thrust
  pad.turn = turn; pad.climb = climb; pad.thrust = thrust; pad.roll = roll; pad.view = view
  if (changed || turn !== 0 || climb !== 0) sendKeys()
}

const frame = (now: number) => {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now
  if (!scene.width) return
  readPad()
  scene.step(dt)
  const bytes = scene.render()
  if (!image) image = new ImageData(bytes, scene.width, scene.height)
  ctx.putImageData(image, 0, 0)
  const flames = scene.flames
  if (fire && flames.count > 0 && !layer && !fireDead) {
    layer = createFlameLayer(fire)
    if (!layer) { fireDead = true; noFire = true; params.flameStyle = 'pixel'; }
  }
  if (fire && layer) layer.draw(flames.count, flames.data, fire.width / scene.width, now / 1000)
}

// ── keyboard ────────────────────────────────────────────────────────────
const typing = (e: Event) => {
  const el = e.target as HTMLElement | null
  return !!el && el !== wrap && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) || el.isContentEditable)
}
const onKey = (e: KeyboardEvent) => {
  if (typing(e)) return
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault()
    if (e.repeat) return
    scene.toggleView()
    revealHint(scene.view, 7)
    return
  }
  if (FLY[e.code] && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (e.code.startsWith('Arrow')) e.preventDefault()
    held.add(e.code)
    sendKeys()
  }
}
const onKeyUp = (e: KeyboardEvent) => { if (held.delete(e.code)) sendKeys() }
const onBlur = () => { held.clear(); sendKeys(); boosting = false; paintBoost() }

// ── pointer / touch ─────────────────────────────────────────────────────
const toScene = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect()
  return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]
}
const byFinger = (e: PointerEvent) => touchControls !== 'off' && e.pointerType === 'touch'
const endFinger = (e: PointerEvent, tap: boolean) => {
  const s = steerPtr
  if (!s || s.id !== e.pointerId) return
  steerPtr = null
  if (tap && !s.moved && performance.now() - s.t < 260) { scene.press(); scene.release() }
  scene.pointerLeave()
}

const onPointerMove = (e: PointerEvent) => {
  if (byFinger(e)) {
    const s = steerPtr
    if (!s || s.id !== e.pointerId) return
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12) s.moved = true
  }
  padInput = ''
  const [x, y] = toScene(e)
  scene.pointerMove(x, y)
}
const onPointerDown = (e: PointerEvent) => {
  padInput = ''
  const [x, y] = toScene(e)
  if (byFinger(e)) {
    if (!fingerScreen) { fingerScreen = true; document.body.classList.add('touch'); paintHint() }
    if (steerPtr) return
    steerPtr = { id: e.pointerId, t: performance.now(), x: e.clientX, y: e.clientY, moved: false }
    scene.pointerMove(x, y)
  } else {
    scene.pointerMove(x, y)
    scene.press()
  }
  wrap.focus({ preventScroll: true })
  if (!hintTimer) hintTimer = window.setTimeout(() => { hintOn = false; paintHint() }, 9000)
}
const onPointerUp = (e: PointerEvent) => { if (byFinger(e)) endFinger(e, true); else scene.release() }
const onPointerLeave = (e: PointerEvent) => { if (byFinger(e)) endFinger(e, false); else scene.pointerLeave() }
const mine = (e: Event) => e.stopPropagation()

function paintBoost() {
  const b = document.getElementById('boost') as HTMLButtonElement
  if (!b) return
  b.setAttribute('aria-pressed', String(boosting))
  b.style.backgroundColor = boosting ? String(params.accentColor) : ''
  b.classList.toggle('on', boosting)
}
const boostOn = (e: PointerEvent) => {
  e.stopPropagation()
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* already gone */ }
  held.add('TouchBoost')
  sendKeys()
  boosting = true
  paintBoost()
}
const boostOff = (e: PointerEvent) => {
  e.stopPropagation()
  held.delete('TouchBoost')
  sendKeys()
  boosting = false
  paintBoost()
  wrap.focus({ preventScroll: true })
}
function nextView() {
  scene.toggleView()
  revealHint(scene.view, 7)
  wrap.focus({ preventScroll: true })
}

// ── the panel ───────────────────────────────────────────────────────────
function apply(next: Record<string, unknown>) {
  Object.assign(params, next)
  if (noFire) params.flameStyle = 'pixel'
  scene.setParams(params)
  paintHint()
}

function buildPanel() {
  const host = document.getElementById('panel-body') as HTMLDivElement
  STORY.forEach((section) => {
    const h = document.createElement('h3')
    h.textContent = section.title
    host.appendChild(h)
    section.controls.forEach((c) => host.appendChild(buildControl(c)))
  })
}

function buildControl(c: any): HTMLElement {
  const row = document.createElement('div')
  row.className = 'row'
  const label = document.createElement('label')
  label.className = 'label'
  label.htmlFor = `c-${c.prop}`
  label.textContent = c.label
  row.appendChild(label)

  const current = c.prop === 'pixelSize' ? pixelSize
    : c.prop === 'showHint' ? showHint
    : c.prop === 'touchControls' ? touchControls
    : params[c.prop]

  if (c.control === 'switch') {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = `c-${c.prop}`
    input.checked = Boolean(current)
    input.addEventListener('change', () => {
      if (c.prop === 'showHint') { showHint = input.checked; paintHint() }
      else apply({ [c.prop]: input.checked })
    })
    row.appendChild(input)
  } else if (c.control === 'slider') {
    const val = document.createElement('span')
    val.className = 'val'
    const input = document.createElement('input')
    input.type = 'range'
    input.id = `c-${c.prop}`
    input.min = String(c.min); input.max = String(c.max); input.step = String(c.step)
    input.value = String(current)
    val.textContent = String(current)
    input.addEventListener('input', () => {
      const v = Number(input.value)
      val.textContent = input.value
      if (c.prop === 'pixelSize') { pixelSize = v; layout() }
      else apply({ [c.prop]: v })
    })
    row.appendChild(input)
    row.appendChild(val)
  } else if (c.control === 'segmented') {
    const group = document.createElement('div')
    group.className = 'seg'
    c.options.forEach((opt: string) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = opt
      b.className = opt === current ? 'on' : ''
      b.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((x) => x.classList.remove('on'))
        b.classList.add('on')
        if (c.prop === 'touchControls') { touchControls = opt as 'auto' | 'on' | 'off'; paintHint() }
        else apply({ [c.prop]: opt })
      })
      group.appendChild(b)
    })
    row.appendChild(group)
  } else if (c.control === 'number') {
    const input = document.createElement('input')
    input.type = 'number'
    input.id = `c-${c.prop}`
    input.value = String(current)
    input.addEventListener('input', () => apply({ [c.prop]: Number(input.value) }))
    row.appendChild(input)
  } else if (c.control === 'color') {
    const input = document.createElement('input')
    input.type = 'color'
    input.id = `c-${c.prop}`
    input.value = String(current)
    input.addEventListener('input', () => apply({ [c.prop]: input.value }))
    row.appendChild(input)
  }
  return row
}

// ── wire up ─────────────────────────────────────────────────────────────
function start() {
  buildPanel()
  layout()
  paintHint()
  paintBoost()

  const ro = new ResizeObserver(layout)
  ro.observe(wrap)

  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('gamepadconnected', (e) => {
    padInput = padKind((e as GamepadEvent).gamepad.id)
    revealHint(scene.view, 7)
  })
  window.addEventListener('gamepaddisconnected', () => { padInput = ''; paintHint() })

  wrap.addEventListener('contextmenu', (e) => { if (fingerScreen) e.preventDefault() })
  wrap.addEventListener('pointerenter', () => wrap.focus({ preventScroll: true }))
  wrap.addEventListener('pointermove', onPointerMove)
  wrap.addEventListener('pointerdown', onPointerDown)
  wrap.addEventListener('pointerup', onPointerUp)
  wrap.addEventListener('pointerleave', onPointerLeave)
  wrap.addEventListener('pointercancel', onPointerLeave)

  const vb = document.getElementById('view-btn') as HTMLButtonElement
  const bb = document.getElementById('boost') as HTMLButtonElement
  vb.addEventListener('click', nextView)
  vb.addEventListener('pointerdown', mine)
  vb.addEventListener('pointermove', mine)
  vb.addEventListener('pointerup', mine)
  bb.addEventListener('pointerdown', boostOn)
  bb.addEventListener('pointermove', mine)
  bb.addEventListener('pointerup', boostOff)
  bb.addEventListener('pointercancel', boostOff)
  bb.addEventListener('lostpointercapture', boostOff)
  bb.addEventListener('contextmenu', (e) => e.preventDefault())

  const toggle = document.getElementById('panel-toggle') as HTMLButtonElement
  toggle.addEventListener('click', () => document.body.classList.toggle('panel-open'))
  const close = document.getElementById('panel-close') as HTMLButtonElement
  close.addEventListener('click', () => document.body.classList.remove('panel-open'))

  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    fingerScreen = true
    document.body.classList.add('touch')
  }

  fire.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    layer = null
    fireDead = true
    noFire = true
    params.flameStyle = 'pixel'
  })

  raf = requestAnimationFrame(frame)
}

start()
