export type NewsPost = {
  id: string
  version: string
  date: string
  order: number
  title: string
  description: string
  summaryMarkdown: string
  detailsMarkdown: string
  contentMarkdown: string
}

type NewsPostFrontmatter = {
  id: string
  version: string
  date: string
  order: number
}

const markdownModules = import.meta.glob('./*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function trimWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function sourcePathToSlug(sourcePath: string): string {
  const fileName = sourcePath.split('/').pop() ?? sourcePath
  return fileName.replace(/\.md$/i, '')
}

function parseFrontmatter(rawMarkdown: string, sourcePath: string): { meta: NewsPostFrontmatter; body: string } {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim()
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  const fallbackId = sourcePathToSlug(sourcePath)

  if (!match) {
    console.warn(`[NewsFeed] Missing frontmatter in ${sourcePath}. Using fallback metadata.`)
    return {
      meta: {
        id: fallbackId,
        version: fallbackId,
        date: 'Undated',
        order: Number.MAX_SAFE_INTEGER,
      },
      body: normalized,
    }
  }

  const frontmatterBlock = match[1]
  const body = match[2].trim()
  const fields: Record<string, string> = {}
  for (const line of frontmatterBlock.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator < 0) continue
    const key = trimmed.slice(0, separator).trim().toLowerCase()
    const value = trimWrappingQuotes(trimmed.slice(separator + 1))
    fields[key] = value
  }

  const id = fields.id || fallbackId
  const version = fields.version || id
  const date = fields.date || 'Undated'
  const parsedOrder = Number.parseInt(fields.order ?? '', 10)
  const order = Number.isFinite(parsedOrder) ? parsedOrder : Number.MAX_SAFE_INTEGER

  return {
    meta: { id, version, date, order },
    body,
  }
}

function splitNewsMarkdown(markdown: string): Pick<NewsPost, 'summaryMarkdown' | 'detailsMarkdown'> {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  const summaryMatch = normalized.match(/##\s+Summary\s*([\s\S]*?)(?=\n##\s+Details\b|$)/i)
  const detailsMatch = normalized.match(/##\s+Details\s*([\s\S]*)$/i)
  return {
    summaryMarkdown: summaryMatch?.[1].trim() ?? normalized,
    detailsMarkdown: detailsMatch?.[1].trim() ?? '',
  }
}

function parseBodyMetadata(markdown: string): Pick<NewsPost, 'title' | 'description'> {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  const titleMatch = normalized.match(/^#\s+(.+)$/m)
  const lines = normalized.split('\n')
  let sawTitle = false
  let description = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!sawTitle) {
      if (/^#\s+/.test(trimmed)) sawTitle = true
      continue
    }
    if (!trimmed || /^#+\s+/.test(trimmed)) continue
    description = trimmed
    break
  }
  return {
    title: titleMatch?.[1]?.trim() ?? 'Untitled Update',
    description,
  }
}

function parseNewsPost(sourcePath: string, rawMarkdown: string): NewsPost {
  const { meta, body } = parseFrontmatter(rawMarkdown, sourcePath)
  const sections = splitNewsMarkdown(body)
  const bodyMeta = parseBodyMetadata(body)
  return {
    id: meta.id,
    version: meta.version,
    date: meta.date,
    title: bodyMeta.title,
    description: bodyMeta.description,
    summaryMarkdown: sections.summaryMarkdown,
    detailsMarkdown: sections.detailsMarkdown,
    contentMarkdown: body,
    order: meta.order,
  }
}

const loadedPosts = Object.entries(markdownModules)
  .map(([sourcePath, rawMarkdown]) => parseNewsPost(sourcePath, rawMarkdown))
  .sort((a, b) => a.order - b.order)

export const newsPosts: NewsPost[] = loadedPosts
