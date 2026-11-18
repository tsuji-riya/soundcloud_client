import { invoke } from '@tauri-apps/api/core'
import { Avatar, Banner, Label, RelativeTime, SkeletonBox } from '@primer/react'
import { CommentIcon, HeartIcon, PlayIcon } from '@primer/octicons-react'
import Hero, { HeroHead } from '../Hero.jsx'
import Waveform, { toBars } from '../Waveform.jsx'
import TrackList, { TrackSkeleton } from '../TrackList.jsx'
import More from '../More.jsx'
import { Description } from '../Results.jsx'
import { useApp, useLoad, usePaged } from '../hooks.js'
import { api, list } from '../sc.js'
import { art, compact, fmt } from '../format.js'

const noop = () => {}

export default function TrackPage({ id, track: initial }) {
  const { play, go, current, paused, toggle, live } = useApp()
  const loaded = useLoad(() => api(`/tracks/${id}`), id)
  const related = useLoad(() => api(`/tracks/${id}/related`, { limit: 10 }).then((r) => r.collection), id)
  const comments = usePaged(() => list(`/tracks/${id}/comments`, { threaded: 0, filter_replies: 1 }), id)
  const t = loaded.data ?? initial
  const bars = useLoad(
    () => (t ? invoke('waveform', { url: t.waveform_url }).then((w) => toBars(w.samples, w.height)) : Promise.resolve(null)),
    t?.waveform_url,
  )
  if (loaded.error && !t) return <Banner variant="critical" title="トラックを読み込めませんでした" description={loaded.error} />
  if (!t) return <SkeletonBox height={288} className="hero-skeleton" />

  const isCurrent = current?.id === t.id
  const start = () => play(t, [t, ...(related.data ?? [])])
  const cover = art(t, 't500x500')
  return (
    <>
      <Hero label="トラック" backdrop={cover} image={cover ?? null}>
        <HeroHead
          playing={isCurrent && !paused}
          onPlay={isCurrent ? toggle : start}
          sub={t.user.username}
          onSub={() => go({ name: 'user', id: t.user.id })}
          title={t.title}
          meta={
            <>
              {t.created_at && <RelativeTime prefix="" date={new Date(t.created_at)} />}
              {t.genre && <Label>{t.genre}</Label>}
            </>
          }
        />
        {isCurrent ? (
          <Waveform {...live} />
        ) : (
          // Not loaded yet: any interaction starts playback.
          <Waveform bars={bars.data} time={0} duration={t.duration / 1000} onSeek={start} onScrubStart={start} onScrub={noop} onScrubEnd={noop} />
        )}
        <div className="hero-stats">
          <span title="再生回数">
            <PlayIcon size={12} /> {compact(t.playback_count)}
          </span>
          <span title="いいね">
            <HeartIcon size={12} /> {compact(t.likes_count)}
          </span>
          <span title="コメント">
            <CommentIcon size={12} /> {compact(t.comment_count)}
          </span>
        </div>
      </Hero>

      <div className="track-page">
        <div className="track-page-main">
          {t.description && <Description text={t.description} />}
          <h2 className="section-title">
            コメント <span className="section-count">{compact(t.comment_count)}</span>
          </h2>
          <Comments paged={comments} onSeek={isCurrent ? live.onSeek : null} />
        </div>
        <aside className="track-page-side" aria-label="関連トラック">
          <h2 className="section-title">関連トラック</h2>
          {related.data ? <TrackList tracks={related.data} numbered={false} /> : related.error ? null : <TrackSkeleton rows={4} />}
        </aside>
      </div>
    </>
  )
}

function Comments({ paged, onSeek }) {
  const { go } = useApp()
  if (paged.loading && !paged.items.length)
    return Array.from({ length: 3 }, (_, i) => <SkeletonBox key={i} height={48} className="comment-skeleton" />)
  if (!paged.items.length) return <p className="muted">{paged.error ? 'コメントを読み込めませんでした' : 'まだコメントはありません'}</p>
  return (
    <>
      <ul className="comments">
        {paged.items.map((c) => (
          <li key={c.id} className="comment">
            <Avatar src={c.user.avatar_url} size={40} alt="" />
            <div className="comment-main">
              <div className="comment-head">
                <button type="button" className="linkish comment-user" onClick={() => go({ name: 'user', id: c.user.id })}>
                  {c.user.username}
                </button>
                {c.timestamp != null && (
                  <span className="muted">
                    {onSeek ? (
                      <button type="button" className="linkish" onClick={() => onSeek(c.timestamp / 1000)}>
                        {fmt(c.timestamp / 1000)}
                      </button>
                    ) : (
                      fmt(c.timestamp / 1000)
                    )}{' '}
                    に
                  </span>
                )}
                <RelativeTime prefix="" className="comment-date" date={new Date(c.created_at)} />
              </div>
              <p className="comment-body">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <More paged={paged} />
    </>
  )
}
