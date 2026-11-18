import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hydrate } from './sc.js'

test('hydrate keeps order, fills stubs and drops unavailable ones', () => {
  const tracks = [{ id: 1, title: 'a' }, { id: 2 }, { id: 3 }, { id: 4, title: 'd' }]
  const full = [{ id: 3, title: 'c' }, { id: 2, title: 'b' }]
  assert.deepEqual(hydrate(tracks, full).map((t) => t.title), ['a', 'b', 'c', 'd'])
  assert.deepEqual(hydrate([{ id: 9 }], []), [])
})
