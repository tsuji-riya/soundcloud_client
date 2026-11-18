import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@primer/react'

export const BARS = 160
const ORANGE = '#f50'
const HOVER = '#ffaa80'
const FLAT = Array(BARS).fill(0.3)
const COMMENT_SECONDS = 3 // how long a timed comment stays open after the playhead passes it

/** SoundCloud waveform JSON samples (0..height) -> BARS peaks in 0..1. */
export function toBars(samples, height) {
  const size = samples.length / BARS
  return Array.from(
    { length: BARS },
    (_, i) => Math.max(...samples.slice(Math.floor(i * size), Math.ceil((i + 1) * size))) / height || 0,
  )
}

const fmt = (s) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00'

/**
 * SoundCloud-style seek bar: bars above, dimmer reflection below, played part in orange.
 * Pointer drags report start/move/end so the parent can scratch; keys seek directly.
 */
export default function Waveform({ bars, comments = [], time, duration, onSeek, onScrubStart, onScrub, onScrubEnd }) {
  const [hover, setHover] = useState(null)
  const [hoveredComment, setHoveredComment] = useState(null)
  // Like soundcloud.com: the comment the playhead just passed pops open; hovering an avatar overrides it.
  const openComment =
    hoveredComment ??
    comments.findLast((c) => c.timestamp / 1000 <= time && time - c.timestamp / 1000 < COMMENT_SECONDS)
  const at = (c) => `${Math.min(100, (c.timestamp / 1000 / duration) * 100)}%`
  const svg = useRef(null)
  const props = useRef(null)
  props.current = { time, duration, onScrubStart, onScrub, onScrubEnd }

  // Two-finger horizontal trackpad swipes scrub like dragging the playhead by the same distance.
  // Native listener because React's onWheel is passive and can't preventDefault.
  useEffect(() => {
    const el = svg.current
    let pos = null
    let timer
    const onWheel = (e) => {
      const { time, duration, onScrubStart, onScrub, onScrubEnd } = props.current
      if (!duration || (pos === null && Math.abs(e.deltaX) <= Math.abs(e.deltaY))) return
      e.preventDefault()
      // macOS "natural scrolling" inverts deltaX; WebKit reports it, elsewhere assume the macOS default (on).
      const finger = (e.webkitDirectionInvertedFromDevice === false ? e.deltaX : -e.deltaX) * (e.deltaMode ? 16 : 1)
      if (pos === null) onScrubStart((pos = time))
      pos = Math.min(duration, Math.max(0, pos + (finger / el.getBoundingClientRect().width) * duration))
      onScrub(pos)
      // Wheel events have no "end"; momentum events after lift-off keep the scrub alive like a flung record.
      clearTimeout(timer)
      timer = setTimeout(() => {
        onScrubEnd(pos)
        pos = null
      }, 150)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearTimeout(timer)
    }
  }, [])
  const ratio = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  }
  const step = { ArrowLeft: -5, ArrowRight: 5, Home: -Infinity, End: Infinity }
  const played = duration ? time / duration : 0
  const end = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    onScrubEnd(ratio(e) * duration)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--base-size-8)' }}>
      <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: ORANGE }}>{fmt(time)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg
          ref={svg}
          role="slider"
          tabIndex={0}
          aria-label="再生位置"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
          viewBox={`0 0 ${BARS * 3} 100`}
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 72, cursor: 'pointer', touchAction: 'none' }}
          onPointerDown={(e) => {
            if (!duration) return
            e.currentTarget.setPointerCapture(e.pointerId)
            onScrubStart(ratio(e) * duration)
          }}
          onPointerMove={(e) => {
            setHover(ratio(e))
            if (e.currentTarget.hasPointerCapture(e.pointerId)) onScrub(ratio(e) * duration)
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (!(e.key in step) || !duration) return
            e.preventDefault()
            onSeek(Math.min(duration, Math.max(0, time + step[e.key])))
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
        {duration > 0 && (
          <div style={{ position: 'relative', height: 20 }} onPointerLeave={() => setHoveredComment(null)}>
            {comments.map((c) => (
              <Avatar
                key={c.id}
                src={c.user.avatar_url}
                size={20}
                alt={`${c.user.username} (${fmt(c.timestamp / 1000)}): ${c.body}`}
                onPointerEnter={() => setHoveredComment(c)}
                style={{
                  position: 'absolute',
                  left: at(c),
                  transform: 'translateX(-50%)',
                  opacity: openComment === c ? 1 : 0.7,
                }}
              />
            ))}
            {openComment && (
              // The bubble's avatar sits on the comment's avatar; it opens leftwards in the right half so it stays inside.
              <div
                style={{
                  position: 'absolute',
                  ...(openComment.timestamp / 1000 / duration < 0.5
                    ? { left: `calc(${at(openComment)} - 10px)` }
                    : { right: `calc(100% - ${at(openComment)} - 10px)`, flexDirection: 'row-reverse' }),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--base-size-4)',
                  maxWidth: '70%',
                  ...(openComment.timestamp / 1000 / duration < 0.5 ? { paddingRight: 'var(--base-size-8)' } : { paddingLeft: 'var(--base-size-8)' }),
                  background: 'var(--bgColor-default)',
                  borderRadius: 'var(--borderRadius-full)',
                  boxShadow: 'var(--shadow-resting-small)',
                  fontSize: 12,
                  lineHeight: '20px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                <Avatar src={openComment.user.avatar_url} size={20} alt="" />
                <span style={{ color: ORANGE }}>{openComment.user.username}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{openComment.body}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(duration)}</span>
    </div>
  )
}
