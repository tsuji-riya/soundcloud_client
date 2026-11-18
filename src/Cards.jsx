import { SkeletonBox } from '@primer/react'
import { art, compact } from './format.js'
import { useApp } from './hooks.js'

const year = (p) => (p.release_date || p.published_at || p.created_at || '').slice(0, 4)
/** Playlists without own artwork show their first track's, like soundcloud.com. */
export const playlistArt = (p, size) => art({ ...p, artwork_url: p.artwork_url || p.tracks?.[0]?.artwork_url }, size)

export const CardSkeleton = () => (
  <div className="cards" aria-busy="true" aria-label="読み込み中">
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className="card">
        <SkeletonBox className="card-art" />
        <SkeletonBox width="70%" height={14} />
      </div>
    ))}
  </div>
)

/** Grid of users (round avatars) or playlists/albums (square artwork); each opens its page. */
export default function Cards({ items }) {
  const { go } = useApp()
  return (
    <ul className="cards">
      {items.map((it) =>
        it.kind === 'user' ? (
          <li key={it.id}>
            <button type="button" className="card" onClick={() => go({ name: 'user', id: it.id })}>
              {it.avatar_url ? <img className="card-art card-art-round" src={it.avatar_url.replace('-large.', '-t300x300.')} alt="" loading="lazy" /> : <span className="card-art card-art-round" />}
              <span className="card-title">{it.username}</span>
              <span className="card-sub">フォロワー {compact(it.followers_count)}</span>
            </button>
          </li>
        ) : (
          <li key={it.id}>
            <button type="button" className="card" onClick={() => go({ name: 'playlist', id: it.id })}>
              {playlistArt(it, 't300x300') ? <img className="card-art" src={playlistArt(it, 't300x300')} alt="" loading="lazy" /> : <span className="card-art" />}
              <span className="card-title">{it.title}</span>
              <span className="card-sub">
                {it.user?.username} · {it.is_album ? `アルバム ${year(it)}` : `${it.track_count}曲`}
              </span>
            </button>
          </li>
        ),
      )}
    </ul>
  )
}
