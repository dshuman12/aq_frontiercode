import { memo, useMemo, useState, type RefObject } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import FloatingWindow from '../../game/components/FloatingWindow'
import { newsPosts } from '../news/newsPosts'

type FloatingRect = {
  x: number
  y: number
  width: number
  height: number
}

type NewsFeedFloatingWindowProps = {
  containerRef: RefObject<HTMLElement | null>
  initialRect: FloatingRect
  className?: string
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function NewsFeedFloatingWindow({
  containerRef,
  initialRect,
  className,
}: NewsFeedFloatingWindowProps) {
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const openPost = useMemo(
    () => newsPosts.find((post) => post.id === openPostId) ?? null,
    [openPostId],
  )
  const detailsRect = useMemo(() => {
    if (typeof window === 'undefined') {
      return { x: 430, y: 160, width: 560, height: 500 }
    }
    const width = Math.round(clamp(window.innerWidth * 0.4, 380, window.innerWidth * 0.56))
    const height = Math.round(clamp(window.innerHeight * 0.62, 320, window.innerHeight * 0.82))
    return {
      x: Math.round(clamp(window.innerWidth * 0.44, 8, window.innerWidth - width - 8)),
      y: Math.round(clamp(window.innerHeight * 0.18, 8, window.innerHeight - height - 8)),
      width,
      height,
    }
  }, [])

  return (
    <>
      <FloatingWindow
        title="News Feed"
        containerRef={containerRef}
        initialRect={initialRect}
        resizable={false}
        minWidth={300}
        minHeight={260}
        className={`news-feed-floating-window ${className ?? ''}`.trim()}
      >
        <section className="news-feed-window-content" aria-label="News">
          <div className="news-feed-post-list">
            {newsPosts.map((post) => {
              const isOpen = post.id === openPostId
              return (
                <article
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setOpenPostId(post.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setOpenPostId(post.id)
                    }
                  }}
                  className={`news-feed-post-card ${isOpen ? 'news-feed-post-card-active' : 'news-feed-post-card-idle'}`}
                >
                  <div className="news-feed-post-meta">
                    <span className="news-feed-post-version">
                      {post.version}
                    </span>
                    <span>{post.date}</span>
                  </div>
                  <h2 className="news-feed-post-title">
                    {post.title}
                  </h2>
                  <p className="news-feed-post-description">
                    {post.description}
                  </p>
                  <div className="pt-0.5">
                    <span className="news-feed-post-open-tag">
                      Open in window
                      <span aria-hidden>↗</span>
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </FloatingWindow>
      {openPost ? (
        <FloatingWindow
          title={openPost.title}
          containerRef={containerRef}
          initialRect={detailsRect}
          minWidth={360}
          minHeight={300}
          zIndex={7}
          className={`news-feed-floating-window ${className ?? ''}`.trim()}
          onClose={() => {
            setOpenPostId(null)
          }}
        >
          <section className="news-feed-details-window-content" aria-label={`${openPost.title} details`}>
            <div className="news-feed-details-scroll">
              <div className="news-feed-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{openPost.contentMarkdown}</ReactMarkdown>
              </div>
            </div>
          </section>
        </FloatingWindow>
      ) : null}
    </>
  )
}

export default memo(NewsFeedFloatingWindow)
