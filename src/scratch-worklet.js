// Vinyl model: the platter chases the hand position with ~25ms lag, so drag speed becomes pitch
// and dragging backwards plays the record backwards. Runs on the audio thread.
const MAX_RATE = 8

class Scratch extends AudioWorkletProcessor {
  ch = null // [left, right] Float32Arrays at the context sample rate
  pos = 0 // platter position (samples)
  target = 0 // hand position (samples)
  active = false

  constructor() {
    super()
    this.port.onmessage = ({ data }) => Object.assign(this, data)
  }

  process(_, [out]) {
    if (!this.active || !this.ch) return true // outputs stay zero-filled
    const [L, R] = this.ch
    const k = 1 - Math.exp(-1 / (0.025 * sampleRate))
    // A fast fling would leave the platter seconds behind the hand; keep it within 0.5s.
    const lag = this.target - this.pos
    if (Math.abs(lag) > sampleRate / 2) this.pos = this.target - Math.sign(lag) * (sampleRate / 2)
    for (let i = 0; i < out[0].length; i++) {
      const v = Math.max(-MAX_RATE, Math.min(MAX_RATE, (this.target - this.pos) * k))
      this.pos = Math.max(0, Math.min(L.length - 2, this.pos + v))
      const j = this.pos | 0
      const f = this.pos - j
      const g = Math.min(1, Math.abs(v)) // a held record is silent, a slow one quiet
      out[0][i] = (L[j] + (L[j + 1] - L[j]) * f) * g
      if (out[1]) out[1][i] = (R[j] + (R[j + 1] - R[j]) * f) * g
    }
    return true
  }
}

registerProcessor('scratch', Scratch)
