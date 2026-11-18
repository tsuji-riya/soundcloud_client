import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Banner, Button, TextInput } from '@primer/react'
import { CloudIcon, SearchIcon } from '@primer/octicons-react'
import Waveform, { toBars } from './Waveform.jsx'
import TrackList from './TrackList.jsx'
import NowPlaying from './NowPlaying.jsx'
import PlayerBar from './PlayerBar.jsx'
import { createScratcher } from './scratch.js'
import './app.css'

export default function App() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
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

  // Space toggles playback unless typing or operating a control.
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.target.closest('input, textarea, button, [role=slider]')) return
      e.preventDefault()
      toggleRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setTracks(await invoke('search', { q: query }))
      setSearched(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setSearching(false)
    }
  }

  const play = async (track) => {
    if (track.id === current?.track.id) return toggle()
    const request = ++playRequest.current
    setLoading(track)
    setError(null)
    try {
      // A missing waveform/comments shouldn't block playback.
      const bars = invoke('waveform', { url: track.waveform_url })
        .then((w) => toBars(w.samples, w.height))
        .catch(() => null)
      const comments = invoke('comments', { trackId: track.id })
        .then((cs) => cs.filter((c) => c.timestamp != null).sort((a, b) => a.timestamp - b.timestamp))
        .catch(() => [])
      // Created on a user gesture so the AudioContext may start.
      scratch.current ??= await createScratcher().catch(() => null)
      const bytes = await invoke('stream', { trackId: track.id })
      const [b, c] = await Promise.all([bars, comments])
      if (request !== playRequest.current) return // the user picked another track meanwhile
      const src = URL.createObjectURL(new Blob([bytes]))
      // Without decoded PCM (unsupported codec), dragging just seeks on release.
      scratch.current?.load(bytes).catch(() => {})
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

  const index = current ? tracks.findIndex((t) => t.id === current.track.id) : -1
  const next = index >= 0 && index < tracks.length - 1 ? () => play(tracks[index + 1]) : null
  const prev =
    current && (time > 3 || index <= 0) ? () => (audio.current.currentTime = 0) : index > 0 ? () => play(tracks[index - 1]) : null
  const seek = (t) => (audio.current.currentTime = t)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <CloudIcon size={24} />
          <span>SoundCloud Client</span>
        </div>
        <form className="search" role="search" onSubmit={search}>
          <TextInput
            aria-label="検索"
            leadingVisual={SearchIcon}
            placeholder="曲名・アーティストを検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            block
          />
          <Button type="submit" variant="primary" loading={searching}>
            検索
          </Button>
        </form>
      </header>

      <main className="content">
        <div className="content-inner">
          {error && <Banner title="エラー" description={error} variant="critical" onDismiss={() => setError(null)} />}

          {current && (
            <NowPlaying track={current.track} paused={paused} onToggle={toggle}>
              <Waveform
                bars={current.bars}
                comments={current.comments}
                time={scrub ?? time}
                duration={duration}
                onSeek={seek}
                onScrubStart={(t) => {
                  wasPlaying.current = !audio.current.paused
                  audio.current.pause()
                  scratch.current?.start(t)
                  setScrub(t)
                }}
                onScrub={(t) => {
                  scratch.current?.move(t)
                  setScrub(t)
                }}
                onScrubEnd={(t) => {
                  scratch.current?.stop()
                  setScrub(null)
                  setTime(t)
                  audio.current.currentTime = t
                  if (wasPlaying.current) audio.current.play()
                }}
              />
            </NowPlaying>
          )}

          <section aria-label="検索結果">
            {searched && !searching && tracks.length > 0 && (
              <h2 className="section-title">
                検索結果 <span className="section-count">{tracks.length}件</span>
              </h2>
            )}
            <TrackList
              tracks={tracks}
              searched={searched}
              searching={searching}
              currentId={current?.track.id}
              loadingId={loading?.id}
              paused={paused}
              onPlay={play}
            />
          </section>
        </div>
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
  )
}
