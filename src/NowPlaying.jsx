import { Label, RelativeTime } from '@primer/react'
import { CommentIcon, HeartIcon, PlayIcon } from '@primer/octicons-react'
import { PauseGlyph, PlayGlyph } from './icons.jsx'
import { art, compact } from './format.js'

/** Track-page style hero; always dark (like soundcloud.com) regardless of the app theme. */
export default function NowPlaying({ track, paused, onToggle, children }) {
  const cover = art(track, 't500x500')
  return (
    <section className="hero" data-color-mode="dark" data-dark-theme="dark" aria-label="再生中の曲">
      {cover && <div className="hero-bg" style={{ backgroundImage: `url("${cover}")` }} />}
      <div className="hero-body">
        <div className="hero-main">
          <div className="hero-head">
            <button type="button" className="big-play" aria-label={paused ? '再生' : '一時停止'} onClick={onToggle}>
              {paused ? <PlayGlyph size={24} /> : <PauseGlyph size={24} />}
            </button>
            <div className="hero-titles">
              <span className="hero-pill hero-artist">{track.user.username}</span>
              <h2 className="hero-pill hero-title">{track.title}</h2>
            </div>
            <div className="hero-meta">
              {track.created_at && <RelativeTime date={new Date(track.created_at)} />}
              {track.genre && <Label>{track.genre}</Label>}
            </div>
          </div>
          {children}
          <div className="hero-stats">
            <span title="再生回数">
              <PlayIcon size={12} /> {compact(track.playback_count)}
            </span>
            <span title="いいね">
              <HeartIcon size={12} /> {compact(track.likes_count)}
            </span>
            <span title="コメント">
              <CommentIcon size={12} /> {compact(track.comment_count)}
            </span>
          </div>
        </div>
        {cover ? <img className="hero-art" src={cover} alt="" /> : <div className="hero-art" />}
      </div>
    </section>
  )
}
