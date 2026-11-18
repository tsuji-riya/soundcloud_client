// Run with `npm test`. Drives the worklet's DSP with a ramp signal (sample i has value i),
// so the output values tell which way and how fast the "record" is moving.
import { test } from 'node:test'
import assert from 'node:assert/strict'

let Processor
Object.assign(globalThis, {
  sampleRate: 48000,
  AudioWorkletProcessor: class { port = {} },
  registerProcessor: (_, cls) => (Processor = cls),
})
await import('./scratch-worklet.js')

const ramp = Float32Array.from({ length: 48000 * 10 }, (_, i) => i)
const block = (p) => {
  const out = [new Float32Array(128), new Float32Array(128)]
  p.process([], [out])
  return out[0]
}
const send = (p, data) => p.port.onmessage({ data })
const settle = (p, n) => Array.from({ length: n }, () => block(p)).at(-1)

test('hand moving forward at 1x plays forward at ~1x', () => {
  const p = new Processor()
  send(p, { ch: [ramp, ramp], pos: 48000, target: 48000, active: true })
  let speed
  for (let i = 0; i < 200; i++) {
    send(p, { target: p.target + 128 }) // hand advances one block per block
    const before = p.pos
    block(p)
    speed = (p.pos - before) / 128
  }
  assert.ok(Math.abs(speed - 1) < 0.05, `speed ${speed}`)
})

test('dragging backwards plays in reverse', () => {
  const p = new Processor()
  send(p, { ch: [ramp, ramp], pos: 96000, target: 96000, active: true })
  send(p, { target: 90000 })
  const out = block(p)
  assert.ok(out[127] < out[0], 'samples should run backwards')
})

test('held record goes silent, inactive outputs nothing', () => {
  const p = new Processor()
  send(p, { ch: [ramp, ramp], pos: 48000, target: 50000, active: true })
  assert.ok(Math.abs(settle(p, 400)[127]) < 1e-3)
  send(p, { active: false, target: 400000 })
  assert.ok(block(p).every((v) => v === 0))
})

test('fast fling keeps platter within 0.5s of the hand', () => {
  const p = new Processor()
  send(p, { ch: [ramp, ramp], pos: 0, target: 400000, active: true })
  block(p)
  assert.ok(400000 - p.pos <= 24000 + 128 * 8)
})
