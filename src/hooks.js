import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from './sc.js'

/** Navigation + player shared by every page: { go, play, toggle, current, paused, loadingId, live }. */
export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

/** One-shot fetch; restarts when `key` changes. */
export function useLoad(load, key) {
  const [s, set] = useState({ key, data: null, error: null })
  useEffect(() => {
    let alive = true
    set({ key, data: null, error: null })
    load().then(
      (data) => alive && set({ key, data, error: null }),
      (e) => alive && set({ key, data: null, error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [key])
  return s.key === key ? s : { key, data: null, error: null }
}

/**
 * Paginated collection for infinite scroll: `first()` loads page 1, `more()` follows `next_href`.
 * Items are de-duplicated by id because SoundCloud pages can overlap.
 */
export function usePaged(first, key) {
  const [s, set] = useState({ key, items: [], next: null, loading: true, error: null })
  const generation = useRef(0)
  const merge = (g, page, reset) =>
    g === generation.current &&
    set((prev) => {
      const items = reset ? [] : prev.items
      const seen = new Set(items.map((i) => i.id))
      const fresh = page.collection.filter((i) => !seen.has(i.id) && seen.add(i.id))
      return { key: prev.key, items: [...items, ...fresh], next: page.next_href ?? null, loading: false, error: null }
    })
  const fail = (g, e) => g === generation.current && set((prev) => ({ ...prev, loading: false, error: String(e) }))

  useEffect(() => {
    const g = ++generation.current
    set({ key, items: [], next: null, loading: true, error: null })
    first().then((p) => merge(g, p, true), (e) => fail(g, e))
  }, [key])

  // Until the effect above resets state, never hand out the previous key's items (e.g. users to a track list).
  if (s.key !== key) return { items: [], next: null, loading: true, error: null, more: () => {} }

  const more = () => {
    if (s.loading || !s.next) return
    const g = generation.current
    set((prev) => ({ ...prev, loading: true, error: null }))
    api(s.next).then((p) => merge(g, p, false), (e) => fail(g, e))
  }
  return { ...s, more }
}
