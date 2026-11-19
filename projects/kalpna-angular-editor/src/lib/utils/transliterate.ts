/**
 * Offline Latin → Marathi / Hindi (Devanagari) transliteration.
 *
 *   namaskar → नमस्कार   shala → शाळा   maharashtra → महाराष्ट्र   dnyan → ज्ञान
 *
 * 1. Phonetic rules (ITRANS-like, case-sensitive for retroflex letters:
 *    T ट, D ड, N ण, L ळ, Sh ष; aa/A आ, ee/ii/I ई, oo/uu/U ऊ, x/ksh क्ष, dny ज्ञ, M ं, H ः).
 * 2. A word list (see marathi-words.ts) matched with a "loose" key so that
 *    long/short vowels, retroflex/dental and schwa differences still find the word.
 * 3. Words the user picked before ("learned") and a custom dictionary come first.
 */
import { MARATHI_WORDS } from './marathi-words';
import { HINDI_WORDS } from './hindi-words';

/** Indian typing languages supported by the transliterator. */
export type KalpnaTypingLanguage = 'mr' | 'hi';

type Tok = { k: 'C' | 'V' | 'M' | 'O'; s: string; dev: string; matra?: string };

const VOWELS: Record<string, [string, string]> = {
  a: ['अ', ''], aa: ['आ', 'ा'], A: ['आ', 'ा'],
  i: ['इ', 'ि'], ii: ['ई', 'ी'], ee: ['ई', 'ी'], I: ['ई', 'ी'],
  u: ['उ', 'ु'], uu: ['ऊ', 'ू'], oo: ['ऊ', 'ू'], U: ['ऊ', 'ू'],
  e: ['ए', 'े'], ai: ['ऐ', 'ै'], o: ['ओ', 'ो'], au: ['औ', 'ौ'], ou: ['औ', 'ौ'],
  Ru: ['ऋ', 'ृ'], O: ['ऑ', 'ॉ'], E: ['ॲ', 'ॅ']
};

const CONSONANTS: Record<string, string> = {
  ksh: 'क्ष', x: 'क्ष', dny: 'ज्ञ', gny: 'ज्ञ', jny: 'ज्ञ', shh: 'ष',
  chh: 'छ', Ch: 'छ', kh: 'ख', gh: 'घ', ch: 'च', jh: 'झ', Th: 'ठ', Dh: 'ढ', th: 'थ', dh: 'ध', ph: 'फ', bh: 'भ', sh: 'श', Sh: 'ष',
  k: 'क', g: 'ग', c: 'क', q: 'क', j: 'ज', z: 'झ', T: 'ट', D: 'ड', N: 'ण', t: 'त', d: 'द', n: 'न',
  p: 'प', f: 'फ', b: 'ब', m: 'म', y: 'य', r: 'र', R: 'र', l: 'ल', L: 'ळ', v: 'व', w: 'व', V: 'व', W: 'व',
  s: 'स', S: 'श', h: 'ह', G: 'ग', K: 'क', J: 'ज', P: 'प', B: 'ब', Y: 'य', F: 'फ', C: 'क', Z: 'झ', X: 'क्ष', Q: 'क'
};

const MARKS: Record<string, string> = { M: 'ं', H: 'ः' };
const VIRAMA = '्';

const PATTERNS = [...Object.keys(VOWELS), ...Object.keys(CONSONANTS), ...Object.keys(MARKS)].sort((a, b) => b.length - a.length);
const NO_ANUSVARA_BEFORE = new Set(['य', 'र', 'ल', 'व', 'ह', 'न', 'म', 'ळ']);

function tokenize(latin: string, lang: KalpnaTypingLanguage = 'mr'): Tok[] {
  // A capital first letter is usually just sentence capitalisation.
  let w = latin;
  if (w.length > 1 && /^[A-Z][a-z]*$/.test(w)) w = w[0].toLowerCase() + w.slice(1);
  const out: Tok[] = [];
  let i = 0;
  while (i < w.length) {
    const p = PATTERNS.find((pt) => w.startsWith(pt, i));
    if (!p) {
      out.push({ k: 'O', s: w[i], dev: w[i] });
      i++;
      continue;
    }
    if (VOWELS[p]) out.push({ k: 'V', s: p, dev: VOWELS[p][0], matra: VOWELS[p][1] });
    else if (CONSONANTS[p]) out.push({ k: 'C', s: p, dev: lang === 'hi' && CONSONANTS[p] === 'ळ' ? 'ल' : CONSONANTS[p] });
    else out.push({ k: 'M', s: p, dev: MARKS[p] });
    i += p.length;
  }
  return out;
}

function render(toks: Tok[], finalAaa = true): string {
  let out = '';
  let pendingConsonant = false;
  toks.forEach((t, i) => {
    const next = toks[i + 1];
    const prev = toks[i - 1];
    if (t.k === 'C') {
      // n / m before another consonant (after a vowel) → anusvara
      if ((t.s === 'n' || t.s === 'm') && prev && prev.k === 'V' && next && next.k === 'C' && !NO_ANUSVARA_BEFORE.has(next.dev[0])) {
        out += 'ं';
        pendingConsonant = false;
        return;
      }
      if (pendingConsonant) out += VIRAMA;
      out += t.dev;
      pendingConsonant = true;
    } else if (t.k === 'V') {
      if (pendingConsonant) {
        // Marathi: a typed final "a" usually means ा (राम = "ram", रामा = "rama")
        const isFinal = i === toks.length - 1;
        if (isFinal && t.s === 'a' && finalAaa && toks.length > 2) out += 'ा';
        // Marathi spelling: a final i / u is long (नाही, गुरू)
        else if (isFinal && t.s === 'i') out += 'ी';
        else if (isFinal && t.s === 'u') out += 'ू';
        else out += t.matra;
      } else {
        out += t.dev;
      }
      pendingConsonant = false;
    } else if (t.k === 'M') {
      out += t.dev;
      pendingConsonant = false;
    } else {
      out += t.dev;
      pendingConsonant = false;
    }
  });
  return out;
}

/** Deterministic phonetic transliteration of one Latin word. */
export function toDevanagari(latin: string, lang: KalpnaTypingLanguage = 'mr'): string {
  return render(tokenize(latin, lang));
}

// ------------------------------------------------------------------ loose keys

const DEV_CONS_KEY: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n', च: 'ch', छ: 'ch', ज: 'j', झ: 'z', ञ: 'n', ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n', प: 'p', फ: 'f', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', ळ: 'l', व: 'v',
  श: 'sh', ष: 'sh', स: 's', ह: 'h', '\u0001': 'dny'
};
const DEV_VOWEL_KEY: Record<string, string> = {
  अ: 'a', आ: 'a', इ: 'i', ई: 'i', उ: 'u', ऊ: 'u', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऋ: 'ru', ऑ: 'o', ॲ: 'e',
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ru', 'ॉ': 'o', 'ॅ': 'e'
};

function stripFinalA(k: string): string {
  const n = k.replace(/chch/g, 'ch').replace(/m(?=[bpf])/g, 'n');
  return n.length > 2 && n.endsWith('a') ? n.slice(0, -1) : n;
}

/** Loose key of a Devanagari word. */
export function devanagariKey(dev: string): string {
  const s = dev.replace(/ज्ञ/g, '\u0001');
  let out = '';
  const chars = Array.from(s);
  chars.forEach((ch, i) => {
    if (DEV_CONS_KEY[ch] !== undefined) {
      out += DEV_CONS_KEY[ch];
      const n = chars[i + 1];
      const isMatra = n !== undefined && DEV_VOWEL_KEY[n] !== undefined && !/[अ-औऑॲ]/.test(n);
      if (!isMatra && n !== VIRAMA && n !== '़') out += 'a';
    } else if (DEV_VOWEL_KEY[ch] !== undefined) {
      out += DEV_VOWEL_KEY[ch];
    } else if (ch === 'ं' || ch === 'ँ') {
      out += 'n';
    }
  });
  return stripFinalA(out);
}

/** Loose key of a typed Latin word (same normalisation as devanagariKey). */
export function latinKey(latin: string): string {
  let w = latin.toLowerCase();
  w = w
    .replace(/(jny|gny)/g, 'dny')
    .replace(/x/g, 'ksh')
    .replace(/shh/g, 'sh')
    .replace(/chh/g, 'ch')
    .replace(/jh/g, 'z')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/q/g, 'k')
    .replace(/c(?!h)/g, 'k')
    .replace(/aa/g, 'a')
    .replace(/(ee|ii)/g, 'i')
    .replace(/(oo|uu)/g, 'u')
    .replace(/ou/g, 'au')
    .replace(/m(?=[bpf])/g, 'n');
  return stripFinalA(w);
}

/** Skeleton key: loose key without any "a" (handles Marathi schwa dropping). */
const skeleton = (k: string) => k.replace(/a/g, '').replace(/m(?=[bpf])/g, 'n');

// ------------------------------------------------------------------ dictionary

interface WordIndex {
  exact: Map<string, string[]>;
  skeleton: Map<string, string[]>;
  alias: Map<string, string>;
}
const indexes = new Map<KalpnaTypingLanguage, WordIndex>();

function getIndex(lang: KalpnaTypingLanguage): WordIndex {
  const cached = indexes.get(lang);
  if (cached) return cached;
  const idx: WordIndex = { exact: new Map(), skeleton: new Map(), alias: new Map() };
  const seen = new Set<string>();
  const source = lang === 'hi' ? HINDI_WORDS : MARATHI_WORDS;
  for (const entry of source.split(/\s+/)) {
    if (!entry) continue;
    const [word, aliases] = entry.split('|');
    if (seen.has(word)) continue;
    seen.add(word);
    const key = devanagariKey(word);
    const add = (m: Map<string, string[]>, k: string) => {
      const list = m.get(k);
      if (list) list.push(word);
      else m.set(k, [word]);
    };
    add(idx.exact, key);
    add(idx.skeleton, skeleton(key));
    aliases?.split(',').forEach((a) => idx.alias.set(a.toLowerCase(), word));
  }
  indexes.set(lang, idx);
  return idx;
}

export interface TransliterationOptions {
  /** User-learned or custom mappings (latin, lower-case → Devanagari). Checked first. */
  custom?: Record<string, string>;
  /** Max suggestions (default 5). */
  max?: number;
  /** `'mr'` (default) or `'hi'`. */
  lang?: KalpnaTypingLanguage;
}

/** Ranked Devanagari suggestions for one Latin word. */
export function suggest(latin: string, opts: TransliterationOptions = {}): string[] {
  const lang = opts.lang ?? 'mr';
  const idx = getIndex(lang);
  const max = opts.max ?? 5;
  const out: string[] = [];
  const push = (w: string | undefined) => {
    if (w && !out.includes(w) && out.length < max) out.push(w);
  };
  const lower = latin.toLowerCase();
  push(opts.custom?.[latin] ?? opts.custom?.[lower]);
  push(idx.alias.get(lower));
  const key = latinKey(latin);
  idx.exact.get(key)?.forEach(push);
  const base = toDevanagari(latin, lang);
  const loose = idx.skeleton.get(skeleton(key)) ?? [];
  // For longer words a dictionary word that differs only by vowel length / schwa is
  // almost always what was meant (कुलकर्णी for "kulkarni"), so rank it above the raw rules.
  if (skeleton(key).length >= 4) loose.forEach(push);
  push(base);
  loose.forEach(push);
  // a few rule-based variants
  const toks = tokenize(latin, lang);
  push(render(toks, false)); // final "a" as schwa
  const swaps: Record<string, string> = lang === 'hi' ? { n: 'N', t: 'T', d: 'D', sh: 'Sh', a: 'aa', i: 'ii', u: 'uu' } : { n: 'N', t: 'T', d: 'D', l: 'L', sh: 'Sh', a: 'aa', i: 'ii', u: 'uu' };
  for (let i = 0; i < toks.length && out.length < max; i++) {
    const alt = swaps[toks[i].s];
    if (!alt || (toks[i].s === 'a' && i === 0)) continue;
    const copy = toks.slice();
    const t = toks[i];
    copy[i] = t.k === 'V' ? { k: 'V', s: alt, dev: VOWELS[alt][0], matra: VOWELS[alt][1] } : { k: 'C', s: alt, dev: CONSONANTS[alt] };
    push(render(copy));
  }
  return out;
}
