export const fmt = (s) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00'

const compactFmt = new Intl.NumberFormat('ja-JP', { notation: 'compact' })
export const compact = (n) => (n == null ? '–' : compactFmt.format(n))

/** Artwork URL at a given SoundCloud size suffix (large = 100px, t500x500 = 500px); falls back to the uploader's avatar. */
export const art = (track, size = 'large') => (track.artwork_url || track.user.avatar_url)?.replace('-large.', `-${size}.`)
