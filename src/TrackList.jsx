import { Label, SkeletonBox, Spinner } from '@primer/react'
import { Blankslate } from '@primer/react/experimental'
import { HeartIcon, PlayIcon, SearchIcon } from '@primer/octicons-react'
import { PlayGlyph } from './icons.jsx'
import { art, compact, fmt } from './format.js'

/** Animated bars marking the playing row (static when paused). */
const Equalizer = ({ paused }) => (
  <span className={`eq${paused ? ' eq-paused' : ''}`} aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
)

export default function TrackList({ tracks, searched, searching, currentId, loadingId, paused, onPlay }) {
  if (searching)
    return (
      <div className="tracks" aria-busy="true" aria-label="検索中">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="track track-skeleton">
            <SkeletonBox width={20} height={14} />
            <SkeletonBox width={48} height={48} />
            <span className="track-text">
              <SkeletonBox width="60%" height={14} />
              <SkeletonBox width="30%" height={12} />
            </span>
          </div>
        ))}
      </div>
    )

  if (!tracks.length)
    return (
      <Blankslate spacious>
        <Blankslate.Visual>
          <SearchIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>{searched ? '見つかりませんでした' : '曲を探す'}</Blankslate.Heading>
        <Blankslate.Description>
          {searched ? '別のキーワードで検索してみてください。' : '上の検索ボックスに曲名やアーティスト名を入力してください。'}
        </Blankslate.Description>
      </Blankslate>
    )

  return (
    <ol className="tracks">
      {tracks.map((t, i) => {
        const isCurrent = t.id === currentId
        return (
          <li key={t.id}>
            <button
              type="button"
              className="track"
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={`${t.title} — ${t.user.username} を再生`}
              onClick={() => onPlay(t)}
            >
              <span className="track-index">
                {loadingId === t.id ? (
                  <Spinner size="small" srText={null} />
                ) : isCurrent ? (
                  <Equalizer paused={paused} />
                ) : (
                  <>
                    <span className="track-num">{i + 1}</span>
                    <span className="track-hover-play">
                      <PlayGlyph />
                    </span>
                  </>
                )}
              </span>
              {art(t) ? <img className="track-art" src={art(t)} alt="" loading="lazy" /> : <span className="track-art" />}
              <span className="track-text">
                <span className="track-title">{t.title}</span>
                <span className="track-artist">{t.user.username}</span>
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
            </button>
          </li>
        )
      })}
    </ol>
  )
}
