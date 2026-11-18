import { Banner, Label, SkeletonBox } from '@primer/react'
import { ClockIcon, HeartIcon, NoteIcon } from '@primer/octicons-react'
import Hero, { HeroHead } from '../Hero.jsx'
import TrackList, { TrackSkeleton } from '../TrackList.jsx'
import { playlistArt } from '../Cards.jsx'
import { Description } from '../Results.jsx'
import { useApp, useLoad } from '../hooks.js'
import { playlist } from '../sc.js'
import { compact } from '../format.js'

export default function PlaylistPage({ id }) {
  const { play, go, current, paused, toggle } = useApp()
  const pl = useLoad(() => playlist(id), id)
  const p = pl.data
  if (pl.error) return <Banner variant="critical" title="読み込めませんでした" description={pl.error} />
  if (!p)
    return (
      <>
        <SkeletonBox height={288} className="hero-skeleton" />
        <TrackSkeleton />
      </>
    )

  const playingHere = p.tracks.some((t) => t.id === current?.id)
  const minutes = Math.round(p.tracks.reduce((s, t) => s + (t.duration || 0), 0) / 60000)
  const cover = playlistArt(p, 't500x500')
  return (
    <>
      <Hero label={p.is_album ? 'アルバム' : 'プレイリスト'} backdrop={cover} image={cover ?? null}>
        <HeroHead
          playing={playingHere && !paused}
          onPlay={playingHere ? toggle : p.tracks.length ? () => play(p.tracks[0], p.tracks) : null}
          sub={p.user.username}
          onSub={() => go({ name: 'user', id: p.user.id })}
          title={p.title}
          meta={
            <>
              <Label>{p.is_album ? 'アルバム' : 'プレイリスト'}</Label>
              <span>{(p.release_date || p.published_at || p.created_at || '').slice(0, 4)}</span>
            </>
          }
        />
        <div className="hero-stats">
          <span>
            <NoteIcon size={12} /> {p.tracks.length}曲
          </span>
          <span>
            <ClockIcon size={12} /> {minutes}分
          </span>
          <span title="いいね">
            <HeartIcon size={12} /> {compact(p.likes_count)}
          </span>
        </div>
        {p.description && <Description text={p.description} />}
      </Hero>
      <TrackList tracks={p.tracks} />
    </>
  )
}
