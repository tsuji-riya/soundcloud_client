import { invoke } from '@tauri-apps/api/core'

/** GET an api-v2 path or full api-v2 URL (e.g. a `next_href`). Query values are stringified for Rust. */
export const api = (url, query = {}) =>
  invoke('api', { url, query: Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])) })

/** First page of a paginated collection → `{ collection, next_href }`. */
export const list = (url, query) => api(url, { limit: 30, linked_partitioning: 1, ...query })

/** Playlists embed only the first few tracks in full; the rest are `{ id }` stubs fetched here (50 per request). */
export async function playlist(id) {
  const p = await api(`/playlists/${id}`)
  const missing = p.tracks.filter((t) => !t.title).map((t) => t.id)
  const chunks = Array.from({ length: Math.ceil(missing.length / 50) }, (_, i) => missing.slice(i * 50, i * 50 + 50))
  const full = (await Promise.all(chunks.map((ids) => api('/tracks', { ids: ids.join(',') })))).flat()
  return { ...p, tracks: hydrate(p.tracks, full) }
}

/** Replaces stubs with full tracks, keeping playlist order; stubs SoundCloud won't return (removed/private) drop out. */
export function hydrate(tracks, full) {
  const byId = new Map(full.map((t) => [t.id, t]))
  return tracks.map((t) => (t.title ? t : byId.get(t.id))).filter(Boolean)
}
