import { IconButton, Spinner } from '@primer/react'
import { MuteIcon, UnmuteIcon } from '@primer/octicons-react'
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph } from './icons.jsx'
import { art, fmt } from './format.js'

/** Persistent bottom bar like soundcloud.com's: transport, thin timeline, volume, current track. */
export default function PlayerBar(p) {
  const { track, loading, paused, time, duration, volume, muted } = p
  const progress = duration ? (time / duration) * 100 : 0
  return (
    <footer className="playerbar" aria-label="プレイヤー">
      <div className="pb-transport">
        <IconButton icon={PrevGlyph} aria-label="前の曲" variant="invisible" disabled={!p.onPrev} onClick={p.onPrev} />
        <IconButton
          icon={paused ? PlayGlyph : PauseGlyph}
          aria-label={paused ? '再生' : '一時停止'}
          variant="invisible"
          size="large"
          disabled={!track}
          onClick={p.onToggle}
        />
        <IconButton icon={NextGlyph} aria-label="次の曲" variant="invisible" disabled={!p.onNext} onClick={p.onNext} />
      </div>

      <div className="pb-timeline">
        <span className="pb-time pb-time-current">{fmt(time)}</span>
        {/* Mouse convenience only; the waveform is the keyboard/screen-reader slider. */}
        <div
          className="pb-track"
          aria-hidden="true"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            if (duration) p.onSeek(((e.clientX - r.left) / r.width) * duration)
          }}
        >
          <div className="pb-fill" style={{ width: `${progress}%` }} />
          <div className="pb-knob" style={{ left: `${progress}%` }} />
        </div>
        <span className="pb-time">{fmt(duration)}</span>
      </div>

      <div className="pb-volume">
        <IconButton
          icon={muted || volume === 0 ? MuteIcon : UnmuteIcon}
          aria-label={muted ? 'ミュート解除' : 'ミュート'}
          variant="invisible"
          onClick={p.onToggleMute}
        />
        <input
          type="range"
          aria-label="音量"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => p.onVolume(Number(e.target.value))}
          style={{ '--fill': `${(muted ? 0 : volume) * 100}%` }}
        />
      </div>

      <div className="pb-now">
        {loading ? (
          <Spinner size="small" srText="読み込み中" />
        ) : (
          track && (art(track) ? <img src={art(track)} alt="" /> : <span className="pb-art-empty" />)
        )}
        <div className="pb-now-text">
          <span className="pb-now-artist">{loading ? '読み込み中…' : (track?.user.username ?? '')}</span>
          <span className="pb-now-title">{loading?.title ?? track?.title ?? '再生していません'}</span>
        </div>
      </div>
    </footer>
  )
}
