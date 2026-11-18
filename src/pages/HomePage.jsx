import { Blankslate } from '@primer/react/experimental'
import { SearchIcon } from '@primer/octicons-react'

export default function HomePage() {
  return (
    <Blankslate spacious>
      <Blankslate.Visual>
        <SearchIcon size="medium" />
      </Blankslate.Visual>
      <Blankslate.Heading>曲を探す</Blankslate.Heading>
      <Blankslate.Description>上の検索ボックスに曲名・アーティスト名・アルバム名を入力してください。</Blankslate.Description>
    </Blankslate>
  )
}
