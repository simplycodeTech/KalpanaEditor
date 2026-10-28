/**
 * HTML sanitization utilities for Kalpna Angular Editor.
 * Prevents XSS from paste, source mode, links, and image URLs.
 * Consuming applications must still sanitize content when storing or rendering
 * outside this editor according to their own security requirements.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'hr'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'style']),
  td: new Set(['colspan', 'rowspan', 'style']),
  th: new Set(['colspan', 'rowspan', 'style']),
  '*': new Set(['style', 'class'])
};

const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg)/i;
const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,)/i;

/** Allowed CSS properties in style attributes (lowercase). */
const ALLOWED_STYLES = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'line-height',
  'margin',
  'margin-left',
  'margin-right',
  'margin-top',
  'margin-bottom',
  'padding',
  'padding-left',
  'width',
  'height',
  'max-width',
  'display',
  'vertical-align',
  'border',
  'border-collapse',
  'border-color',
  'border-width',
  'border-style'
]);

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

function sanitizeStyle(style: string): string {
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
      // Block expression() and url(javascript:...)
      if (value.includes('expression') || value.includes('javascript:') || value.includes('vbscript:')) {
        return false;
      }
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

        if (!ALLOWED_TAGS.has(tag)) {
          // Unwrap: keep children, remove element
          while (el.firstChild) {
            node.insertBefore(el.firstChild, el);
          }
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
          if (name === 'href' || name === 'src') {
            if (!isSafeUrl(attr.value)) {
              el.removeAttribute(attr.name);
            }
          }
          if (name === 'style') {
            const cleaned = sanitizeStyle(attr.value);
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
 * Sanitize pasted HTML: strip Word noise then run full sanitize.
 */
export function sanitizePastedHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Remove Word/Office specific elements
  doc.querySelectorAll('o\\:p, w\\:sdt, w\\:sdtpr, w\\:listitem, xml, meta, link, style, script').forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.removeAttribute('lang');
    el.removeAttribute('class');
    // Strip mso- styles early
    if (el.hasAttribute('style')) {
      const style = el.getAttribute('style') || '';
      const cleaned = style
        .split(';')
        .filter((rule) => {
          const t = rule.trim().toLowerCase();
          return t && !t.includes('mso-') && !t.includes('tab-stops');
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

/** Validate and normalize a link URL; returns null if unsafe. */
export function normalizeLinkUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  // Allow relative and common schemes
  if (isSafeUrl(trimmed)) {
    return trimmed;
  }
  // Try adding https:// for bare domains
  if (/^[\w.-]+\.[\w.-]+/.test(trimmed) && isSafeUrl('https://' + trimmed)) {
    return 'https://' + trimmed;
  }
  return null;
}
