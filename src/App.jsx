import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ActionList, Avatar, Button, Flash, Heading, IconButton, Spinner, Text, TextInput } from '@primer/react'
import { MuteIcon, PauseIcon, PlayIcon, SearchIcon, UnmuteIcon } from '@primer/octicons-react'
import Waveform, { toBars } from './Waveform.jsx'
import { createScratcher } from './scratch.js'

export default function App() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
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

  useEffect(() => {
    const v = muted ? 0 : volume
    audio.current.volume = v
    if (scratch.current) scratch.current.gain.value = v
  }, [volume, muted, current])

  // Release the previous blob when the source changes / on unmount
  useEffect(() => () => current?.src && URL.revokeObjectURL(current.src), [current])

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const search = (e) => {
    e.preventDefault()
    if (query.trim()) run(async () => setTracks(await invoke('search', { q: query })))
  }

  const play = (track) =>
    run(async () => {
      // A missing waveform shouldn't block playback; Waveform falls back to flat bars.
      const bars = invoke('waveform', { url: track.waveform_url })
        .then((w) => toBars(w.samples, w.height))
        .catch(() => null)
      // Created on a user gesture so the AudioContext may start.
      scratch.current ??= await createScratcher().catch(() => null)
      const bytes = await invoke('stream', { trackId: track.id })
      const src = URL.createObjectURL(new Blob([bytes]))
      // Without decoded PCM (unsupported codec), dragging just seeks on release.
      scratch.current?.load(bytes).catch(() => {})
      setCurrent({ track, src, bars: await bars })
      audio.current.src = src
      await audio.current.play()
    })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--base-size-16)' }}>
      <Heading as="h1" style={{ marginBottom: 'var(--base-size-16)' }}>SoundCloud Client</Heading>

      <form onSubmit={search} style={{ display: 'flex', gap: 'var(--base-size-8)' }}>
        <TextInput
          aria-label="検索"
          leadingVisual={SearchIcon}
          placeholder="曲名・アーティスト"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          block
        />
        <Button type="submit" variant="primary" disabled={busy}>検索</Button>
      </form>

      {error && <Flash variant="danger" style={{ marginTop: 'var(--base-size-16)' }}>{error}</Flash>}

      <div style={{ position: 'sticky', top: 0, padding: 'var(--base-size-16) 0', background: 'var(--bgColor-default)' }}>
        <Text as="p" weight="semibold">
          {busy ? <Spinner size="small" /> : null} {current ? `${current.track.user.username} — ${current.track.title}` : '未再生'}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--base-size-8)' }}>
          <IconButton
            icon={paused ? PlayIcon : PauseIcon}
            aria-label={paused ? '再生' : '一時停止'}
            disabled={!current}
            onClick={() => (paused ? audio.current.play() : audio.current.pause())}
          />
          <div style={{ flex: 1 }}>
            <Waveform
              bars={current?.bars}
              time={scrub ?? time}
              duration={duration}
              onSeek={(t) => (audio.current.currentTime = t)}
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
          </div>
          <IconButton
            icon={muted || volume === 0 ? MuteIcon : UnmuteIcon}
            aria-label={muted ? 'ミュート解除' : 'ミュート'}
            variant="invisible"
            onClick={() => setMuted(!muted)}
          />
          <input
            type="range"
            aria-label="音量"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value))
              setMuted(false)
            }}
            style={{ width: 96, accentColor: 'var(--fgColor-accent)' }}
          />
        </div>
        <audio
          ref={audio}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          // Concatenated HLS blobs may report Infinity; the API's duration (ms) is the fallback.
          onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : current?.track.duration / 1000)}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
        />
      </div>

      <ActionList>
        {tracks.map((t) => (
          <ActionList.Item key={t.id} onSelect={() => play(t)} active={current?.track.id === t.id}>
            <ActionList.LeadingVisual>
              <Avatar square size={32} src={t.artwork_url || t.user.avatar_url} alt="" />
            </ActionList.LeadingVisual>
            {t.title}
            <ActionList.Description variant="block">{t.user.username}</ActionList.Description>
          </ActionList.Item>
        ))}
      </ActionList>
    </div>
  )
}
