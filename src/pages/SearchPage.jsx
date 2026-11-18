import { usePaged } from '../hooks.js'
import { list } from '../sc.js'
import Results, { useTabs } from '../Results.jsx'

const KINDS = [
  ['tracks', 'トラック'],
  ['users', 'アーティスト'],
  ['albums', 'アルバム'],
  ['playlists_without_albums', 'プレイリスト'],
]

export default function SearchPage({ q }) {
  const [kind, tabs] = useTabs(KINDS, '検索対象')
  const paged = usePaged(() => list(`/search/${kind}`, { q }), `${q}|${kind}`)
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">「{q}」の検索結果</h1>
        {tabs}
      </div>
      <Results paged={paged} tracks={kind === 'tracks'} empty="見つかりませんでした" />
    </>
  )
}
