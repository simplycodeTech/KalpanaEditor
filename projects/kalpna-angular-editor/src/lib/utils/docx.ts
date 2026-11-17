/**
 * Dependency-free DOCX → HTML converter (runs in the browser).
 *
 * Supports: paragraphs, headings / title / quote styles, alignment, indentation,
 * bold / italic / underline / strike / sub / superscript, colours, highlight,
 * shading, font size & family, line / page breaks, tabs, hyperlinks, bulleted &
 * numbered (nested) lists, tables (colspan / rowspan / cell shading / widths),
 * inline images, text boxes content, tracked insertions (deletions are skipped).
 *
 * Old binary `.doc` files (Word 97-2003) are not supported.
 */

export interface DocxImage {
  /** Placeholder id used in the generated HTML (`src="kalpna-docx-img:<id>"`). */
  id: string;
  file: File;
}

export interface DocxResult {
  html: string;
  images: DocxImage[];
  /** Non-fatal problems (unsupported pieces that were skipped). */
  warnings: string[];
}

const IMG_PREFIX = 'kalpna-docx-img:';
export const DOCX_IMAGE_PREFIX = IMG_PREFIX;

// ---------------------------------------------------------------- ZIP reading

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  offset: number;
}

async function readZip(buffer: ArrayBuffer): Promise<Map<string, () => Promise<Uint8Array>>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // End of central directory record (search backwards, comment can be up to 64k)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a valid .docx (zip) file');
  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const offset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    entries.push({ name, method, compressedSize, offset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  const files = new Map<string, () => Promise<Uint8Array>>();
  for (const e of entries) {
    files.set(e.name, async () => {
      const lh = e.offset;
      const nameLen = view.getUint16(lh + 26, true);
      const extraLen = view.getUint16(lh + 28, true);
      const start = lh + 30 + nameLen + extraLen;
      const data = bytes.subarray(start, start + e.compressedSize);
      if (e.method === 0) return data;
      if (e.method !== 8) throw new Error('Unsupported zip compression');
      return inflate(data);
    });
  }
  return files;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as unknown as { DecompressionStream?: new (f: string) => TransformStream }).DecompressionStream;
  if (!DS) throw new Error('This browser cannot read .docx files (DecompressionStream missing)');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DS('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---------------------------------------------------------------- XML helpers

const kids = (el: Element | null | undefined, name?: string): Element[] =>
  el ? Array.from(el.children).filter((c) => !name || c.localName === name) : [];
const kid = (el: Element | null | undefined, name: string): Element | null => kids(el, name)[0] ?? null;
const attr = (el: Element | null | undefined, name: string): string | null => {
  if (!el) return null;
  for (const a of Array.from(el.attributes)) if (a.localName === name) return a.value;
  return null;
};
const isOn = (el: Element | null): boolean => {
  if (!el) return false;
  const v = attr(el, 'val');
  return v === null || !['0', 'false', 'off', 'none'].includes(v);
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');

const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000',
  darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000', white: '#ffffff'
};

const NUM_FMT: Record<string, { tag: 'ul' | 'ol'; style: string }> = {
  bullet: { tag: 'ul', style: '' },
  decimal: { tag: 'ol', style: '' },
  decimalZero: { tag: 'ol', style: 'decimal-leading-zero' },
  lowerRoman: { tag: 'ol', style: 'lower-roman' },
  upperRoman: { tag: 'ol', style: 'upper-roman' },
  lowerLetter: { tag: 'ol', style: 'lower-alpha' },
  upperLetter: { tag: 'ol', style: 'upper-alpha' },
  hindiNumbers: { tag: 'ol', style: 'devanagari' },
  hindiVowels: { tag: 'ol', style: 'devanagari' }
};

const twipsToPx = (v: string | null) => (v ? Math.round(parseInt(v, 10) / 15) : 0);
const emuToPx = (v: string | null) => (v ? Math.round(parseInt(v, 10) / 9525) : 0);
const color = (v: string | null) => (v && v !== 'auto' && /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : '');

// ---------------------------------------------------------------- converter

interface Ctx {
  rels: Map<string, { target: string; external: boolean }>;
  styles: Map<string, { name: string; basedOn: string | null; pPr: Element | null; rPr: Element | null }>;
  numbering: Map<string, Map<number, { fmt: string; start: number }>>;
  media: Map<string, () => Promise<Uint8Array>>;
  images: DocxImage[];
  imageCache: Map<string, string>;
  warnings: Set<string>;
  pending: Promise<void>[];
}

export async function convertDocx(file: File | Blob): Promise<DocxResult> {
  const zip = await readZip(await file.arrayBuffer());
  const text = async (name: string) => {
    const f = zip.get(name);
    return f ? new TextDecoder().decode(await f()) : '';
  };
  const parse = (xml: string) => (xml ? new DOMParser().parseFromString(xml, 'application/xml') : null);

  const docXml = parse(await text('word/document.xml'));
  if (!docXml || docXml.getElementsByTagName('parsererror').length) throw new Error('Could not read word/document.xml');

  const ctx: Ctx = {
    rels: new Map(),
    styles: new Map(),
    numbering: new Map(),
    media: zip,
    images: [],
    imageCache: new Map(),
    warnings: new Set(),
    pending: []
  };

  const relsXml = parse(await text('word/_rels/document.xml.rels'));
  relsXml?.documentElement && kids(relsXml.documentElement, 'Relationship').forEach((r) => {
    ctx.rels.set(attr(r, 'Id') ?? '', { target: attr(r, 'Target') ?? '', external: attr(r, 'TargetMode') === 'External' });
  });

  const stylesXml = parse(await text('word/styles.xml'));
  stylesXml?.documentElement && kids(stylesXml.documentElement, 'style').forEach((s) => {
    ctx.styles.set(attr(s, 'styleId') ?? '', {
      name: (attr(kid(s, 'name'), 'val') ?? '').toLowerCase(),
      basedOn: attr(kid(s, 'basedOn'), 'val'),
      pPr: kid(s, 'pPr'),
      rPr: kid(s, 'rPr')
    });
  });

  const numXml = parse(await text('word/numbering.xml'));
  if (numXml?.documentElement) {
    const abstract = new Map<string, Map<number, { fmt: string; start: number }>>();
    kids(numXml.documentElement, 'abstractNum').forEach((a) => {
      const levels = new Map<number, { fmt: string; start: number }>();
      kids(a, 'lvl').forEach((l) => {
        levels.set(parseInt(attr(l, 'ilvl') ?? '0', 10), {
          fmt: attr(kid(l, 'numFmt'), 'val') ?? 'decimal',
          start: parseInt(attr(kid(l, 'start'), 'val') ?? '1', 10)
        });
      });
      abstract.set(attr(a, 'abstractNumId') ?? '', levels);
    });
    kids(numXml.documentElement, 'num').forEach((n) => {
      const levels = abstract.get(attr(kid(n, 'abstractNumId'), 'val') ?? '');
      if (levels) ctx.numbering.set(attr(n, 'numId') ?? '', levels);
    });
  }

  const body = kid(docXml.documentElement, 'body');
  const html = convertBlocks(kids(body), ctx);
  await Promise.all(ctx.pending);
  return { html, images: ctx.images, warnings: Array.from(ctx.warnings) };
}

/** Converts a sequence of block-level children (body, table cell, text box…). */
function convertBlocks(nodes: Element[], ctx: Ctx): string {
  let out = '';
  // open list stack: one entry per nesting level
  const listStack: { tag: string; numId: string }[] = [];
  const closeLists = (toDepth = 0) => {
    while (listStack.length > toDepth) {
      out += `</li></${listStack.pop()!.tag}>`;
    }
  };

  const flat: Element[] = [];
  const flatten = (list: Element[]) =>
    list.forEach((n) => {
      if (n.localName === 'sdt') flatten(kids(kid(n, 'sdtContent')));
      else if (n.localName === 'customXml' || n.localName === 'smartTag') flatten(kids(n));
      else flat.push(n);
    });
  flatten(nodes);

  for (const node of flat) {
    if (node.localName === 'p') {
      const pPr = kid(node, 'pPr');
      const numPr = kid(pPr, 'numPr') ?? styleNumPr(attr(kid(pPr, 'pStyle'), 'val'), ctx);
      const numId = attr(kid(numPr, 'numId'), 'val');
      const levels = numId && numId !== '0' ? ctx.numbering.get(numId) : undefined;
      if (levels) {
        const ilvl = parseInt(attr(kid(numPr, 'ilvl'), 'val') ?? '0', 10);
        const lvl = levels.get(ilvl) ?? { fmt: 'decimal', start: 1 };
        const fmt = NUM_FMT[lvl.fmt] ?? NUM_FMT['decimal'];
        const depth = ilvl + 1;
        if (listStack.length > depth) closeLists(depth);
        if (listStack.length === depth && (listStack[depth - 1].numId !== numId || listStack[depth - 1].tag !== fmt.tag)) closeLists(depth - 1);
        if (listStack.length === depth) {
          out += '</li><li>';
        } else {
          while (listStack.length < depth) {
            const isTarget = listStack.length === depth - 1;
            const f = isTarget ? fmt : { tag: 'ul' as const, style: '' };
            const attrs = (f.style ? ` style="list-style-type: ${f.style}"` : '') + (isTarget && f.tag === 'ol' && lvl.start !== 1 ? ` start="${lvl.start}"` : '');
            out += `<${f.tag}${attrs}><li>`;
            listStack.push({ tag: f.tag, numId: numId! });
          }
        }
        out += paragraphInner(node, ctx, true) || '<br>';
        continue;
      }
      closeLists();
      out += paragraph(node, ctx);
    } else if (node.localName === 'tbl') {
      closeLists();
      out += table(node, ctx);
    }
  }
  closeLists();
  return out;
}

function styleNumPr(styleId: string | null, ctx: Ctx): Element | null {
  let id = styleId;
  for (let i = 0; id && i < 10; i++) {
    const st = ctx.styles.get(id);
    const np = kid(st?.pPr, 'numPr');
    if (np) return np;
    id = st?.basedOn ?? null;
  }
  return null;
}

function styleName(styleId: string | null, ctx: Ctx): string {
  return styleId ? ctx.styles.get(styleId)?.name ?? styleId.toLowerCase() : '';
}

function paragraph(p: Element, ctx: Ctx): string {
  const pPr = kid(p, 'pPr');
  const name = styleName(attr(kid(pPr, 'pStyle'), 'val'), ctx);
  let tag = 'p';
  const h = name.match(/^heading\s*([1-6])$/);
  if (h) tag = 'h' + h[1];
  else if (name === 'title') tag = 'h1';
  else if (name === 'subtitle') tag = 'h2';
  else if (name.includes('quote')) tag = 'blockquote';

  const styles: string[] = [];
  const jc = attr(kid(pPr, 'jc'), 'val');
  if (jc === 'center') styles.push('text-align: center');
  else if (jc === 'right' || jc === 'end') styles.push('text-align: right');
  else if (jc === 'both' || jc === 'distribute') styles.push('text-align: justify');
  const ind = kid(pPr, 'ind');
  const left = twipsToPx(attr(ind, 'left') ?? attr(ind, 'start'));
  if (left > 0) styles.push(`margin-left: ${left}px`);
  const first = twipsToPx(attr(ind, 'firstLine'));
  if (first > 0) styles.push(`text-indent: ${first}px`);
  const shd = color(attr(kid(pPr, 'shd'), 'fill'));
  if (shd) styles.push(`background-color: ${shd}`);
  const dir = isOn(kid(pPr, 'bidi')) ? ' dir="rtl"' : '';

  const before = isOn(kid(pPr, 'pageBreakBefore')) ? PAGE_BREAK : '';
  const inner = paragraphInner(p, ctx, false);
  const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';
  const block = tag === 'blockquote' ? `<blockquote><p${styleAttr}${dir}>${inner || '<br>'}</p></blockquote>` : `<${tag}${styleAttr}${dir}>${inner || '<br>'}</${tag}>`;
  // split on explicit page breaks inside the paragraph
  return before + block.replace(/<kalpna-pb><\/kalpna-pb>/g, `</${tag === 'blockquote' ? 'p></blockquote' : tag}>${PAGE_BREAK}<${tag === 'blockquote' ? 'blockquote><p' : tag}${styleAttr}>`);
}

const PAGE_BREAK = '<div class="page-break" contenteditable="false" style="page-break-after: always"></div>';

function paragraphInner(p: Element, ctx: Ctx, inList: boolean): string {
  const pPr = kid(p, 'pPr');
  const paraStyleRPr = styleRunProps(attr(kid(pPr, 'pStyle'), 'val'), ctx);
  let out = '';
  const walk = (nodes: Element[]) => {
    for (const n of nodes) {
      switch (n.localName) {
        case 'r':
          out += run(n, ctx, paraStyleRPr, inList);
          break;
        case 'hyperlink': {
          const id = attr(n, 'id');
          const anchor = attr(n, 'anchor');
          const rel = id ? ctx.rels.get(id) : undefined;
          const href = rel?.target ?? (anchor ? '#' + anchor : '');
          const inner = kids(n).map((c) => (c.localName === 'r' ? run(c, ctx, paraStyleRPr, inList) : '')).join('');
          out += href && /^(https?:|mailto:|tel:|#)/i.test(href) ? `<a href="${escAttr(href)}"${rel?.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner}</a>` : inner;
          break;
        }
        case 'ins':
        case 'smartTag':
        case 'customXml':
        case 'fldSimple':
          walk(kids(n));
          break;
        case 'sdt':
          walk(kids(kid(n, 'sdtContent')));
          break;
        case 'del':
        case 'pPr':
        case 'bookmarkStart':
        case 'bookmarkEnd':
        case 'proofErr':
          break;
        default:
          break;
      }
    }
  };
  walk(kids(p));
  return out;
}

function styleRunProps(styleId: string | null, ctx: Ctx): Element[] {
  const chain: Element[] = [];
  let id = styleId;
  for (let i = 0; id && i < 10; i++) {
    const st = ctx.styles.get(id);
    if (st?.rPr) chain.unshift(st.rPr);
    id = st?.basedOn ?? null;
  }
  return chain;
}

function run(r: Element, ctx: Ctx, inherited: Element[], inList: boolean): string {
  const rPr = kid(r, 'rPr');
  const charStyle = styleRunProps(attr(kid(rPr, 'rStyle'), 'val'), ctx);
  const props = [...charStyle, ...(rPr ? [rPr] : [])];
  const get = (name: string): Element | null => {
    for (let i = props.length - 1; i >= 0; i--) {
      const e = kid(props[i], name);
      if (e) return e;
    }
    return null;
  };
  // headings carry their own weight / size; only take explicit run formatting from inherited styles for colour
  void inherited;

  let content = '';
  for (const c of kids(r)) {
    switch (c.localName) {
      case 't':
        content += esc(c.textContent ?? '').replace(/ {2}/g, '  ');
        break;
      case 'tab':
        content += '    ';
        break;
      case 'br':
      case 'cr':
        content += attr(c, 'type') === 'page' && !inList ? '<kalpna-pb></kalpna-pb>' : '<br>';
        break;
      case 'noBreakHyphen':
        content += '‑';
        break;
      case 'softHyphen':
        content += '­';
        break;
      case 'sym': {
        const ch = attr(c, 'char');
        if (ch) {
          const code = parseInt(ch, 16);
          content += esc(String.fromCharCode(code >= 0xf000 ? code - 0xf000 : code));
        }
        break;
      }
      case 'drawing':
        content += drawing(c, ctx);
        break;
      case 'pict':
      case 'object': {
        const imagedata = c.getElementsByTagName('v:imagedata')[0];
        const id = attr(imagedata, 'id');
        if (id) content += imageTag(id, '', 0, ctx);
        const txbx = c.getElementsByTagName('w:txbxContent')[0];
        if (txbx) content += convertBlocks(kids(txbx), ctx).replace(/<\/?p[^>]*>/g, ' ');
        break;
      }
      case 'AlternateContent': {
        const choice = kid(c, 'Choice') ?? kid(c, 'Fallback');
        const d = choice ? kid(choice, 'drawing') : null;
        if (d) content += drawing(d, ctx);
        break;
      }
      case 'footnoteReference':
      case 'endnoteReference':
        ctx.warnings.add('Footnotes / endnotes are not imported.');
        break;
      default:
        break;
    }
  }
  if (!content) return '';

  if (isOn(get('vanish'))) return '';
  const styles: string[] = [];
  const c = color(attr(get('color'), 'val'));
  if (c) styles.push(`color: ${c}`);
  const hl = attr(get('highlight'), 'val');
  const shd = color(attr(get('shd'), 'fill'));
  if (hl && HIGHLIGHT[hl]) styles.push(`background-color: ${HIGHLIGHT[hl]}`);
  else if (shd) styles.push(`background-color: ${shd}`);
  if (rPr) {
    const sz = attr(kid(rPr, 'sz'), 'val');
    if (sz) styles.push(`font-size: ${parseInt(sz, 10) / 2}pt`);
    const fonts = kid(rPr, 'rFonts');
    const font = attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? attr(fonts, 'cs');
    if (font) styles.push(`font-family: '${font.replace(/['"]/g, '')}'`);
  }
  if (isOn(get('caps'))) styles.push('text-transform: uppercase');
  if (isOn(get('smallCaps'))) styles.push('font-variant: small-caps');

  let html = content;
  if (styles.length) html = `<span style="${styles.join('; ')}">${html}</span>`;
  const va = attr(get('vertAlign'), 'val');
  if (va === 'superscript') html = `<sup>${html}</sup>`;
  if (va === 'subscript') html = `<sub>${html}</sub>`;
  if (isOn(get('strike')) || isOn(get('dstrike'))) html = `<s>${html}</s>`;
  const u = get('u');
  if (u && attr(u, 'val') !== 'none') html = `<u>${html}</u>`;
  if (isOn(get('i')) || isOn(get('iCs'))) html = `<em>${html}</em>`;
  if (isOn(get('b')) || isOn(get('bCs'))) html = `<strong>${html}</strong>`;
  return html;
}

function drawing(d: Element, ctx: Ctx): string {
  const blip = d.getElementsByTagNameNS('*', 'blip')[0];
  const id = attr(blip, 'embed');
  if (!id) return '';
  const extent = d.getElementsByTagNameNS('*', 'extent')[0];
  const width = emuToPx(attr(extent, 'cx'));
  const docPr = d.getElementsByTagNameNS('*', 'docPr')[0];
  const alt = attr(docPr, 'descr') ?? attr(docPr, 'title') ?? '';
  return imageTag(id, alt, width, ctx);
}

function imageTag(relId: string, alt: string, width: number, ctx: Ctx): string {
  const rel = ctx.rels.get(relId);
  if (!rel) return '';
  if (rel.external) {
    return /^https?:/i.test(rel.target) ? `<img src="${escAttr(rel.target)}" alt="${escAttr(alt)}"${width ? ` style="width: ${width}px"` : ''}>` : '';
  }
  const path = rel.target.startsWith('/') ? rel.target.slice(1) : 'word/' + rel.target.replace(/^\.\//, '');
  let id = ctx.imageCache.get(path);
  if (!id) {
    const loader = ctx.media.get(path);
    if (!loader) return '';
    id = 'i' + ctx.imageCache.size;
    ctx.imageCache.set(path, id);
    const ext = (path.split('.').pop() ?? '').toLowerCase();
    const mime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' };
    if (!mime[ext]) {
      ctx.warnings.add(`Image format .${ext} is not supported and was skipped.`);
      return '';
    }
    const imgId = id;
    ctx.pending.push(
      loader().then((data) => {
        ctx.images.push({ id: imgId, file: new File([data as BlobPart], path.split('/').pop() ?? 'image.' + ext, { type: mime[ext] }) });
      })
    );
  }
  return `<img src="${IMG_PREFIX}${id}" alt="${escAttr(alt)}"${width ? ` style="width: ${width}px"` : ''}>`;
}

function table(tbl: Element, ctx: Ctx): string {
  const tblPr = kid(tbl, 'tblPr');
  const rows = kids(tbl, 'tr');
  // grid of cells with vMerge info to compute rowspans
  type C = { tc: Element; col: number; span: number; vmerge: string | null; rowspan: number; skip: boolean };
  const grid: C[][] = rows.map((tr) => {
    let col = 0;
    const cells: C[] = [];
    const gridBefore = parseInt(attr(kid(kid(tr, 'trPr'), 'gridBefore'), 'val') ?? '0', 10);
    col += gridBefore;
    kids(tr).forEach((tc) => {
      const cellsInSdt = tc.localName === 'sdt' ? kids(kid(tc, 'sdtContent'), 'tc') : tc.localName === 'tc' ? [tc] : [];
      cellsInSdt.forEach((cell) => {
        const tcPr = kid(cell, 'tcPr');
        const span = parseInt(attr(kid(tcPr, 'gridSpan'), 'val') ?? '1', 10) || 1;
        const vm = kid(tcPr, 'vMerge');
        cells.push({ tc: cell, col, span, vmerge: vm ? attr(vm, 'val') ?? 'continue' : null, rowspan: 1, skip: false });
        col += span;
      });
    });
    return cells;
  });
  grid.forEach((row, r) =>
    row.forEach((c) => {
      if (c.vmerge === 'restart') {
        for (let k = r + 1; k < grid.length; k++) {
          const below = grid[k].find((x) => x.col === c.col);
          if (below && below.vmerge === 'continue') {
            below.skip = true;
            c.rowspan++;
          } else break;
        }
      }
    })
  );
  const borders = kid(tblPr, 'tblBorders');
  const hasBorders = !borders || kids(borders).some((b) => attr(b, 'val') !== 'nil' && attr(b, 'val') !== 'none');
  const cellBorder = hasBorders ? 'border: 1px solid #bfbfbf; ' : '';
  const jc = attr(kid(tblPr, 'jc'), 'val');
  const tStyle = ['border-collapse: collapse', 'width: 100%'];
  if (jc === 'center') tStyle.push('margin-left: auto', 'margin-right: auto');
  let html = `<table style="${tStyle.join('; ')}"><tbody>`;
  grid.forEach((row, r) => {
    const isHeader = isOn(kid(kid(rows[r], 'trPr'), 'tblHeader'));
    html += '<tr>';
    row.forEach((c) => {
      if (c.skip) return;
      const tcPr = kid(c.tc, 'tcPr');
      const st: string[] = [`${cellBorder}padding: 6px 8px`];
      const fill = color(attr(kid(tcPr, 'shd'), 'fill'));
      if (fill) st.push(`background-color: ${fill}`);
      const va = attr(kid(tcPr, 'vAlign'), 'val');
      if (va === 'center') st.push('vertical-align: middle');
      else if (va === 'bottom') st.push('vertical-align: bottom');
      const tag = isHeader ? 'th' : 'td';
      const spans = (c.span > 1 ? ` colspan="${c.span}"` : '') + (c.rowspan > 1 ? ` rowspan="${c.rowspan}"` : '');
      let inner = convertBlocks(kids(c.tc), ctx);
      // single paragraph cells: unwrap the <p> for compact tables
      const single = inner.match(/^<p>(.*)<\/p>$/s);
      if (single && !single[1].includes('<p')) inner = single[1];
      html += `<${tag}${spans} style="${st.join('; ')}">${inner || '<br>'}</${tag}>`;
    });
    html += '</tr>';
  });
  return html + '</tbody></table>';
}
