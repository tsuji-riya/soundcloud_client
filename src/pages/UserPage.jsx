import { Banner, SkeletonBox } from '@primer/react'
import { LocationIcon, PeopleIcon, PersonIcon, PulseIcon } from '@primer/octicons-react'
import Hero, { HeroHead } from '../Hero.jsx'
import Results, { Description, useTabs } from '../Results.jsx'
import { useLoad, usePaged } from '../hooks.js'
import { api, list } from '../sc.js'
import { compact } from '../format.js'

const TABS = [
  ['tracks', 'トラック'],
  ['toptracks', '人気'],
  ['albums', 'アルバム'],
  ['playlists_without_albums', 'プレイリスト'],
]

export default function UserPage({ id }) {
  const user = useLoad(() => api(`/users/${id}`), id)
  const [tab, tabs] = useTabs(TABS, '表示する内容')
  const paged = usePaged(() => list(`/users/${id}/${tab}`), `${id}|${tab}`)
  const u = user.data
  const avatar = u?.avatar_url?.replace('-large.', '-t500x500.')
  const place = [u?.city, u?.country_code].filter(Boolean).join(', ')

  return (
    <>
      {user.error && <Banner variant="critical" title="アーティストを読み込めませんでした" description={user.error} />}
      {u ? (
        <Hero label="アーティスト" backdrop={u.visuals?.visuals?.[0]?.visual_url || avatar} image={avatar ?? null} round>
          <HeroHead sub={u.full_name || null} title={u.username} />
          <div className="hero-stats">
            {place && (
              <span>
                <LocationIcon size={12} /> {place}
              </span>
            )}
            <span title="フォロワー">
              <PeopleIcon size={12} /> フォロワー {compact(u.followers_count)}
            </span>
            <span title="フォロー中">
              <PersonIcon size={12} /> フォロー中 {compact(u.followings_count)}
            </span>
            <span title="トラック数">
              <PulseIcon size={12} /> トラック {compact(u.track_count)}
            </span>
          </div>
          {u.description && <Description text={u.description} />}
        </Hero>
      ) : (
        !user.error && <SkeletonBox height={288} className="hero-skeleton" />
      )}
      <div className="page-head">{tabs}</div>
      <Results paged={paged} tracks={tab.endsWith('tracks')} />
    </>
  )
}
