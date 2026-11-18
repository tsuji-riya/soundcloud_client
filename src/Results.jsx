import { useState } from 'react'
import { Banner, SegmentedControl } from '@primer/react'
import { Blankslate } from '@primer/react/experimental'
import TrackList, { TrackSkeleton } from './TrackList.jsx'
import Cards, { CardSkeleton } from './Cards.jsx'
import More from './More.jsx'

/** A paginated result set with skeleton, empty and error states plus infinite scroll. */
export default function Results({ paged, tracks, empty = 'まだありません' }) {
  if (paged.loading && !paged.items.length) return tracks ? <TrackSkeleton /> : <CardSkeleton />
  if (paged.error && !paged.items.length)
    return <Banner variant="critical" title="読み込みに失敗しました" description={paged.error} />
  if (!paged.items.length)
    return (
      <Blankslate>
        <Blankslate.Heading>{empty}</Blankslate.Heading>
      </Blankslate>
    )
  return (
    <>
      {tracks ? <TrackList tracks={paged.items} /> : <Cards items={paged.items} />}
      <More paged={paged} />
    </>
  )
}

/** Tab strip over `[[value, label], ...]`; returns [value, element]. */
export function useTabs(tabs, label) {
  const [i, setI] = useState(0)
  return [
    tabs[i][0],
    <SegmentedControl aria-label={label} onChange={setI}>
      {tabs.map(([value, text], j) => (
        <SegmentedControl.Button key={value} selected={i === j}>
          {text}
        </SegmentedControl.Button>
      ))}
    </SegmentedControl>,
  ]
}

/** Long text clamped to a few lines with a toggle. */
export function Description({ text }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 240 || text.split('\n').length > 4
  return (
    <div className="desc">
      <p className={open || !long ? '' : 'desc-clamp'}>{text}</p>
      {long && (
        <button type="button" className="linkish desc-toggle" onClick={() => setOpen(!open)}>
          {open ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </div>
  )
}
