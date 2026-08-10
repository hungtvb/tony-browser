// In-page Reader extraction (issue #55).
// Builds a self-contained script that runs INSIDE the page via
// webContents.executeJavaScript and returns ONLY the trimmed article payload
// as JSON — no full-page HTML string ever crosses the IPC boundary.
// (extract.ts keeps the HTML-string variant + its unit tests; this is the
// DOM-based in-page twin used by the reader:extract IPC handler.)

const BLOCK_TAGS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'header', 'footer', 'aside', 'form',
]
const REMOVE_CLASSES = [
  'ad', 'ads', 'advert', 'banner', 'popup', 'modal', 'cookie', 'newsletter',
  'related', 'menu', 'nav', 'footer', 'header', 'sidebar', 'share', 'social', 'author',
]

export function buildExtractScript(): string {
  return `(() => {
    const BLOCK_TAGS = ${JSON.stringify(BLOCK_TAGS)};
    const REMOVE_CLASSES = ${JSON.stringify(REMOVE_CLASSES)};
    const doc = document;
    let title = (doc.title || '').trim();

    // Prefer <article>, then <main>/#content/.content/.main, then body
    let root = doc.querySelector('article')
      || doc.querySelector('main')
      || doc.querySelector('#content')
      || doc.querySelector('.content, .main')
      || doc.body;
    if (!root) return JSON.stringify({ title, content: '', length: 0 });

    // Work on a clone so the live page is not mutated
    const clone = root.cloneNode(true);
    clone.querySelectorAll(BLOCK_TAGS.join(',')).forEach((el: Element) => el.remove());
    REMOVE_CLASSES.forEach((cls: string) => {
      clone.querySelectorAll('[class*="' + cls + '"], [id*="' + cls + '"]')
        .forEach((el: Element) => el.remove());
    });

    const text = (clone.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!title) {
      const h1 = doc.querySelector('h1');
      if (h1) title = (h1.textContent || '').trim();
    }
    return JSON.stringify({ title, content: text, length: text.length });
  })()`
}
