/**
 * Kalpna Editor — plain JavaScript build.
 *
 *   <script src="kalpna-editor.js"></script>
 *   <kalpna-text-editor name="content" placeholder="Write…"></kalpna-text-editor>
 *
 * or
 *
 *   KalpnaEditor.replace('#my-textarea');
 */
import { ApplicationRef, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { KalpnaEditorConfig, KalpnaToolbarItem } from 'kalpna-editor';
import { KalpnaElementComponent } from './kalpna-element.component';

declare const KALPNA_VERSION: string;

export const TAG = 'kalpna-text-editor';

export interface KalpnaCreateOptions {
  /** Initial HTML. */
  value?: string;
  /** Form field name (adds a hidden input). */
  name?: string;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  disabled?: boolean;
  /** `'en'` (default) or `'mr'` (Marathi UI). */
  language?: 'en' | 'mr';
  /** Start with Marathi typing switched on. */
  transliteration?: boolean;
  /** `'en'`, `'mr'` (Marathi) or `'hi'` (Hindi). */
  typingLanguage?: 'en' | 'mr' | 'hi';
  /** Array of toolbar items, or `'basic'` / `'full'`. */
  toolbar?: KalpnaToolbarItem[] | 'basic' | 'full';
  /** Any other editor option (see README). */
  config?: KalpnaEditorConfig;
  /** Image upload endpoint (multipart POST, returns `{ "url": "…" }`). */
  uploadUrl?: string;
  uploadFieldName?: string;
  uploadHeaders?: Record<string, string>;
  /** Custom upload function. Overrides `uploadUrl`. */
  uploadHandler?: (file: File) => Promise<string>;
  /** Called with the HTML on every change. */
  onChange?: (html: string) => void;
  /** Called once the editor is ready. */
  onReady?: (editor: KalpnaEditorElement) => void;
}

export interface KalpnaEditorElement extends HTMLElement {
  value: string;
  getHtml(): string;
  setHtml(html: string): void;
  getText(): string;
  focusEditor(): void;
  insertHtml(html: string): void;
  execute(item: KalpnaToolbarItem): void;
  importWord(file: File): Promise<void>;
  getWordCount(): { words: number; characters: number };
  undo(): void;
  redo(): void;
  clear(): void;
  setTransliteration(on: boolean): void;
  setTypingLanguage(lang: 'en' | 'mr' | 'hi'): void;
  getTypingLanguage(): 'en' | 'mr' | 'hi';
  destroy(): void;
}

let readyPromise: Promise<void> | null = null;

function define(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (customElements.get(TAG)) return;
    const app: ApplicationRef = await createApplication({
      providers: [provideExperimentalZonelessChangeDetection()]
    });
    const Base = createCustomElement(KalpnaElementComponent, { injector: app.injector });
    // `value` always reflects the live editor content.
    const proto = Base.prototype as object;
    const original = Object.getOwnPropertyDescriptor(proto, 'value');
    Object.defineProperty(proto, 'value', {
      configurable: true,
      enumerable: true,
      get(this: { getHtml?: () => string }) {
        if (this.getHtml) return this.getHtml();
        return original?.get ? (original.get.call(this) as string) : '';
      },
      set(v: string) {
        original?.set?.call(this, v);
      }
    });
    customElements.define(TAG, Base);
  })();
  return readyPromise;
}

function resolve(target: string | Element | null): Element {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`[kalpna-editor] Element not found: ${String(target)}`);
  return el;
}

function applyOptions(el: KalpnaEditorElement, o: KalpnaCreateOptions): void {
  const p = el as unknown as Record<string, unknown>;
  const keys: (keyof KalpnaCreateOptions)[] = ['name', 'placeholder', 'minHeight', 'readOnly', 'disabled', 'language', 'transliteration', 'typingLanguage', 'toolbar', 'config', 'uploadFieldName', 'uploadHeaders', 'uploadUrl', 'uploadHandler', 'value'];
  for (const k of keys) {
    if (o[k] !== undefined) p[k] = o[k];
  }
  if (o.onChange) el.addEventListener('kalpna-change', (e) => o.onChange!((e as CustomEvent<{ html: string }>).detail.html));
}

function addDestroy(el: KalpnaEditorElement, cleanup?: () => void): void {
  el.destroy = () => {
    cleanup?.();
    el.remove();
  };
}

/** Create an editor inside `container`. */
async function create(container: string | Element, options: KalpnaCreateOptions = {}): Promise<KalpnaEditorElement> {
  await define();
  const host = resolve(container);
  const el = document.createElement(TAG) as KalpnaEditorElement;
  applyOptions(el, options);
  host.appendChild(el);
  addDestroy(el);
  await customElements.whenDefined(TAG);
  options.onReady?.(el);
  return el;
}

/**
 * Replace a `<textarea>` with the editor. The textarea is hidden and kept in
 * sync, so existing forms (PHP, WordPress, Laravel, ASP.NET…) keep working.
 */
async function replace(textarea: string | Element, options: KalpnaCreateOptions = {}): Promise<KalpnaEditorElement> {
  await define();
  const ta = resolve(textarea) as HTMLTextAreaElement;
  if ((ta as unknown as { kalpnaEditor?: KalpnaEditorElement }).kalpnaEditor) {
    return (ta as unknown as { kalpnaEditor: KalpnaEditorElement }).kalpnaEditor;
  }
  const el = document.createElement(TAG) as KalpnaEditorElement;
  applyOptions(el, {
    placeholder: ta.getAttribute('placeholder') ?? undefined,
    readOnly: ta.readOnly || undefined,
    disabled: ta.disabled || undefined,
    ...options,
    value: options.value ?? ta.value
  });
  const sync = (e: Event) => {
    ta.value = (e as CustomEvent<{ html: string }>).detail.html;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  };
  el.addEventListener('kalpna-change', sync);
  const prevDisplay = ta.style.display;
  ta.style.display = 'none';
  ta.insertAdjacentElement('afterend', el);
  (ta as unknown as { kalpnaEditor?: KalpnaEditorElement }).kalpnaEditor = el;
  addDestroy(el, () => {
    el.removeEventListener('kalpna-change', sync);
    ta.style.display = prevDisplay;
    delete (ta as unknown as { kalpnaEditor?: KalpnaEditorElement }).kalpnaEditor;
  });
  await customElements.whenDefined(TAG);
  options.onReady?.(el);
  return el;
}

/** Replace every textarea matching `selector` (default `textarea.kalpna-editor`). */
async function replaceAll(selector = 'textarea.kalpna-editor', options: KalpnaCreateOptions = {}): Promise<KalpnaEditorElement[]> {
  const list = Array.from(document.querySelectorAll(selector));
  return Promise.all(list.map((ta) => replace(ta, options)));
}

const KalpnaEditor = {
  version: typeof KALPNA_VERSION !== 'undefined' ? KALPNA_VERSION : 'dev',
  tag: TAG,
  ready: define,
  create,
  replace,
  replaceAll
};

(window as unknown as { KalpnaEditor: typeof KalpnaEditor }).KalpnaEditor = KalpnaEditor;

// Define the custom element right away so <kalpna-text-editor> tags in HTML just work.
define().catch((err) => console.error('[kalpna-editor] failed to start', err));

// Auto-enhance <textarea data-kalpna-editor> once the page is parsed.
const auto = () => {
  document.querySelectorAll('textarea[data-kalpna-editor]').forEach((ta) => {
    let opts: KalpnaCreateOptions = {};
    const raw = ta.getAttribute('data-kalpna-editor');
    if (raw && raw.trim().startsWith('{')) {
      try {
        opts = JSON.parse(raw);
      } catch {
        console.warn('[kalpna-editor] invalid JSON in data-kalpna-editor');
      }
    }
    replace(ta, opts);
  });
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
else auto();
