import { useState } from 'react'

export const BARS = 160
const ORANGE = '#f50'
const HOVER = '#ffaa80'
const FLAT = Array(BARS).fill(0.3)

/** SoundCloud waveform JSON samples (0..height) -> BARS peaks in 0..1. */
export function toBars(samples, height) {
  const size = samples.length / BARS
  return Array.from({ length: BARS }, (_, i) =>
    Math.max(...samples.slice(Math.floor(i * size), Math.ceil((i + 1) * size))) / height || 0,
  )
}

const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

/** SoundCloud-style seek bar: bars above, dimmer reflection below, played part in orange. */
export default function Waveform({ bars, time, duration, onSeek }) {
  const [hover, setHover] = useState(null)
  const ratio = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  }
  const seek = (t) => duration && onSeek(Math.min(duration, Math.max(0, t)))
  const step = { ArrowLeft: -5, ArrowRight: 5, Home: -Infinity, End: Infinity }
  const played = duration ? time / duration : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--base-size-8)' }}>
      <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: ORANGE }}>{fmt(time)}</span>
      <svg
        role="slider"
        tabIndex={0}
        aria-label="再生位置"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
        viewBox={`0 0 ${BARS * 3} 100`}
        preserveAspectRatio="none"
        style={{ flex: 1, height: 72, cursor: 'pointer' }}
        onClick={(e) => seek(ratio(e) * duration)}
        onMouseMove={(e) => setHover(ratio(e))}
        onMouseLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (!(e.key in step)) return
          e.preventDefault()
          seek(time + step[e.key])
        }}
      >
        {(bars || FLAT).map((h, i) => {
          const x = (i + 0.5) / BARS
          const fill = x < played ? ORANGE : hover !== null && x < hover ? HOVER : 'var(--fgColor-muted)'
          return (
            <g key={i} style={{ fill }}>
              <rect x={i * 3} y={70 - h * 70} width={2} height={h * 70} />
              <rect x={i * 3} y={71} width={2} height={h * 29} opacity={0.4} />
            </g>
          )
        })}
      </svg>
      <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(duration)}</span>
    </div>
  )
}
