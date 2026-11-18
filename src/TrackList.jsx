import { Label, SkeletonBox, Spinner } from '@primer/react'
import { HeartIcon, PlayIcon } from '@primer/octicons-react'
import { PauseGlyph, PlayGlyph } from './icons.jsx'
import { art, compact, fmt } from './format.js'
import { useApp } from './hooks.js'

/** Animated bars marking the playing row (static when paused). */
const Equalizer = ({ paused }) => (
  <span className={`eq${paused ? ' eq-paused' : ''}`} aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
)

export const TrackSkeleton = ({ rows = 6 }) => (
  <div className="tracks" aria-busy="true" aria-label="読み込み中">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="track">
        <span className="track-play">
          <SkeletonBox width={20} height={14} />
          <SkeletonBox width={48} height={48} />
        </span>
        <span className="track-text">
          <SkeletonBox width="60%" height={14} />
          <SkeletonBox width="30%" height={12} />
        </span>
      </div>
    ))}
  </div>
)

/** Track rows; playing one queues the whole list. Title opens the track page, artist the user page. */
export default function TrackList({ tracks, numbered = true }) {
  const { play, go, current, paused, loadingId } = useApp()
  return (
    <ol className="tracks">
      {tracks.map((t, i) => {
        const isCurrent = t.id === current?.id
        return (
          <li key={t.id} className="track" aria-current={isCurrent ? 'true' : undefined}>
            <button
              type="button"
              className="track-play"
              aria-label={`${t.title} を${isCurrent && !paused ? '一時停止' : '再生'}`}
              onClick={() => play(t, tracks)}
            >
              <span className="track-index">
                {loadingId === t.id ? (
                  <Spinner size="small" srText={null} />
                ) : isCurrent ? (
                  <Equalizer paused={paused} />
                ) : (
                  numbered && <span className="track-num">{i + 1}</span>
                )}
              </span>
              <span className="track-art-wrap">
                {art(t) ? <img className="track-art" src={art(t)} alt="" loading="lazy" /> : <span className="track-art" />}
                <span className="track-art-overlay">{isCurrent && !paused ? <PauseGlyph /> : <PlayGlyph />}</span>
              </span>
            </button>
            <span className="track-text">
              <button type="button" className="linkish track-title" onClick={() => go({ name: 'track', id: t.id, track: t })}>
                {t.title}
              </button>
              <button type="button" className="linkish track-artist" onClick={() => go({ name: 'user', id: t.user.id })}>
                {t.user.username}
              </button>
            </span>
            <span className="track-genre">{t.genre && <Label variant="secondary">{t.genre}</Label>}</span>
            <span className="track-stats">
              <span title="再生回数">
                <PlayIcon size={12} /> {compact(t.playback_count)}
              </span>
              <span title="いいね">
                <HeartIcon size={12} /> {compact(t.likes_count)}
              </span>
            </span>
            <span className="track-dur">{fmt(t.duration / 1000)}</span>
          </li>
        )
      })}
    </ol>
  )
}
