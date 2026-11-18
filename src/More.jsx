import { useEffect, useRef } from 'react'
import { Button, Spinner } from '@primer/react'

/** Infinite-scroll sentinel: loads the next page as it nears the viewport of the scrolling `.content`. */
export default function More({ paged }) {
  const ref = useRef(null)
  const { next, loading, error, items, more } = paged
  useEffect(() => {
    if (!next || loading || error) return
    const el = ref.current
    // Re-created per page so a sentinel that is still visible after a short page fires again.
    const io = new IntersectionObserver(([e]) => e.isIntersecting && more(), {
      root: el.closest('.content'),
      rootMargin: '800px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [next, loading, error, items.length])

  return (
    <div ref={ref} className="more">
      {loading && items.length > 0 && <Spinner size="small" srText="続きを読み込み中" />}
      {error && (
        <Button size="small" onClick={more}>
          読み込みに失敗しました。再試行
        </Button>
      )}
    </div>
  )
}
