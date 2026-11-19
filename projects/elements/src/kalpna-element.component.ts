import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KalpnaEditorComponent,
  KalpnaEditorConfig,
  KalpnaToolbarItem,
  KalpnaUploadHook
} from 'kalpna-editor';

/** Options accepted by the `upload-url` based image uploader. */
export interface KalpnaUploadOptions {
  url: string;
  fieldName?: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

function parseJson<T>(value: unknown): T | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    console.warn('[kalpna-editor] Could not parse JSON attribute:', value);
    return undefined;
  }
}

/** Pull a URL out of common upload API responses. */
function extractUrl(body: unknown): string {
  if (typeof body === 'string') return body.trim();
  const b = body as Record<string, unknown> | null;
  if (!b) return '';
  const pick = (o: unknown): string => {
    const r = o as Record<string, unknown> | null;
    if (!r) return '';
    for (const k of ['url', 'location', 'link', 'path', 'src', 'fileUrl', 'file_url']) {
      if (typeof r[k] === 'string') return r[k] as string;
    }
    return '';
  };
  return pick(b) || pick(b['data']) || pick(b['file']) || pick(b['result']) || '';
}

/**
 * The element behind `<kalpna-text-editor>`: wraps the Angular editor and adds
 * the bits plain-HTML sites need (attributes, a hidden form field, DOM events,
 * an upload URL and methods on the element).
 */
@Component({
  selector: 'kalpna-text-editor-internal',
  standalone: true,
  imports: [FormsModule, KalpnaEditorComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kalpna-editor
      [ngModel]="html"
      (ngModelChange)="onModelChange($event)"
      [config]="effectiveConfig"
      [toolbar]="toolbarList"
      [placeholder]="placeholder || ''"
      [readOnly]="readOnly"
      [disabled]="disabled"
      [minHeight]="minHeight || '200px'"
      [uploadHook]="hook"
      (autosave)="fire('kalpna-autosave', { html: $event })"
      (wordCountChange)="fire('kalpna-wordcount', $event)"
      (focusEvent)="fire('kalpna-focus')"
      (blurEvent)="fire('kalpna-blur')"
    ></kalpna-editor>
    @if (name) {
      <input type="hidden" [attr.name]="name" [value]="html" />
    }
  `
})
export class KalpnaElementComponent {
  @ViewChild(KalpnaEditorComponent) editor?: KalpnaEditorComponent;

  html = '';
  effectiveConfig: KalpnaEditorConfig = {};
  toolbarList: KalpnaToolbarItem[] | null = null;
  hook: KalpnaUploadHook = {};

  private _config: KalpnaEditorConfig = {};
  private _language: 'en' | 'mr' | undefined;
  private _translit: boolean | undefined;
  private _typingLang: 'en' | 'mr' | 'hi' | undefined;
  private _upload: KalpnaUploadOptions | null = null;
  private _uploadHandler: ((file: File) => Promise<string>) | null = null;

  /** Initial / current HTML. Attribute: `value`. */
  @Input()
  set value(v: string | null | undefined) {
    this.html = v ?? '';
    this.cdr.markForCheck();
  }
  get value(): string {
    return this.html;
  }

  /** Form field name — adds a hidden input so normal `<form>` posts include the HTML. */
  @Input() name = '';
  @Input() placeholder = '';
  @Input() minHeight = '';
  @Input({ transform: booleanAttribute }) readOnly = false;
  @Input({ transform: booleanAttribute }) disabled = false;

  /** `'en'` or `'mr'` (Marathi UI). */
  @Input()
  set language(v: 'en' | 'mr' | undefined) {
    this._language = v || undefined;
    this.rebuildConfig();
  }

  /** Start with Marathi typing (namaskar → नमस्कार) switched on. Attribute: `transliteration`. */
  @Input()
  set transliteration(v: boolean | string | null | undefined) {
    this._translit = v === null || v === undefined ? undefined : booleanAttribute(v);
    this.rebuildConfig();
  }

  /** Typing language: `"en"` (default), `"mr"` (Marathi) or `"hi"` (Hindi). Attribute: `typing-language`. */
  @Input()
  set typingLanguage(v: string | null | undefined) {
    const map: Record<string, 'en' | 'mr' | 'hi'> = { en: 'en', english: 'en', mr: 'mr', marathi: 'mr', hi: 'hi', hindi: 'hi' };
    this._typingLang = v ? map[v.toLowerCase()] : undefined;
    this.rebuildConfig();
  }

  /** Comma separated list (`"bold,italic,|,link"`), a JSON array, `"basic"` or `"full"`. */
  @Input()
  set toolbar(v: string | KalpnaToolbarItem[] | null | undefined) {
    if (!v || v === 'full') {
      this.toolbarList = null;
    } else if (Array.isArray(v)) {
      this.toolbarList = v;
    } else if (v === 'basic') {
      this.toolbarList = ['transliteration', '|', 'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'underline', '|', 'link', 'image', 'table', '|', 'unorderedList', 'orderedList', '|', 'alignment', 'clear'];
    } else if (v.trim().startsWith('[')) {
      this.toolbarList = parseJson<KalpnaToolbarItem[]>(v) ?? null;
    } else {
      this.toolbarList = v.split(/[\s,]+/).filter(Boolean) as KalpnaToolbarItem[];
    }
    this.cdr.markForCheck();
  }

  /** Full `KalpnaEditorConfig` as an object or JSON string. */
  @Input()
  set config(v: KalpnaEditorConfig | string | null | undefined) {
    this._config = parseJson<KalpnaEditorConfig>(v) ?? {};
    this.rebuildConfig();
  }

  /** Server endpoint that receives images (multipart, field `file`) and returns `{ "url": "…" }`. */
  @Input()
  set uploadUrl(v: string | null | undefined) {
    this._upload = v ? { ...(this._upload ?? {}), url: v } : null;
    this.rebuildHook();
  }

  /** Multipart field name for uploads (default `file`). */
  @Input()
  set uploadFieldName(v: string | null | undefined) {
    if (this._upload) this._upload.fieldName = v || 'file';
    else if (v) this._upload = { url: '', fieldName: v };
    this.rebuildHook();
  }

  /** Extra headers for uploads, e.g. `{"X-CSRF-TOKEN": "…"}` (object or JSON string). */
  @Input()
  set uploadHeaders(v: Record<string, string> | string | null | undefined) {
    const headers = parseJson<Record<string, string>>(v);
    this._upload = { ...(this._upload ?? { url: '' }), headers };
    this.rebuildHook();
  }

  /** Custom upload function `(file) => Promise<url>` (JavaScript property only). */
  @Input()
  set uploadHandler(fn: ((file: File) => Promise<string>) | null | undefined) {
    this._uploadHandler = typeof fn === 'function' ? fn : null;
    this.rebuildHook();
  }

  constructor(
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {
    const el = host.nativeElement as HTMLElement & Record<string, unknown>;
    // Methods available on the DOM element.
    el['getHtml'] = () => this.editor?.getHtml() ?? this.html;
    el['setHtml'] = (h: string) => {
      this.html = h ?? '';
      this.editor?.setHtml(this.html);
      this.cdr.markForCheck();
    };
    el['getText'] = () => this.editor?.getText() ?? '';
    el['focusEditor'] = () => this.editor?.focus();
    el['insertHtml'] = (h: string) => this.editor?.insertHtml(h);
    el['execute'] = (item: KalpnaToolbarItem) => this.editor?.execute(item);
    el['importWord'] = (file: File) => this.editor?.importWord(file);
    el['getWordCount'] = () => this.editor?.getWordCount() ?? { words: 0, characters: 0 };
    el['undo'] = () => this.editor?.undo();
    el['redo'] = () => this.editor?.redo();
    el['setTransliteration'] = (on: boolean) => this.editor?.toggleTransliteration(on);
    el['setTypingLanguage'] = (lang: 'en' | 'mr' | 'hi') => this.editor?.setTypingLanguage(lang);
    el['getTypingLanguage'] = () => this.editor?.typingLang ?? 'en';
    el['clear'] = () => el['setHtml'] && (el['setHtml'] as (h: string) => void)('');
    queueMicrotask(() => this.fire('kalpna-ready'));
  }

  onModelChange(html: string): void {
    this.html = html;
    this.fire('kalpna-change', { html });
  }

  fire(name: string, detail?: unknown): void {
    this.host.nativeElement.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private rebuildConfig(): void {
    this.effectiveConfig = {
      ...this._config,
      ...(this._language ? { language: this._language } : {}),
      ...(this._translit !== undefined ? { transliteration: this._translit } : {}),
      ...(this._typingLang ? { transliteration: { ...(typeof this._config.transliteration === 'object' ? this._config.transliteration : {}), language: this._typingLang } } : {})
    };
    this.cdr.markForCheck();
  }

  private rebuildHook(): void {
    if (this._uploadHandler) {
      this.hook = { image: this._uploadHandler };
    } else if (this._upload?.url) {
      const opts = this._upload;
      this.hook = {
        image: async (file: File) => {
          const form = new FormData();
          form.append(opts.fieldName || 'file', file, file.name);
          const res = await fetch(opts.url, {
            method: 'POST',
            body: form,
            headers: opts.headers,
            credentials: opts.withCredentials === false ? 'omit' : 'same-origin'
          });
          if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
          const type = res.headers.get('content-type') || '';
          const body = type.includes('json') ? await res.json() : await res.text();
          const url = extractUrl(body);
          if (!url) throw new Error('Upload response did not contain a URL');
          return url;
        }
      };
    } else {
      this.hook = {};
    }
    this.cdr.markForCheck();
  }
}
