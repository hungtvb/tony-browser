// Reader Mode — extract clean content from page HTML
export interface ArticleResult {
  title: string
  content: string
  length: number
}

// Tags/elements to remove entirely (open + content + close)
const BLOCK_TAGS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'header', 'footer', 'aside', 'form',
]
// Classes/ids containing ads, menus, auxiliary content
const REMOVE_CLASSES = [
  'ad', 'ads', 'advert', 'banner', 'popup', 'modal', 'cookie', 'newsletter',
  'related', 'menu', 'nav', 'footer', 'header', 'sidebar', 'share', 'social', 'author',
]

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function extractArticle(html: string): ArticleResult {
  let title = ''
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch) title = titleMatch[1].trim()

  // Prefer <article>, then #content/.main, then body
  let contentHtml = ''
  const article = html.match(/<article[\s\S]*?<\/article>/i)
  if (article) {
    contentHtml = article[0]
  } else {
    const main = html.match(/<(?:div|main)[^>]*(?:id|class)="[^"]*(?:content|main|article)[^"]*"[\s\S]*?<\/(?:div|main)>/i)
    if (main) contentHtml = main[0]
    else contentHtml = html
  }

  // Remove auxiliary elements inside content (block tags)
  for (const tag of BLOCK_TAGS) {
    contentHtml = contentHtml.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), ' ')
  }

  // Remove elements whose class/id contains ad/auxiliary keywords
  for (const cls of REMOVE_CLASSES) {
    contentHtml = contentHtml.replace(
      new RegExp(`<[a-z]+[^>]*(?:class|id)="[^"]*${cls}[^"]*"[^>]*>[\\s\\S]*?</[a-z]+>`, 'gi'),
      ' ',
    )
    contentHtml = contentHtml.replace(
      new RegExp(`<[a-z]+[^>]*(?:class|id)="[^"]*${cls}[^"]*"[^>]*/?>`, 'gi'),
      ' ',
    )
  }

  const text = collapseWhitespace(stripTags(contentHtml))
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
    if (h1) title = h1[1].trim()
  }
  return { title, content: text, length: text.length }
}