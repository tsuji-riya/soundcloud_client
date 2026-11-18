import { Component, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Banner, Button, IconButton, TextInput } from '@primer/react'
import { ArrowLeftIcon, CloudIcon, SearchIcon } from '@primer/octicons-react'
import { toBars } from './Waveform.jsx'
import PlayerBar from './PlayerBar.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import UserPage from './pages/UserPage.jsx'
import TrackPage from './pages/TrackPage.jsx'
import PlaylistPage from './pages/PlaylistPage.jsx'
import { AppContext } from './hooks.js'
import { api } from './sc.js'
import { createScratcher } from './scratch.js'
import './app.css'

const PAGES = { home: HomePage, search: SearchPage, user: UserPage, track: TrackPage, playlist: PlaylistPage }
const MAX_HISTORY = 20

/** Keeps one broken page (e.g. unexpected API data) from blanking the whole app. */
class PageBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    return this.state.error ? (
      <Banner variant="critical" title="このページを表示できませんでした" description={String(this.state.error)} />
    ) : (
      this.props.children
    )
  }
}
let routeKey = 0

export default function App() {
  // Navigation is a stack of routes; every entry stays mounted (hidden) so going back keeps data and scroll.
  const [stack, setStack] = useState([{ name: 'home', key: routeKey++ }])
  const scrollPos = useRef({})
  const content = useRef(null)
  const route = stack.at(-1)

  const [query, setQuery] = useState('')
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(null) // track being fetched
  const [current, setCurrent] = useState(null)
  const [error, setError] = useState(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [paused, setPaused] = useState(true)
  const [scrub, setScrub] = useState(null) // hand position (s) while dragging the waveform
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const audio = useRef(null)
  const scratch = useRef(null)
  const wasPlaying = useRef(false)
  const playRequest = useRef(0)

  const go = (next) => {
    scrollPos.current[route.key] = content.current.scrollTop
    setStack((s) => [...s.slice(-(MAX_HISTORY - 1)), { ...next, key: routeKey++ }])
  }
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  useLayoutEffect(() => {
    content.current.scrollTop = scrollPos.current[route.key] ?? 0
  }, [route.key])

  useEffect(() => {
    const v = muted ? 0 : volume
    audio.current.volume = v
    if (scratch.current) scratch.current.gain.value = v
  }, [volume, muted, current])

  // Release the previous blob when the source changes / on unmount
  useEffect(() => () => current?.src && URL.revokeObjectURL(current.src), [current])

  useEffect(() => {
    document.title = current ? `${paused ? '' : '▶ '}${current.track.title} — ${current.track.user.username}` : 'SoundCloud Client'
  }, [current, paused])

  const toggle = () => current && (audio.current.paused ? audio.current.play() : audio.current.pause())

  // Space: play/pause (unless typing or on a control). Alt+← / ⌘[ / mouse back button: navigate back.
  const keys = useRef()
  keys.current = { toggle, back }
  useEffect(() => {
    const onKey = (e) => {
      if ((e.altKey && e.key === 'ArrowLeft') || (e.metaKey && e.key === '[')) return keys.current.back()
      if (e.code !== 'Space' || e.target.closest('input, textarea, button, [role=slider]')) return
      e.preventDefault()
      keys.current.toggle()
    }
    const onMouse = (e) => e.button === 3 && keys.current.back()
    window.addEventListener('keydown', onKey)
    window.addEventListener('mouseup', onMouse)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mouseup', onMouse)
    }
  }, [])

  const search = (e) => {
    e.preventDefault()
    if (query.trim()) go({ name: 'search', q: query.trim() })
  }

  /** Plays `track`; `list` becomes the queue for next/previous and auto-advance. */
  const play = async (track, list = [track]) => {
    if (track.id === current?.track.id) return toggle()
    const request = ++playRequest.current
    setLoading(track)
    setError(null)
    try {
      // A missing waveform/comments shouldn't block playback.
      const bars = invoke('waveform', { url: track.waveform_url })
        .then((w) => toBars(w.samples, w.height))
        .catch(() => null)
      // shortcut: first page only (up to 200, newest first); follow next_href if busy tracks need all of them.
      const comments = api(`/tracks/${track.id}/comments`, { threaded: 0, filter_replies: 1, limit: 200 })
        .then((r) => r.collection.filter((c) => c.timestamp != null).sort((a, b) => a.timestamp - b.timestamp))
        .catch(() => [])
      // Created on a user gesture so the AudioContext may start.
      scratch.current ??= await createScratcher().catch(() => null)
      const bytes = await invoke('stream', { trackId: track.id })
      const [b, c] = await Promise.all([bars, comments])
      if (request !== playRequest.current) return // the user picked another track meanwhile
      const src = URL.createObjectURL(new Blob([bytes]))
      // Without decoded PCM (unsupported codec), dragging just seeks on release.
      scratch.current?.load(bytes).catch(() => {})
      setQueue(list)
      setCurrent({ track, src, bars: b, comments: c })
      setTime(0)
      audio.current.src = src
      await audio.current.play()
    } catch (err) {
      if (request === playRequest.current) setError(String(err))
    } finally {
      if (request === playRequest.current) setLoading(null)
    }
  }

  const index = current ? queue.findIndex((t) => t.id === current.track.id) : -1
  const next = index >= 0 && index < queue.length - 1 ? () => play(queue[index + 1], queue) : null
  const prev =
    current && (time > 3 || index <= 0)
      ? () => (audio.current.currentTime = 0)
      : index > 0
        ? () => play(queue[index - 1], queue)
        : null
  const seek = (t) => (audio.current.currentTime = t)

  // Props for the interactive waveform of the playing track (shown on its track page).
  const live = current && {
    bars: current.bars,
    comments: current.comments,
    time: scrub ?? time,
    duration,
    onSeek: seek,
    onScrubStart: (t) => {
      wasPlaying.current = !audio.current.paused
      audio.current.pause()
      scratch.current?.start(t)
      setScrub(t)
    },
    onScrub: (t) => {
      scratch.current?.move(t)
      setScrub(t)
    },
    onScrubEnd: (t) => {
      scratch.current?.stop()
      setScrub(null)
      setTime(t)
      audio.current.currentTime = t
      if (wasPlaying.current) audio.current.play()
    },
  }

  const ctx = { go, play, toggle, current: current?.track, paused, loadingId: loading?.id, live }

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <IconButton icon={ArrowLeftIcon} aria-label="戻る" variant="invisible" disabled={stack.length < 2} onClick={back} />
          <button type="button" className="brand" onClick={() => go({ name: 'home' })}>
            <CloudIcon size={24} />
            <span>SoundCloud Client</span>
          </button>
          <form className="search" role="search" onSubmit={search}>
            <TextInput
              aria-label="検索"
              leadingVisual={SearchIcon}
              placeholder="曲名・アーティスト・アルバムを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              block
            />
            <Button type="submit" variant="primary">
              検索
            </Button>
          </form>
        </header>

        <main className="content" ref={content}>
          {error && (
            <div className="content-inner content-banner">
              <Banner title="再生できませんでした" description={error} variant="critical" onDismiss={() => setError(null)} />
            </div>
          )}
          {stack.map((r) => {
            const Page = PAGES[r.name]
            return (
              <div key={r.key} className="content-inner" hidden={r !== route}>
                <PageBoundary>
                  <Page {...r} />
                </PageBoundary>
              </div>
            )
          })}
        </main>

        <PlayerBar
          track={current?.track}
          loading={loading}
          paused={paused}
          time={scrub ?? time}
          duration={duration}
          volume={volume}
          muted={muted}
          onToggle={toggle}
          onPrev={prev}
          onNext={next}
          onSeek={seek}
          onOpen={(r) => go(r)}
          onToggleMute={() => setMuted(!muted)}
          onVolume={(v) => {
            setVolume(v)
            setMuted(false)
          }}
        />

        <audio
          ref={audio}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          // Concatenated HLS blobs may report Infinity; the API's duration (ms) is the fallback.
          onDurationChange={(e) =>
            setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : current?.track.duration / 1000)
          }
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onEnded={() => next?.()}
        />
      </div>
    </AppContext.Provider>
  )
}
