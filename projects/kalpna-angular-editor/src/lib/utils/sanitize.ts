/**
 * HTML sanitization utilities for Kalpna Angular Editor.
 * Prevents XSS from paste, source mode, links, media embeds and image URLs.
 * Consuming applications must still sanitize content when storing or rendering
 * outside this editor according to their own security requirements.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'mark', 'small', 'kbd',
  'a', 'img', 'figure', 'figcaption', 'iframe',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'hr'
]);

/** Elements whose whole content is dropped (not unwrapped). */
const DROP_WITH_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'object', 'embed', 'svg', 'math', 'textarea', 'select', 'button', 'input', 'form', 'meta', 'link', 'title', 'head']);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel', 'name', 'id']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan', 'scope']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span', 'width']),
  ol: new Set(['start', 'reversed', 'type']),
  li: new Set(['data-checked', 'value']),
  pre: new Set(['data-language', 'spellcheck']),
  iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'title']),
  div: new Set(['data-oembed-url', 'contenteditable']),
  figure: new Set(['contenteditable']),
  span: new Set(['data-mention']),
  '*': new Set(['style', 'class', 'dir', 'lang', 'title'])
};

const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg)/i;
const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#|data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,)/i;

/** Hosts whose embed players may be rendered inside iframes. */
const SAFE_IFRAME_RE = /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/|(www\.)?dailymotion\.com\/embed\/video\/|open\.spotify\.com\/embed\/|google\.com\/maps\/embed|maps\.google\.com\/maps|facebook\.com\/plugins\/video\.php|player\.twitch\.tv\/|w\.soundcloud\.com\/player\/)/i;

/** Allowed CSS properties in style attributes (lowercase). */
const ALLOWED_STYLES = new Set([
  'color', 'background', 'background-color',
  'font-size', 'font-family', 'font-weight', 'font-style', 'font-variant',
  'text-decoration', 'text-decoration-line', 'text-align', 'text-indent', 'text-transform',
  'line-height', 'letter-spacing', 'white-space', 'direction',
  'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'aspect-ratio',
  'display', 'float', 'clear', 'vertical-align', 'list-style-type', 'position', 'top', 'left', 'inset',
  'border', 'border-collapse', 'border-color', 'border-width', 'border-style', 'border-spacing',
  'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'page-break-after', 'page-break-before', 'break-after', 'break-before', 'table-layout', 'overflow'
]);

const POSITION_VALUES = new Set(['relative', 'static']);

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed || DANGEROUS_URL_RE.test(trimmed)) {
    return false;
  }
  // Relative paths and fragments are allowed
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  return SAFE_URL_RE.test(trimmed);
}

/** True when an iframe src points to a known, safe embed player. */
export function isSafeIframeSrc(url: string | null | undefined): boolean {
  return !!url && SAFE_IFRAME_RE.test(url.trim());
}

function sanitizeStyle(style: string, tag = ''): string {
  return style
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => {
      if (!rule) return false;
      const colon = rule.indexOf(':');
      if (colon === -1) return false;
      const prop = rule.slice(0, colon).trim().toLowerCase();
      const value = rule.slice(colon + 1).trim().toLowerCase();
      if (!ALLOWED_STYLES.has(prop)) return false;
      // Block expression(), url(...) and script-ish values
      if (value.includes('expression') || value.includes('javascript:') || value.includes('vbscript:') || value.includes('url(') || value.includes('behavior')) {
        return false;
      }
      if (prop === 'position' && !POSITION_VALUES.has(value) && !(tag === 'iframe' && value === 'absolute')) return false;
      return true;
    })
    .join('; ');
}

function isAttrAllowed(tag: string, attr: string): boolean {
  const lower = attr.toLowerCase();
  if (lower.startsWith('on')) return false;
  const specific = ALLOWED_ATTRS[tag];
  if (specific?.has(lower)) return true;
  return ALLOWED_ATTRS['*']?.has(lower) ?? false;
}

/**
 * Sanitize untrusted HTML for safe insertion into the editor.
 * Strips disallowed tags/attributes and dangerous URLs.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/html');

  const walk = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (DROP_WITH_CONTENT.has(tag)) {
          node.removeChild(el);
          continue;
        }

        if (!ALLOWED_TAGS.has(tag)) {
          // Unwrap: keep children, remove element
          while (el.firstChild) {
            node.insertBefore(el.firstChild, el);
          }
          node.removeChild(el);
          continue;
        }

        if (tag === 'iframe' && !isSafeIframeSrc(el.getAttribute('src'))) {
          node.removeChild(el);
          continue;
        }

        // Filter attributes
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          if (!isAttrAllowed(tag, name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if ((name === 'href' || name === 'src') && tag !== 'iframe') {
            if (!isSafeUrl(attr.value)) {
              el.removeAttribute(attr.name);
            }
          }
          if (name === 'contenteditable' && attr.value !== 'false') {
            el.removeAttribute(attr.name);
          }
          if (name === 'data-oembed-url' && !isSafeUrl(attr.value)) {
            el.removeAttribute(attr.name);
          }
          if (name === 'style') {
            const cleaned = sanitizeStyle(attr.value, tag);
            if (cleaned) {
              el.setAttribute('style', cleaned);
            } else {
              el.removeAttribute('style');
            }
          }
          if (name === 'target' && attr.value === '_blank') {
            el.setAttribute('rel', 'noopener noreferrer');
          }
        }

        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

/**
 * Sanitize pasted HTML: strip Word / Google Docs noise then run full sanitize.
 */
export function sanitizePastedHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Remove Word/Office specific elements
  doc.querySelectorAll('o\\:p, w\\:sdt, w\\:sdtpr, w\\:listitem, xml, meta, link, style, script, title').forEach((el) => el.remove());

  // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">
  doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach((b) => {
    const parent = b.parentNode;
    if (!parent) return;
    while (b.firstChild) parent.insertBefore(b.firstChild, b);
    parent.removeChild(b);
  });

  // Word list paragraphs (MsoListParagraph) → real lists
  convertWordLists(doc);

  doc.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.removeAttribute('lang');
    const cls = el.getAttribute('class') || '';
    if (/Mso|docs-|Apple-/i.test(cls)) el.removeAttribute('class');
    // Strip mso- styles early
    if (el.hasAttribute('style')) {
      const style = el.getAttribute('style') || '';
      const cleaned = style
        .split(';')
        .filter((rule) => {
          const t = rule.trim().toLowerCase();
          return t && !t.includes('mso-') && !t.includes('tab-stops') && !t.startsWith('font-variant-') && !t.startsWith('white-space') && !t.startsWith('font-family:"times new roman"');
        })
        .join(';');
      if (cleaned.trim()) {
        el.setAttribute('style', cleaned);
      } else {
        el.removeAttribute('style');
      }
    }
  });

  return sanitizeHtml(doc.body.innerHTML);
}

/** Best-effort conversion of Word "MsoListParagraph" paragraphs into ul/ol. */
function convertWordLists(doc: Document): void {
  const paras = Array.from(doc.querySelectorAll('p')).filter(
    (p) => /mso-list:/i.test(p.getAttribute('style') || '') || /MsoListParagraph/i.test(p.className)
  );
  let currentList: HTMLElement | null = null;
  for (const p of paras) {
    // remove the bullet / number marker spans Word injects
    let marker = '';
    p.querySelectorAll('span').forEach((s) => {
      if (/mso-list:\s*Ignore/i.test(s.getAttribute('style') || '')) {
        marker += s.textContent || '';
        s.remove();
      }
    });
    const ordered = /^\s*(\d+|[a-z]|[ivxlc]+)[.)]/i.test(marker);
    const wantTag = ordered ? 'OL' : 'UL';
    const prev = p.previousElementSibling;
    if (!currentList || prev !== currentList || currentList.tagName !== wantTag) {
      currentList = doc.createElement(wantTag.toLowerCase());
      p.parentNode?.insertBefore(currentList, p);
    }
    const li = doc.createElement('li');
    while (p.firstChild) li.appendChild(p.firstChild);
    currentList.appendChild(li);
    p.remove();
  }
}

/** Validate and normalize a link URL; returns null if unsafe. */
export function normalizeLinkUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  // Allow relative and common schemes
  if (isSafeUrl(trimmed)) {
    return trimmed;
  }
  // Email address → mailto:
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'mailto:' + trimmed;
  }
  // Try adding https:// for bare domains
  if (/^[\w.-]+\.[\w.-]+/.test(trimmed) && isSafeUrl('https://' + trimmed)) {
    return 'https://' + trimmed;
  }
  return null;
}
