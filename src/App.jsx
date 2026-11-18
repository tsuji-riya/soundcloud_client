import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ActionList, Avatar, Button, Flash, Heading, Spinner, Text, TextInput } from '@primer/react'
import { SearchIcon } from '@primer/octicons-react'

export default function App() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const audio = useRef(null)

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
      const bytes = await invoke('stream', { trackId: track.id })
      const src = URL.createObjectURL(new Blob([bytes]))
      setCurrent({ track, src })
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
        <audio ref={audio} controls style={{ width: '100%' }} />
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
