import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  DEFAULT_ALLOWED_IMAGE_TYPES,
  DEFAULT_CODE_LANGUAGES,
  DEFAULT_COLORS,
  DEFAULT_FONT_FAMILIES,
  DEFAULT_FONT_SIZES,
  DEFAULT_LINE_HEIGHTS,
  DEFAULT_TOOLBAR,
  KALPNA_LABELS_EN,
  KALPNA_LABELS_MR,
  KalpnaCodeLanguage,
  KalpnaEditorConfig,
  KalpnaLabels,
  KalpnaMentionFeed,
  KalpnaToolbarItem,
  KalpnaTransliterationConfig,
  KalpnaUploadHook,
  KalpnaWordCount
} from './editor.types';
import { isSafeUrl, normalizeLinkUrl, sanitizeHtml, sanitizePastedHtml } from './utils/sanitize';
import { KALPNA_ICONS } from './utils/icons';
import { EMOJI_CATEGORIES, KalpnaCharCategory, SPECIAL_CHARACTERS } from './utils/special-characters';
import { buildMediaHtml, parseMediaUrl } from './utils/media';
import { convertDocx, DOCX_IMAGE_PREFIX } from './utils/docx';
import { suggest as translitSuggest, KalpnaTypingLanguage } from './utils/transliterate';
import * as T from './utils/table';
import { KALPNA_CONTENT_CSS, KALPNA_EDITOR_CSS } from './editor.styles';

type Balloon = { type: 'link' | 'image' | 'table' | 'code' | 'media'; top: number; left: number; above?: boolean } | null;
type Modal = 'link' | 'imageUrl' | 'media' | 'tableProps' | 'cellProps' | 'preview' | 'help' | 'pastePlain' | 'imageAlt' | null;
type SerializedSel = { s: number[]; so: number; e: number[]; eo: number } | null;
type HistoryEntry = { html: string; sel: SerializedSel };
type ImageStyle = 'inline' | 'alignLeft' | 'alignCenter' | 'alignRight' | 'blockLeft' | 'blockRight';

interface SimpleButton {
  icon: string;
  label: string;
  shortcut?: string;
}

const SIMPLE_BUTTONS: Partial<Record<KalpnaToolbarItem, SimpleButton>> = {
  bold: { icon: 'bold', label: 'bold', shortcut: 'Ctrl+B' },
  italic: { icon: 'italic', label: 'italic', shortcut: 'Ctrl+I' },
  underline: { icon: 'underline', label: 'underline', shortcut: 'Ctrl+U' },
  strikethrough: { icon: 'strikethrough', label: 'strikethrough', shortcut: 'Ctrl+Shift+X' },
  subscript: { icon: 'subscript', label: 'subscript', shortcut: 'Ctrl+,' },
  superscript: { icon: 'superscript', label: 'superscript', shortcut: 'Ctrl+.' },
  code: { icon: 'code', label: 'code', shortcut: 'Ctrl+E' },
  formatPainter: { icon: 'formatPainter', label: 'formatPainter' },
  alignLeft: { icon: 'alignLeft', label: 'alignLeft', shortcut: 'Ctrl+Shift+L' },
  alignCenter: { icon: 'alignCenter', label: 'alignCenter', shortcut: 'Ctrl+Shift+E' },
  alignRight: { icon: 'alignRight', label: 'alignRight', shortcut: 'Ctrl+Shift+R' },
  alignJustify: { icon: 'alignJustify', label: 'alignJustify', shortcut: 'Ctrl+Shift+J' },
  todoList: { icon: 'todoList', label: 'todoList' },
  indent: { icon: 'indent', label: 'indent', shortcut: 'Tab' },
  outdent: { icon: 'outdent', label: 'outdent', shortcut: 'Shift+Tab' },
  blockquote: { icon: 'blockquote', label: 'blockquote' },
  codeBlock: { icon: 'codeBlock', label: 'codeBlock' },
  horizontalLine: { icon: 'horizontalLine', label: 'horizontalLine' },
  pageBreak: { icon: 'pageBreak', label: 'pageBreak' },
  link: { icon: 'link', label: 'link', shortcut: 'Ctrl+K' },
  unlink: { icon: 'unlink', label: 'unlink' },
  image: { icon: 'image', label: 'image' },
  imageUrl: { icon: 'imageUrl', label: 'imageUrl' },
  importWord: { icon: 'importWord', label: 'importWord' },
  transliteration: { icon: 'transliteration', label: 'transliteration', shortcut: 'Alt+M' },
  mediaEmbed: { icon: 'mediaEmbed', label: 'mediaEmbed' },
  findReplace: { icon: 'findReplace', label: 'findReplace', shortcut: 'Ctrl+F' },
  selectAll: { icon: 'selectAll', label: 'selectAll', shortcut: 'Ctrl+A' },
  undo: { icon: 'undo', label: 'undo', shortcut: 'Ctrl+Z' },
  redo: { icon: 'redo', label: 'redo', shortcut: 'Ctrl+Y' },
  clear: { icon: 'clear', label: 'clear' },
  pastePlainText: { icon: 'pasteText', label: 'pastePlainText', shortcut: 'Ctrl+Shift+V' },
  source: { icon: 'source', label: 'source' },
  showBlocks: { icon: 'showBlocks', label: 'showBlocks' },
  preview: { icon: 'preview', label: 'preview' },
  print: { icon: 'print', label: 'print', shortcut: 'Ctrl+P' },
  exportWord: { icon: 'exportWord', label: 'exportWord' },
  exportPdf: { icon: 'exportPdf', label: 'exportPdf' },
  fullscreen: { icon: 'fullscreen', label: 'fullscreen' },
  help: { icon: 'help', label: 'help', shortcut: 'Alt+0' }
};

/** Items that keep working in source mode. */
const SOURCE_MODE_ITEMS = new Set<KalpnaToolbarItem>(['source', 'fullscreen', 'help', 'preview', 'print', 'exportWord', 'exportPdf', '|']);

const LEAF_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, td, th, figcaption, caption, div';
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION', 'CAPTION', 'DIV', 'UL', 'OL', 'TABLE', 'FIGURE', 'HR', 'TR', 'TBODY', 'THEAD', 'TFOOT']);
const ZWSP = '​';

const TEXT_TRANSFORMATIONS: [string, string][] = [
  ['(tm)', '™'], ['(c)', '©'], ['(r)', '®'], ['...', '…'], [' --- ', ' — '], [' -- ', ' – '],
  ['->', '→'], ['<-', '←'], ['=>', '⇒'], ['<=', '≤'], ['>=', '≥'], ['!=', '≠'], ['+-', '±'],
  ['1/2', '½'], ['1/3', '⅓'], ['2/3', '⅔'], ['1/4', '¼'], ['3/4', '¾']
];

let stylesInjected = false;

@Component({
  selector: 'kalpna-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KalpnaEditorComponent),
      multi: true
    }
  ]
})
export class KalpnaEditorComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder = '';
  @Input() readOnly = false;
  @Input() disabled = false;
  @Input() uploadHook: KalpnaUploadHook = {};
  @Input() config: KalpnaEditorConfig = {};
  @Input() toolbar: KalpnaToolbarItem[] | null = null;
  @Input() minHeight = '200px';

  @Output() contentChange = new EventEmitter<string>();
  @Output() textChange = new EventEmitter<string>();
  @Output() focusEvent = new EventEmitter<void>();
  @Output() blurEvent = new EventEmitter<void>();
  /** Debounced HTML for autosaving (see `config.autosaveDelay`). */
  @Output() autosave = new EventEmitter<string>();
  @Output() wordCountChange = new EventEmitter<KalpnaWordCount>();

  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('body', { static: true }) bodyRef!: ElementRef<HTMLDivElement>;
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sourceArea') sourceAreaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('wordInput') wordInput?: ElementRef<HTMLInputElement>;
  @ViewChild('findInput') findInput?: ElementRef<HTMLInputElement>;
  @ViewChild('toolbarEl') toolbarEl?: ElementRef<HTMLDivElement>;

  @HostBinding('class.kalpna-editor-host') hostClass = true;
  @HostBinding('class.kalpna-disabled') get isDisabledHost(): boolean {
    return this.disabled || this.readOnly;
  }

  // --- UI state ---
  activeToolbar: KalpnaToolbarItem[] = DEFAULT_TOOLBAR;
  labels: KalpnaLabels = KALPNA_LABELS_EN;
  fontFamilies: string[] = DEFAULT_FONT_FAMILIES;
  fontSizes: string[] = DEFAULT_FONT_SIZES;
  lineHeights: string[] = DEFAULT_LINE_HEIGHTS;
  colors = DEFAULT_COLORS;
  codeLanguages: KalpnaCodeLanguage[] = DEFAULT_CODE_LANGUAGES;
  specialCharacters = SPECIAL_CHARACTERS;
  emojiCategories = EMOJI_CATEGORIES;
  headingOptions = [
    { tag: 'p', key: 'paragraph' }, { tag: 'h1', key: 'heading1' }, { tag: 'h2', key: 'heading2' },
    { tag: 'h3', key: 'heading3' }, { tag: 'h4', key: 'heading4' }, { tag: 'h5', key: 'heading5' },
    { tag: 'h6', key: 'heading6' }, { tag: 'pre', key: 'preformatted' }
  ];
  bulletStyles = ['disc', 'circle', 'square'];
  numberStyles = ['decimal', 'decimal-leading-zero', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha'];
  borderStyles = ['none', 'solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset'];
  highlighters = [
    { cls: 'marker-yellow', color: '#fdfd77', label: 'Yellow marker' },
    { cls: 'marker-green', color: '#62f962', label: 'Green marker' },
    { cls: 'marker-pink', color: '#fc7899', label: 'Pink marker' },
    { cls: 'marker-blue', color: '#72ccfd', label: 'Blue marker' },
    { cls: 'pen-red', color: '#e71313', label: 'Red pen' },
    { cls: 'pen-green', color: '#128a00', label: 'Green pen' }
  ];
  gridRange = Array.from({ length: 10 }, (_, i) => i + 1);

  openMenu: string | null = null;
  private _modal: Modal = null;
  get modal(): Modal {
    return this._modal;
  }
  set modal(value: Modal) {
    this._modal = value;
    if (value && this.isBrowser && value !== 'preview' && value !== 'help') {
      setTimeout(() => {
        const el = this.rootRef?.nativeElement.querySelector<HTMLElement>('.kalpna-modal input:not([type=checkbox]):not([type=color]), .kalpna-modal textarea');
        el?.focus();
        (el as HTMLInputElement | null)?.select?.();
      });
    }
  }
  balloon: Balloon = null;

  isSourceView = false;
  sourceHtml = '';
  isFullscreen = false;
  showBlocks = false;
  isEmpty = true;
  canUndo = false;
  canRedo = false;

  // toolbar state
  on: Record<string, boolean> = {};
  currentBlock = 'p';
  currentFont = '';
  currentSize = '';
  currentLineHeight = '';
  currentAlign = 'left';
  currentLanguage = 'plaintext';
  lastTextColor = '#e64c4c';
  lastBgColor = '#e6e64c';
  lastHighlight = 'marker-yellow';

  // link form
  linkUrl = '';
  linkText = '';
  linkNewTab = true;
  linkShowText = false;
  linkError = '';
  linkForImage = false;
  currentLinkHref = '';

  // image / media forms
  imageUrl = '';
  imageAlt = '';
  imageError = '';
  mediaUrl = '';
  mediaError = '';
  imageResizePresets = ['25%', '50%', '75%', '100%'];
  handles: { h: string; top: number; left: number }[] = [];
  resizeLabel: { text: string; top: number; left: number } | null = null;

  // table forms
  gridRows = 0;
  gridCols = 0;
  tableRows = 3;
  tableCols = 3;
  tp = { borderStyle: 'solid', borderColor: '#bfbfbf', borderWidth: '1px', background: '', width: '100%', height: '', align: 'center' };
  cp = { borderStyle: 'solid', borderColor: '#bfbfbf', borderWidth: '1px', background: '', padding: '6px 8px', width: '', height: '', textAlign: '', verticalAlign: 'top' };
  hasHeaderRow = false;
  hasHeaderCol = false;
  hasCaption = false;

  // lists
  listStart = 1;
  listReversed = false;

  // characters
  charCategory = 0;
  emojiCategory = 0;
  charSearch = '';

  // find & replace
  showFind = false;
  findText = '';
  replaceText = '';
  findMatchCase = false;
  findWholeWords = false;
  findIndex = -1;
  findCount = 0;

  // plain text paste
  plainText = '';

  // preview
  previewHtml: SafeHtml = '';

  // mentions
  mention: { items: string[]; index: number; top: number; left: number; feed: KalpnaMentionFeed; node: Text; start: number; end: number } | null = null;

  // Marathi transliteration
  /** Current typing language: English, Marathi or Hindi. */
  typingLang: 'en' | KalpnaTypingLanguage = 'en';
  get translitOn(): boolean {
    return this.typingLang !== 'en';
  }
  readonly typingOptions: { code: 'en' | KalpnaTypingLanguage; glyph: string; name: string }[] = [
    { code: 'en', glyph: 'A', name: 'English' },
    { code: 'mr', glyph: 'म', name: 'मराठी' },
    { code: 'hi', glyph: 'हि', name: 'हिंदी' }
  ];
  get visibleTypingOptions() {
    const allowed = this.translitConfig.languages;
    return allowed?.length ? this.typingOptions.filter((o) => allowed.includes(o.code)) : this.typingOptions;
  }
  translit: { latin: string; items: string[]; index: number; top: number; left: number; node: Text; start: number } | null = null;
  private translitSkip = '';
  private learned: Record<string, Record<string, string>> = { mr: {}, hi: {} };
  private translitConfigured = false;

  // word import
  importing = false;
  importMessage = '';

  // stats
  words = 0;
  characters = 0;

  // --- internals ---
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private lastSaveTime = 0;
  private lastSaveWasTyping = false;
  private savedRange: Range | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private lastEmitted = '';
  private pendingValue: string | null = null;
  private viewReady = false;
  private plainPasteNext = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private selectedEl: HTMLElement | null = null;
  private currentCell: HTMLTableCellElement | null = null;
  private currentLink: HTMLAnchorElement | null = null;
  private currentPre: HTMLElement | null = null;
  editingLink: HTMLAnchorElement | null = null;
  private replaceTarget: HTMLImageElement | null = null;
  private findRanges: Range[] = [];
  private painter: Record<string, string | boolean> | null = null;
  private mentionSeq = 0;
  private resizing: { el: HTMLElement; img: HTMLImageElement; startX: number; startW: number; dir: number; block: boolean } | null = null;
  private iconCache = new Map<string, SafeHtml>();
  private listeners: [EventTarget, string, EventListener, boolean?][] = [];
  private readonly isBrowser: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    private domSanitizer: DomSanitizer,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser && !stylesInjected && !this.doc.getElementById('kalpna-editor-styles')) {
      const style = this.doc.createElement('style');
      style.id = 'kalpna-editor-styles';
      style.textContent = KALPNA_CONTENT_CSS + KALPNA_EDITOR_CSS;
      this.doc.head.appendChild(style);
      stylesInjected = true;
    }
  }

  // ===================================================================
  // Lifecycle
  // ===================================================================

  ngOnInit(): void {
    this.applyConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] || changes['toolbar']) this.applyConfig();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (!this.isBrowser) return;
    const root = this.root;
    if (this.pendingValue !== null) {
      root.innerHTML = this.pendingValue;
      this.pendingValue = null;
    }
    this.resetHistory();
    this.refreshStats(this.serialize());
    this.listen(this.doc, 'selectionchange', () => this.onSelectionChange());
    this.listen(this.doc, 'mousedown', (e) => this.onDocumentMouseDown(e as MouseEvent), true);
    this.listen(this.doc, 'keydown', (e) => this.onDocumentKeyDown(e as KeyboardEvent));
    this.listen(this.doc, 'pointermove', (e) => this.onResizeMove(e as PointerEvent));
    this.listen(this.doc, 'pointerup', () => this.onResizeEnd());
    this.listen(this.doc.defaultView ?? window, 'resize', () => this.repositionOverlays());
    this.listen(root, 'scroll', () => this.repositionOverlays());
    this.listen(root, 'beforeinput', (e) => this.onBeforeInput(e as InputEvent));
    this.updateEmptyState();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.listeners.forEach(([t, n, fn, cap]) => t.removeEventListener(n, fn, cap));
    this.listeners = [];
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.clearFindHighlights();
    if (this.isFullscreen && this.isBrowser) this.doc.body.style.overflow = '';
  }

  private listen(target: EventTarget, name: string, fn: EventListener, capture = false): void {
    target.addEventListener(name, fn, capture);
    this.listeners.push([target, name, fn, capture]);
  }

  private applyConfig(): void {
    const cfg = this.config || {};
    this.fontFamilies = cfg.fontFamilies ?? DEFAULT_FONT_FAMILIES;
    this.fontSizes = cfg.fontSizes ?? DEFAULT_FONT_SIZES;
    this.lineHeights = cfg.lineHeights ?? DEFAULT_LINE_HEIGHTS;
    this.colors = cfg.colors ?? DEFAULT_COLORS;
    this.codeLanguages = cfg.codeBlockLanguages ?? DEFAULT_CODE_LANGUAGES;
    const base = cfg.language === 'mr' ? { ...KALPNA_LABELS_EN, ...KALPNA_LABELS_MR } : KALPNA_LABELS_EN;
    this.labels = { ...base, ...(cfg.labels ?? {}) } as KalpnaLabels;
    const items = this.toolbar ?? cfg.toolbar ?? DEFAULT_TOOLBAR;
    // drop leading / trailing / duplicate separators
    const cleaned: KalpnaToolbarItem[] = [];
    for (const it of items) {
      if (it === '|' && (cleaned.length === 0 || cleaned[cleaned.length - 1] === '|')) continue;
      cleaned.push(it);
    }
    while (cleaned[cleaned.length - 1] === '|') cleaned.pop();
    this.activeToolbar = cleaned;
    if (!this.translitConfigured && this.isBrowser) {
      this.translitConfigured = true;
      const read = (k: string) => {
        try {
          return JSON.parse(localStorage.getItem(k) || '{}') as Record<string, string>;
        } catch {
          return {};
        }
      };
      this.learned = { mr: read('kalpna-translit-learned'), hi: read('kalpna-translit-learned-hi') };
      let stored: 'en' | KalpnaTypingLanguage | null = null;
      try {
        const v = localStorage.getItem('kalpna-typing-lang');
        if (v === 'en' || v === 'mr' || v === 'hi') stored = v;
        else {
          const old = localStorage.getItem('kalpna-translit-on');
          stored = old === null ? null : old === '1' ? 'mr' : 'en';
        }
      } catch {
        stored = null;
      }
      const tc = this.translitConfig;
      this.typingLang = tc.language ?? (tc.enabled === true ? 'mr' : tc.enabled === false ? 'en' : null) ?? stored ?? 'en';
    } else if (this.translitConfigured) {
      const tc = this.translitConfig;
      if (tc.language) this.typingLang = tc.language;
      else if (tc.enabled !== undefined) this.typingLang = tc.enabled ? (this.typingLang === 'hi' ? 'hi' : 'mr') : 'en';
    }
    if (!this.placeholder) this.placeholder = cfg.placeholder ?? this.labels['placeholder'] ?? '';
    else if (cfg.placeholder) this.placeholder = cfg.placeholder;
  }

  private get root(): HTMLDivElement {
    return this.editorRef.nativeElement;
  }

  // ===================================================================
  // ControlValueAccessor
  // ===================================================================

  writeValue(value: string | null): void {
    const html = sanitizeHtml(value ?? '');
    this.lastEmitted = html;
    if (!this.viewReady || !this.isBrowser) {
      this.pendingValue = html;
    } else {
      if (this.isSourceView) this.sourceHtml = this.formatSource(html);
      if (this.root.innerHTML !== html) this.root.innerHTML = html;
      this.resetHistory();
      this.updateEmptyState();
      this.refreshStats(html);
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /** Get current HTML content (sanitized). */
  getHtml(): string {
    if (this.isSourceView) return sanitizeHtml(this.sourceHtml);
    return this.serialize();
  }

  /** Set HTML content (sanitized). */
  setHtml(html: string): void {
    const clean = sanitizeHtml(html ?? '');
    if (this.isSourceView) {
      this.sourceHtml = this.formatSource(clean);
    } else if (this.editorRef?.nativeElement) {
      this.root.innerHTML = clean;
      this.resetHistory();
      this.updateEmptyState();
    }
    this.emitContent(clean);
    this.cdr.markForCheck();
  }

  /** Get plain text content. */
  getText(): string {
    if (this.isSourceView) {
      const tmp = this.doc.createElement('div');
      tmp.innerHTML = sanitizeHtml(this.sourceHtml);
      return tmp.textContent ?? '';
    }
    return (this.root?.innerText ?? '').replace(new RegExp(ZWSP, 'g'), '');
  }

  /** Focus the editor surface. */
  focus(): void {
    if (this.isSourceView) this.sourceAreaRef?.nativeElement?.focus();
    else this.root?.focus();
  }

  /** Insert (sanitized) HTML at the caret. */
  insertHtml(html: string): void {
    this.focusAndRestore();
    this.doc.execCommand('insertHTML', false, sanitizeHtml(html));
    this.afterChange();
  }

  /** Run a toolbar command programmatically. */
  execute(item: KalpnaToolbarItem): void {
    this.run(item);
  }

  /** Current word / character count. */
  getWordCount(): KalpnaWordCount {
    return { words: this.words, characters: this.characters };
  }

  // ===================================================================
  // Template helpers
  // ===================================================================

  t(key: string): string {
    return this.labels[key] ?? KALPNA_LABELS_EN[key] ?? key;
  }

  icon(name: string): SafeHtml {
    let v = this.iconCache.get(name);
    if (!v) {
      // Static, library-owned SVG markup — safe to trust.
      v = this.domSanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${KALPNA_ICONS[name] ?? ''}</svg>`);
      this.iconCache.set(name, v);
    }
    return v;
  }

  simple(item: KalpnaToolbarItem): SimpleButton | undefined {
    return SIMPLE_BUTTONS[item];
  }

  title(item: KalpnaToolbarItem): string {
    const def = SIMPLE_BUTTONS[item];
    const label = this.t(def?.label ?? item);
    return def?.shortcut ? `${label} (${def.shortcut})` : label;
  }

  hasToolbarItem(item: KalpnaToolbarItem): boolean {
    return this.activeToolbar.includes(item);
  }

  isItemDisabled(item: KalpnaToolbarItem): boolean {
    if (this.isSourceView && !SOURCE_MODE_ITEMS.has(item)) return true;
    if (item === 'undo') return !this.canUndo;
    if (item === 'redo') return !this.canRedo;
    if (item === 'unlink') return !this.on['link'];
    return false;
  }

  isItemOn(item: KalpnaToolbarItem): boolean {
    switch (item) {
      case 'source': return this.isSourceView;
      case 'fullscreen': return this.isFullscreen;
      case 'showBlocks': return this.showBlocks;
      case 'findReplace': return this.showFind;
      case 'formatPainter': return !!this.painter;
      case 'transliteration': return this.translitOn;
      case 'alignLeft': case 'alignCenter': case 'alignRight': case 'alignJustify':
        return this.currentAlign === item.replace('align', '').toLowerCase();
      default: return !!this.on[item];
    }
  }

  get alignIcon(): string {
    return 'align' + this.currentAlign.charAt(0).toUpperCase() + this.currentAlign.slice(1);
  }

  get headingLabel(): string {
    const opt = this.headingOptions.find((h) => h.tag === this.currentBlock);
    return this.t(opt?.key ?? 'paragraph');
  }

  get filteredChars(): [string, string][] {
    const q = this.charSearch.trim().toLowerCase();
    if (!q) return this.specialCharacters[this.charCategory]?.chars ?? [];
    return this.specialCharacters.flatMap((c) => c.chars).filter(([ch, name]) => ch === q || name.toLowerCase().includes(q));
  }

  get currentEmojis(): KalpnaCharCategory {
    return this.emojiCategories[this.emojiCategory] ?? this.emojiCategories[0];
  }

  get overLimit(): boolean {
    return !!this.config.maxCharacters && this.characters > this.config.maxCharacters;
  }

  get showStatus(): boolean {
    return this.config.wordCount !== false;
  }

  get minRootHeight(): string {
    return this.minHeight;
  }

  /** Prevent toolbar buttons from stealing the editor selection. */
  keepSelection(event: MouseEvent): void {
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'OPTION' || tag === 'LABEL') {
      this.saveSelection();
      return;
    }
    event.preventDefault();
  }

  toggleMenu(name: string, event?: Event): void {
    event?.stopPropagation();
    this.saveSelection();
    this.openMenu = this.openMenu === name ? null : name;
    if (this.openMenu === 'table') {
      this.gridRows = 0;
      this.gridCols = 0;
    }
    if (this.openMenu === 'orderedList') {
      const ol = this.closestInEditor('ol');
      this.listStart = ol ? (ol as HTMLOListElement).start || 1 : 1;
      this.listReversed = ol ? (ol as HTMLOListElement).reversed : false;
    }
    this.cdr.markForCheck();
  }

  closeMenus(): void {
    if (this.openMenu) {
      this.openMenu = null;
      this.cdr.markForCheck();
    }
  }

  // ===================================================================
  // Command dispatcher
  // ===================================================================

  run(item: KalpnaToolbarItem): void {
    if (this.disabled || this.readOnly) return;
    if (this.isItemDisabled(item)) return;
    this.openMenu = null;
    switch (item) {
      case 'bold': this.exec('bold'); break;
      case 'italic': this.exec('italic'); break;
      case 'underline': this.exec('underline'); break;
      case 'strikethrough': this.exec('strikeThrough'); break;
      case 'subscript': this.exec('subscript'); break;
      case 'superscript': this.exec('superscript'); break;
      case 'code': this.toggleInlineTag('code'); break;
      case 'formatPainter': this.toggleFormatPainter(); break;
      case 'alignLeft': this.applyAlignment('left'); break;
      case 'alignCenter': this.applyAlignment('center'); break;
      case 'alignRight': this.applyAlignment('right'); break;
      case 'alignJustify': this.applyAlignment('justify'); break;
      case 'unorderedList': this.insertUnorderedList(); break;
      case 'orderedList': this.insertOrderedList(); break;
      case 'todoList': this.toggleTodoList(); break;
      case 'indent': this.indent(); break;
      case 'outdent': this.outdent(); break;
      case 'blockquote': this.insertBlockquote(); break;
      case 'codeBlock': this.toggleCodeBlock(); break;
      case 'horizontalLine': this.insertHorizontalLine(); break;
      case 'pageBreak': this.insertPageBreak(); break;
      case 'link': this.openLinkDialog(); break;
      case 'unlink': this.unlink(); break;
      case 'image': this.triggerImageUpload(); break;
      case 'imageUrl': this.openImageUrlDialog(); break;
      case 'mediaEmbed': this.openMediaDialog(); break;
      case 'importWord': this.triggerWordImport(); break;
      case 'transliteration': this.cycleTypingLanguage(); break;
      case 'table': this.insertTable(this.tableRows, this.tableCols); break;
      case 'findReplace': this.toggleFind(); break;
      case 'selectAll': this.selectAll(); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'clear': this.clearFormatting(); break;
      case 'pastePlainText': this.pastePlainText(); break;
      case 'source': this.toggleSourceCode(); break;
      case 'showBlocks': this.showBlocks = !this.showBlocks; break;
      case 'preview': this.openPreview(); break;
      case 'print': this.print(); break;
      case 'exportPdf': this.print(); break;
      case 'exportWord': this.exportWord(); break;
      case 'fullscreen': this.toggleFullscreen(); break;
      case 'help': this.modal = 'help'; break;
      default: break;
    }
    this.cdr.markForCheck();
  }

  // ===================================================================
  // Low-level helpers
  // ===================================================================

  private focusAndRestore(): void {
    if (this.doc.activeElement !== this.root) this.root.focus({ preventScroll: true });
    this.restoreSelection();
  }

  /** document.execCommand wrapper. */
  private exec(command: string, value?: string, useCss = false): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    this.focusAndRestore();
    try {
      this.doc.execCommand('styleWithCSS', false, useCss as unknown as string);
      this.doc.execCommand(command, false, value ?? '');
    } catch {
      // ignore unsupported commands
    }
    this.afterChange();
  }

  /** Call after every programmatic DOM mutation. */
  private afterChange(typing = false): void {
    this.normalizeDom();
    this.saveState(typing);
    this.emitFromDom();
    this.updateEmptyState();
    this.updateToolbarState();
    if (this.showFind) this.runFind(false);
    this.cdr.markForCheck();
  }

  private getRange(): Range | null {
    const sel = this.doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (this.root.contains(r.commonAncestorContainer)) return r;
    }
    return this.savedRange;
  }

  private setCaret(node: Node, offset: number): void {
    const sel = this.doc.getSelection();
    if (!sel) return;
    const r = this.doc.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    this.savedRange = r.cloneRange();
  }

  private selectNodeContents(node: Node): void {
    const sel = this.doc.getSelection();
    if (!sel) return;
    const r = this.doc.createRange();
    r.selectNodeContents(node);
    sel.removeAllRanges();
    sel.addRange(r);
    this.savedRange = r.cloneRange();
  }

  private caretElement(): HTMLElement | null {
    const r = this.getRange();
    if (!r) return null;
    const n = r.startContainer;
    const el = n.nodeType === Node.ELEMENT_NODE ? (n as HTMLElement) : n.parentElement;
    if (n.nodeType === Node.ELEMENT_NODE && r.startOffset < n.childNodes.length) {
      const child = n.childNodes[r.startOffset];
      if (child.nodeType === Node.ELEMENT_NODE && !r.collapsed) return child as HTMLElement;
    }
    return el && this.root.contains(el) ? el : null;
  }

  private closestInEditor(selector: string, from?: Node | null): HTMLElement | null {
    const start = from ?? this.caretElement();
    const el = start && (start.nodeType === Node.ELEMENT_NODE ? (start as HTMLElement) : start.parentElement);
    const found = el?.closest(selector) as HTMLElement | null;
    return found && found !== this.root && this.root.contains(found) ? found : null;
  }

  private isBlank(el: Element): boolean {
    return !(el.textContent ?? '').replace(new RegExp(ZWSP, 'g'), '').trim() && !el.querySelector('img, iframe, table, hr, .page-break');
  }

  /** Leaf blocks (blocks that contain no other block) intersecting the range. */
  private leafBlocks(range: Range): HTMLElement[] {
    const all = Array.from(this.root.querySelectorAll<HTMLElement>(LEAF_BLOCK_SELECTOR)).filter((b) => {
      if (!range.intersectsNode(b)) return false;
      return !Array.from(b.children).some((c) => BLOCK_TAGS.has(c.tagName) && c.tagName !== 'BR');
    });
    if (all.length) return all;
    const single = this.closestInEditor(LEAF_BLOCK_SELECTOR, range.startContainer);
    return single ? [single] : [];
  }

  /** Top-level children of the root intersecting the range (wrapping stray inline nodes in <p>). */
  private topLevelBlocks(range: Range): HTMLElement[] {
    this.wrapRootInlines();
    return Array.from(this.root.children).filter((c) => range.intersectsNode(c)) as HTMLElement[];
  }

  /** Run fn on a sub-range per leaf block so inline wrappers never cross block boundaries. */
  private forEachBlockRange(range: Range, fn: (sub: Range) => void): void {
    const blocks = this.leafBlocks(range);
    if (!blocks.length) {
      fn(range);
      return;
    }
    const subs = blocks.map((b) => {
      const sub = this.doc.createRange();
      sub.selectNodeContents(b);
      if (b.contains(range.startContainer)) sub.setStart(range.startContainer, range.startOffset);
      if (b.contains(range.endContainer)) sub.setEnd(range.endContainer, range.endOffset);
      return sub;
    });
    subs.reverse().forEach((s) => {
      if (!s.collapsed) fn(s);
    });
  }

  private unwrap(el: Element): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  private wrapRange(range: Range, wrapper: HTMLElement): HTMLElement {
    const frag = range.extractContents();
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
    return wrapper;
  }

  /** Elements matching selector that intersect the range (plus the ancestor containing it). */
  private intersecting(range: Range, selector: string): HTMLElement[] {
    const set = new Set<HTMLElement>();
    this.root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (range.intersectsNode(el)) set.add(el);
    });
    const anc = this.closestInEditor(selector, range.commonAncestorContainer);
    if (anc) set.add(anc);
    return Array.from(set);
  }

  /** Remove an inline style property from elements touched by the selection. */
  private removeInlineStyle(prop: string): void {
    const r = this.getRange();
    if (!r) return;
    this.intersecting(r, '[style]').forEach((el) => {
      if (BLOCK_TAGS.has(el.tagName) && prop !== 'line-height' && prop !== 'text-align') {
        // only touch inline elements for font props
        if (!['font-family', 'font-size', 'color', 'background-color'].includes(prop)) return;
        if (el.tagName !== 'SPAN') {
          el.style.removeProperty(prop);
          if (!el.getAttribute('style')) el.removeAttribute('style');
          return;
        }
      }
      el.style.removeProperty(prop);
      if (!el.getAttribute('style')) el.removeAttribute('style');
      if (el.tagName === 'SPAN' && !el.attributes.length) this.unwrap(el);
    });
  }

  /** Insert a block-level element at the caret (after the current block). */
  private insertBlock(el: HTMLElement, caretInside?: Node): void {
    this.focusAndRestore();
    const r = this.getRange();
    const host = (r && this.closestInEditor('td, th, li, blockquote', r.startContainer)) || this.root;
    let child: Node | null = null;
    if (r) {
      child = r.startContainer;
      while (child && child.parentNode !== host) child = child.parentNode;
    }
    if (host === this.root) this.wrapRootInlines();
    if (child && child.nodeType === Node.ELEMENT_NODE && child !== el && BLOCK_TAGS.has((child as Element).tagName) && this.isBlank(child as Element) && !['UL', 'OL', 'TABLE', 'FIGURE', 'HR'].includes((child as Element).tagName)) {
      host.replaceChild(el, child);
    } else if (child) {
      host.insertBefore(el, child.nextSibling);
    } else {
      host.appendChild(el);
    }
    let next = el.nextElementSibling;
    if (!next || next.tagName === 'HR' || next.tagName === 'FIGURE' || next.tagName === 'TABLE' || next.classList.contains('page-break')) {
      const p = this.doc.createElement('p');
      p.innerHTML = '<br>';
      host.insertBefore(p, el.nextSibling);
      next = p;
    }
    if (caretInside) this.setCaret(caretInside, 0);
    else this.setCaret(next, 0);
    this.afterChange();
  }

  /** Wrap inline nodes that sit directly in the root into paragraphs (keeps the caret). */
  private wrapRootInlines(): void {
    const sel = this.doc.getSelection();
    const anchor = sel && sel.rangeCount ? { n: sel.anchorNode, o: sel.anchorOffset, fn: sel.focusNode, fo: sel.focusOffset } : null;
    let changed = false;
    let p: HTMLElement | null = null;
    Array.from(this.root.childNodes).forEach((n) => {
      const isBlock = n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName);
      const isEmptyText = n.nodeType === Node.TEXT_NODE && !(n.textContent ?? '').trim() && !p;
      if (isBlock || n.nodeType === Node.COMMENT_NODE) {
        p = null;
        return;
      }
      if (isEmptyText) return;
      if (!p) {
        p = this.doc.createElement('p');
        this.root.insertBefore(p, n);
      }
      p.appendChild(n);
      changed = true;
    });
    if (changed && anchor?.n && anchor.fn && sel && this.root.contains(anchor.n)) {
      try {
        sel.setBaseAndExtent(anchor.n, anchor.o, anchor.fn, anchor.fo);
      } catch {
        /* ignore */
      }
    }
  }

  /** Fix up markup produced by execCommand. */
  private normalizeDom(): void {
    const root = this.root;
    const structural = root.querySelector('font, span:not([class]):not([style]):not([data-mention])');
    const offsets = structural ? this.getTextOffsets() : null;
    // <font size="7"> → span font-size (our font size marker)
    root.querySelectorAll('font').forEach((f) => {
      const span = this.doc.createElement('span');
      const size = f.getAttribute('size');
      if (size === '7' && this.currentSizeMarker) span.style.fontSize = this.currentSizeMarker;
      const face = f.getAttribute('face');
      if (face) span.style.fontFamily = face;
      const color = f.getAttribute('color');
      if (color) span.style.color = color;
      if (f.getAttribute('style')) span.setAttribute('style', (span.getAttribute('style') ?? '') + ';' + f.getAttribute('style'));
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      if (size === '7' && this.currentSizeMarker) {
        span.querySelectorAll<HTMLElement>('[style*="font-size"]').forEach((d) => {
          d.style.removeProperty('font-size');
          if (!d.getAttribute('style')) d.removeAttribute('style');
          if (d.tagName === 'SPAN' && !d.attributes.length) this.unwrap(d);
        });
      }
    });
    // Chrome sometimes wraps with span style="font-size: xxx-large" when styleWithCSS stuck on
    if (this.currentSizeMarker) {
      root.querySelectorAll<HTMLElement>('span[style*="xxx-large"]').forEach((s) => (s.style.fontSize = this.currentSizeMarker));
    }
    // To-do items always carry a checked state
    root.querySelectorAll('ul.todo-list > li:not([data-checked])').forEach((li) => li.setAttribute('data-checked', 'false'));
    // Lists inside to-do lists that lost the class
    root.querySelectorAll('ul.todo-list ul:not(.todo-list)').forEach((ul) => ul.classList.add('todo-list'));
    // Remove empty inline wrappers left by commands
    root.querySelectorAll('span:not([class]):not([style]):not([data-mention])').forEach((s) => this.unwrap(s));
    if (offsets) this.setTextOffsets(offsets);
  }

  /** Selection as character offsets from the start of the root (survives DOM restructuring). */
  private getTextOffsets(): [number, number] | null {
    const sel = this.doc.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!this.root.contains(r.commonAncestorContainer)) return null;
    const pre = this.doc.createRange();
    pre.selectNodeContents(this.root);
    pre.setEnd(r.startContainer, r.startOffset);
    const start = pre.toString().length;
    return [start, start + r.toString().length];
  }

  private setTextOffsets([start, end]: [number, number]): void {
    const walker = this.doc.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let s: [Node, number] | null = null;
    let e: [Node, number] | null = null;
    let n: Node | null;
    let last: Text | null = null;
    while ((n = walker.nextNode())) {
      const t = n as Text;
      const len = t.length;
      if (!s && start <= pos + len) s = [t, start - pos];
      if (!e && end <= pos + len) {
        e = [t, end - pos];
        break;
      }
      pos += len;
      last = t;
    }
    if (!s && last) s = [last, last.length];
    if (!e) e = s;
    if (!s || !e) return;
    const sel = this.doc.getSelection();
    const r = this.doc.createRange();
    try {
      r.setStart(s[0], s[1]);
      r.setEnd(e[0], e[1]);
    } catch {
      return;
    }
    sel?.removeAllRanges();
    sel?.addRange(r);
    this.savedRange = r.cloneRange();
  }

  private currentSizeMarker = '';

  // ===================================================================
  // Events from the editing surface
  // ===================================================================

  onEditorInput(event?: Event): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    const ie = event as InputEvent | undefined;
    const typing = !!ie && (ie.inputType === 'insertText' || ie.inputType === 'deleteContentBackward' || ie.inputType === 'deleteContentForward' || ie.inputType === 'insertCompositionText');
    if (this.root.childNodes.length && Array.from(this.root.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim())) {
      this.wrapRootInlines();
    }
    if (ie?.inputType === 'insertText' && ie.data) {
      if (this.handleAutoformat(ie.data)) return;
      this.handleTextTransformation();
      if (ie.data === ' ' || ie.data === ' ') this.handleAutoLink();
    }
    if (ie?.inputType === 'insertParagraph') {
      // new to-do items start unchecked
      const li = this.closestInEditor('ul.todo-list > li');
      if (li && this.isBlank(li)) li.setAttribute('data-checked', 'false');
    }
    this.afterChange(typing);
    this.checkMention();
    this.updateTranslit();
  }

  onEditorFocus(): void {
    try {
      this.doc.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      /* ignore */
    }
    this.focusEvent.emit();
  }

  onEditorBlur(): void {
    this.onTouched();
    this.blurEvent.emit();
    this.emitFromDom();
  }

  private onSelectionChange(): void {
    if (!this.viewReady || this.isSourceView) return;
    const sel = this.doc.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!this.root.contains(r.commonAncestorContainer)) return;
    this.savedRange = r.cloneRange();
    this.updateToolbarState();
    if (this.mention && (!r.collapsed || r.startContainer !== this.mention.node)) this.mention = null;
    if (this.translit && (!r.collapsed || r.startContainer !== this.translit.node || r.startOffset !== this.translit.start + this.translit.latin.length)) this.translit = null;
    this.cdr.markForCheck();
  }

  private onBeforeInput(e: InputEvent): void {
    if (e.inputType === 'historyUndo') {
      e.preventDefault();
      this.undo();
      return;
    }
    if (e.inputType === 'historyRedo') {
      e.preventDefault();
      this.redo();
      return;
    }
    const max = this.config.maxCharacters;
    if (max && (e.inputType.startsWith('insert') && e.inputType !== 'insertParagraph' && e.inputType !== 'insertLineBreak')) {
      const r = this.getRange();
      const replacing = r && !r.collapsed;
      if (this.characters >= max && !replacing) e.preventDefault();
    }
    if (this.selectedEl && e.inputType.startsWith('insert')) this.deselect();
  }

  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG' && this.root.contains(target)) {
      this.selectElement((target.closest('figure.image') as HTMLElement) ?? target);
      return;
    }
    const media = target.closest('figure.media') as HTMLElement | null;
    if (media && this.root.contains(media)) {
      this.selectElement(media);
      return;
    }
    if (target.closest('.page-break')) {
      this.selectElement(target.closest('.page-break') as HTMLElement);
      return;
    }
    if (this.selectedEl && !target.closest('figcaption')) this.deselect();
    if (this.painter) this.applyFormatPainter();
  }

  onEditorMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // to-do checkbox toggle (the ::before box at the start of the item)
    if (target.tagName === 'LI' && target.parentElement?.classList.contains('todo-list')) {
      const rect = target.getBoundingClientRect();
      const rtl = getComputedStyle(target).direction === 'rtl';
      const x = rtl ? rect.right - event.clientX : event.clientX - rect.left;
      if (x >= 0 && x < 22) {
        event.preventDefault();
        if (this.readOnly || this.disabled) return;
        target.setAttribute('data-checked', target.getAttribute('data-checked') === 'true' ? 'false' : 'true');
        this.afterChange();
      }
    }
  }

  onEditorKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readOnly) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    // mentions list navigation
    if (this.mention) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const n = this.mention.items.length;
        this.mention.index = (this.mention.index + (event.key === 'ArrowDown' ? 1 : n - 1)) % n;
        this.cdr.markForCheck();
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.pickMention(this.mention.items[this.mention.index]);
        return;
      }
      if (event.key === 'Escape') {
        this.mention = null;
        this.cdr.markForCheck();
        return;
      }
    }

    // Marathi transliteration suggestions
    if (this.translit && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const t = this.translit;
      const total = t.items.length + 1; // + "English"
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        t.index = (t.index + (event.key === 'ArrowDown' ? 1 : total - 1)) % total;
        this.cdr.markForCheck();
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.pickTranslit(t.index);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.translitSkip = `${t.start}:${t.latin}`;
        this.translit = null;
        this.cdr.markForCheck();
        return;
      }
      const isUrlish = /^(www|http|https|ftp)$/i.test(t.latin);
      if (event.key === ' ' || (/^[,?!;:)\]}"।]$/.test(event.key)) || (event.key === '.' && !isUrlish)) {
        this.pickTranslit(t.index); // the typed key is then inserted normally
      }
    }
    if (event.altKey && !event.ctrlKey && (event.key === 'm' || event.key === 'M')) {
      event.preventDefault();
      this.cycleTypingLanguage();
      return;
    }

    // selected image / media / page break
    if (this.selectedEl) {
      if ((event.key === 'Delete' || event.key === 'Backspace') && !this.closestInEditor('figcaption')) {
        event.preventDefault();
        this.removeSelected();
        return;
      }
      if (event.key === 'Escape') {
        this.deselect();
        return;
      }
    }

    if (mod && !event.altKey) {
      const map: Record<string, KalpnaToolbarItem> = { b: 'bold', i: 'italic', u: 'underline', k: 'link', e: 'code', ',': 'subscript', '.': 'superscript', f: 'findReplace', p: 'print' };
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
        return;
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        this.redo();
        return;
      }
      if (event.shiftKey && key === 'v') {
        this.plainPasteNext = true;
        return;
      }
      if (event.shiftKey && key === 'x') {
        event.preventDefault();
        this.run('strikethrough');
        return;
      }
      if (event.shiftKey && ['l', 'e', 'r', 'j'].includes(key)) {
        event.preventDefault();
        this.applyAlignment(({ l: 'left', e: 'center', r: 'right', j: 'justify' } as Record<string, 'left' | 'center' | 'right' | 'justify'>)[key]);
        return;
      }
      if (!event.shiftKey && map[key]) {
        event.preventDefault();
        if (map[key] === 'findReplace') this.toggleFind(true);
        else this.run(map[key]);
        return;
      }
    }
    if (event.altKey && event.key === '0') {
      event.preventDefault();
      this.modal = 'help';
      this.cdr.markForCheck();
      return;
    }

    // code block behaviour
    const pre = this.closestInEditor('pre');
    if (pre) {
      if (event.key === 'Tab') {
        event.preventDefault();
        if (!event.shiftKey) this.doc.execCommand('insertText', false, '    ');
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (this.exitCodeBlockIfEmptyLine(pre)) return;
        this.doc.execCommand('insertLineBreak');
        return;
      }
    }

    // tables: Tab navigation
    const cell = this.closestInEditor('td, th') as HTMLTableCellElement | null;
    if (cell && event.key === 'Tab') {
      event.preventDefault();
      const table = cell.closest('table') as HTMLTableElement;
      let next = T.siblingCell(table, cell, event.shiftKey);
      if (!next && !event.shiftKey) {
        T.insertRow(table, cell, true);
        next = T.siblingCell(table, cell, false);
        this.afterChange();
      }
      if (next) this.selectNodeContents(next);
      return;
    }

    // lists: Tab = indent
    if (event.key === 'Tab' && this.closestInEditor('li')) {
      event.preventDefault();
      if (event.shiftKey) this.outdent();
      else this.indent();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      this.handleAutoLink(true);
    }
  }

  private onDocumentMouseDown(e: MouseEvent): void {
    const target = e.target as Node;
    const host = this.rootRef?.nativeElement;
    if (!host) return;
    if (this.openMenu && !(target instanceof Element && target.closest('.kalpna-dd'))) {
      this.openMenu = null;
      this.cdr.markForCheck();
    }
    if (this.mention && !(target instanceof Element && target.closest('.kalpna-mentions'))) {
      this.mention = null;
      this.cdr.markForCheck();
    }
    if (!host.contains(target) && !(target instanceof Element && target.closest('.kalpna-modal-backdrop'))) {
      if (this.selectedEl) this.deselect();
      if (this.balloon) {
        this.balloon = null;
        this.cdr.markForCheck();
      }
    }
  }

  private onDocumentKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.modal) {
        this.modal = null;
        this.focusAndRestore();
      } else if (this.openMenu) {
        this.openMenu = null;
      } else if (this.showFind && this.rootRef.nativeElement.contains(this.doc.activeElement)) {
        this.toggleFind(false);
      } else if (this.isFullscreen) {
        this.toggleFullscreen();
      }
      this.cdr.markForCheck();
    }
  }

  onToolbarKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const target = event.target as HTMLElement;
    if (target.closest('.kalpna-panel')) return;
    const buttons = Array.from(this.toolbarEl?.nativeElement.querySelectorAll<HTMLElement>(':scope > .kalpna-btn, :scope > .kalpna-dd > .kalpna-btn, :scope > .kalpna-dd > .kalpna-row > .kalpna-btn, :scope > .kalpna-lang-switch > .kalpna-lang-opt') ?? []).filter((b) => !(b as HTMLButtonElement).disabled);
    const i = buttons.indexOf(target);
    if (i === -1) return;
    event.preventDefault();
    buttons[(i + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length].focus();
  }

  onRootKeyDown(event: KeyboardEvent): void {
    if (event.altKey && event.key === 'F10') {
      event.preventDefault();
      this.saveSelection();
      this.toolbarEl?.nativeElement.querySelector<HTMLElement>('.kalpna-btn:not(:disabled)')?.focus();
    }
  }

  // ===================================================================
  // Toolbar state
  // ===================================================================

  private updateToolbarState(): void {
    if (!this.viewReady || this.isSourceView) return;
    const r = this.getRange();
    const st: Record<string, boolean> = {};
    const q = (c: string) => {
      try {
        return this.doc.queryCommandState(c);
      } catch {
        return false;
      }
    };
    if (r) {
      st['bold'] = q('bold');
      st['italic'] = q('italic');
      st['underline'] = q('underline');
      st['strikethrough'] = q('strikeThrough');
      st['subscript'] = q('subscript');
      st['superscript'] = q('superscript');
      const el = this.caretElement();
      const pre = this.closestInEditor('pre', el);
      st['code'] = !!this.closestInEditor('code', el) && !pre;
      st['codeBlock'] = !!pre;
      const list = this.closestInEditor('ul, ol', el);
      st['todoList'] = !!list && list.classList.contains('todo-list');
      st['unorderedList'] = !!list && list.tagName === 'UL' && !st['todoList'];
      st['orderedList'] = !!list && list.tagName === 'OL';
      st['blockquote'] = !!this.closestInEditor('blockquote', el);
      const link = this.closestInEditor('a[href]', el) as HTMLAnchorElement | null;
      st['link'] = !!link;
      const block = this.closestInEditor('p, h1, h2, h3, h4, h5, h6, pre, li, td, th, div, blockquote, figcaption', el);
      const tag = block?.tagName.toLowerCase() ?? 'p';
      this.currentBlock = /^h[1-6]$|^pre$/.test(tag) ? tag : 'p';
      if (block) {
        const cs = getComputedStyle(block);
        const ta = cs.textAlign;
        this.currentAlign = ta === 'center' ? 'center' : ta === 'right' || (ta === 'end' && cs.direction === 'ltr') ? 'right' : ta === 'justify' ? 'justify' : 'left';
        this.currentLineHeight = block.style.lineHeight || '';
        st['rtl'] = cs.direction === 'rtl';
      }
      const sizeEl = el?.closest('[style*="font-size"]') as HTMLElement | null;
      this.currentSize = sizeEl && this.root.contains(sizeEl) ? sizeEl.style.fontSize : '';
      const famEl = el?.closest('[style*="font-family"]') as HTMLElement | null;
      const fam = famEl && this.root.contains(famEl) ? famEl.style.fontFamily.split(',')[0].replace(/["']/g, '').trim() : '';
      this.currentFont = this.fontFamilies.find((f) => f.toLowerCase() === fam.toLowerCase()) ?? fam;
      this.currentPre = pre;
      if (pre) this.currentLanguage = pre.getAttribute('data-language') || 'plaintext';
      this.currentLink = link;
      this.currentLinkHref = link?.getAttribute('href') ?? '';
      const cell = this.closestInEditor('td, th', el) as HTMLTableCellElement | null;
      if (cell !== this.currentCell) {
        this.currentCell?.classList.remove('kalpna-cell-focus');
        if (cell && this.root.contains(cell)) cell.classList.add('kalpna-cell-focus');
        this.currentCell = cell;
      }
      if (cell) {
        const table = cell.closest('table') as HTMLTableElement;
        this.hasHeaderRow = T.hasHeaderRow(table);
        this.hasHeaderCol = T.hasHeaderColumn(table);
        this.hasCaption = !!table.caption;
      }
    }
    this.on = st;
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = this.redoStack.length > 0;
    this.updateBalloon();
  }

  private updateBalloon(): void {
    if (this.selectedEl && this.root.contains(this.selectedEl)) {
      const isMedia = this.selectedEl.matches('figure.media, .page-break');
      this.balloon = this.positionBalloon(isMedia ? 'media' : 'image', this.selectedEl);
      this.positionHandles();
      return;
    }
    this.handles = [];
    if (this.currentLink) {
      this.balloon = this.positionBalloon('link', this.currentLink);
    } else if (this.currentPre) {
      this.balloon = this.positionBalloon('code', this.currentPre);
    } else if (this.currentCell) {
      this.balloon = this.positionBalloon('table', this.currentCell.closest('table') as HTMLElement, true);
    } else {
      this.balloon = null;
    }
  }

  private positionBalloon(type: NonNullable<Balloon>['type'], target: Element, preferAbove = false): Balloon {
    const body = this.bodyRef.nativeElement.getBoundingClientRect();
    const rect = (target.tagName === 'FIGURE' && target.querySelector('img') ? target.querySelector('img')! : target).getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const width = body.width;
    let left = Math.max(4, Math.min(rect.left - body.left, width - 320));
    if (type === 'image' || type === 'media') left = Math.max(4, Math.min(rect.left - body.left + rect.width / 2 - 150, width - 320));
    let top: number;
    let above = false;
    if (preferAbove && rect.top - body.top - 46 >= 0 && rect.top >= rootRect.top) {
      top = rect.top - body.top - 46;
      above = true;
    } else {
      top = Math.min(rect.bottom, rootRect.bottom) - body.top + 8;
    }
    if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) return null; // scrolled out
    return { type, top, left, above };
  }

  private repositionOverlays(): void {
    if (!this.viewReady) return;
    this.updateBalloon();
    if (this.mention) this.mention = null;
    this.cdr.markForCheck();
  }

  // ===================================================================
  // Inline formatting
  // ===================================================================

  applyBold(): void {
    this.run('bold');
  }
  applyItalic(): void {
    this.run('italic');
  }
  applyUnderline(): void {
    this.run('underline');
  }
  applyStrike(): void {
    this.run('strikethrough');
  }

  /** Toggle an inline wrapper element (code, mark…) on the selection. */
  private toggleInlineTag(tag: string, className?: string): void {
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    const selector = className ? `${tag}.${className}` : tag;
    const anc = this.closestInEditor(selector, r.commonAncestorContainer);
    if (anc) {
      this.unwrap(anc);
      this.afterChange();
      return;
    }
    if (r.collapsed) {
      const el = this.doc.createElement(tag);
      if (className) el.className = className;
      el.textContent = ZWSP;
      r.insertNode(el);
      this.setCaret(el.firstChild!, 1);
      this.afterChange();
      return;
    }
    let last: HTMLElement | null = null;
    let first: HTMLElement | null = null;
    this.forEachBlockRange(r, (sub) => {
      const el = this.doc.createElement(tag);
      if (className) el.className = className;
      this.wrapRange(sub, el);
      el.querySelectorAll(tag).forEach((inner) => this.unwrap(inner));
      if (!last) last = el;
      first = el;
    });
    if (first && last) {
      const sel = this.doc.getSelection();
      const nr = this.doc.createRange();
      nr.setStartBefore(first);
      nr.setEndAfter(last);
      sel?.removeAllRanges();
      sel?.addRange(nr);
      this.savedRange = nr.cloneRange();
    }
    this.afterChange();
  }

  applyFontFamily(family: string): void {
    this.openMenu = null;
    this.focusAndRestore();
    if (!family) {
      this.removeInlineStyle('font-family');
      this.afterChange();
    } else {
      this.exec('fontName', family, true);
    }
    this.currentFont = family;
    // Choosing a Devanagari font switches typing to Marathi (and a Latin font back to English).
    if (family && this.translitConfig.followFont !== false && this.hasToolbarItem('transliteration') || (family && this.translitConfig.followFont === true)) {
      const dev = this.isDevanagariFont(family);
      if (dev && !this.translitOn) this.setTypingLanguage(this.translitConfig.fontLanguage ?? 'mr');
      else if (!dev && this.translitOn) this.setTypingLanguage('en');
    }
  }

  /** True for fonts that are meant for Devanagari / Marathi text. */
  isDevanagariFont(family: string): boolean {
    const extra = (this.translitConfig.devanagariFonts ?? []).map((f) => f.toLowerCase());
    const f = family.toLowerCase().replace(/["']/g, '').trim();
    return extra.includes(f) || /devanagari|marathi|mangal|mukta|hind|kokila|aparajita|utsaah|kruti|shivaji|yatra|baloo|tiro|kalam|sahitya|martel|laila|rozha|karma|amita|sarala|eczar|khand|rajdhani|sanskrit|lohit|gargi|kalimati|annapurna|shree|akshar/.test(f);
  }

  setTypingLanguage(lang: 'en' | 'mr' | 'hi'): void {
    this.openMenu = null;
    this.typingLang = lang;
    this.translit = null;
    try {
      localStorage.setItem('kalpna-typing-lang', lang);
    } catch {
      /* ignore */
    }
    this.focusAndRestore();
    this.cdr.markForCheck();
  }

  /** Cycle English → मराठी → हिंदी (Alt+M). */
  cycleTypingLanguage(): void {
    const opts = this.visibleTypingOptions.map((o) => o.code);
    const i = opts.indexOf(this.typingLang);
    this.setTypingLanguage(opts[(i + 1) % opts.length] ?? 'en');
  }

  applyFontSize(size: string): void {
    this.openMenu = null;
    this.focusAndRestore();
    if (!size) {
      this.removeInlineStyle('font-size');
      this.afterChange();
      this.currentSize = '';
      return;
    }
    this.currentSizeMarker = size;
    this.exec('fontSize', '7', true);
    this.currentSize = size;
  }

  applyLineHeight(value: string): void {
    this.openMenu = null;
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    this.leafBlocks(r).forEach((b) => {
      if (value) b.style.lineHeight = value;
      else b.style.removeProperty('line-height');
      if (!b.getAttribute('style')) b.removeAttribute('style');
    });
    this.afterChange();
  }

  applyTextColor(color: string): void {
    this.openMenu = null;
    if (!color) {
      this.focusAndRestore();
      this.removeInlineStyle('color');
      this.afterChange();
      return;
    }
    this.lastTextColor = color;
    this.exec('foreColor', color, true);
  }

  applyBackgroundColor(color: string): void {
    this.openMenu = null;
    if (!color) {
      this.focusAndRestore();
      this.removeInlineStyle('background-color');
      this.afterChange();
      return;
    }
    this.lastBgColor = color;
    this.focusAndRestore();
    try {
      this.doc.execCommand('styleWithCSS', false, true as unknown as string);
      if (!this.doc.execCommand('hiliteColor', false, color)) this.doc.execCommand('backColor', false, color);
    } catch {
      this.doc.execCommand('backColor', false, color);
    }
    this.afterChange();
  }

  /** Legacy API kept for compatibility. */
  applyColor(type: 'color' | 'backgroundColor', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'color') this.applyTextColor(value);
    else this.applyBackgroundColor(value);
  }

  onCustomColor(type: 'text' | 'bg', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.restoreSelection();
    if (type === 'text') this.applyTextColor(value);
    else this.applyBackgroundColor(value);
  }

  applyHighlight(cls: string | null): void {
    this.openMenu = null;
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    // remove existing markers in range
    this.intersecting(r, 'mark').forEach((m) => this.unwrap(m));
    if (cls) {
      this.lastHighlight = cls;
      const r2 = this.getRange();
      if (r2 && !r2.collapsed) {
        this.forEachBlockRange(r2, (sub) => {
          const mark = this.doc.createElement('mark');
          mark.className = cls;
          this.wrapRange(sub, mark);
          mark.querySelectorAll('mark').forEach((m) => this.unwrap(m));
        });
      } else if (r2) {
        const mark = this.doc.createElement('mark');
        mark.className = cls;
        mark.textContent = ZWSP;
        r2.insertNode(mark);
        this.setCaret(mark.firstChild!, 1);
      }
    }
    this.afterChange();
  }

  highlightColor(cls: string): string {
    return this.highlighters.find((h) => h.cls === cls)?.color ?? '#fdfd77';
  }

  applyCase(mode: 'upper' | 'lower' | 'title' | 'sentence'): void {
    this.openMenu = null;
    this.focusAndRestore();
    const r = this.getRange();
    if (!r || r.collapsed) return;
    const transform = (s: string): string => {
      switch (mode) {
        case 'upper': return s.toLocaleUpperCase();
        case 'lower': return s.toLocaleLowerCase();
        case 'title': return s.toLocaleLowerCase().replace(/(^|[\s\-–—(\["'“‘])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase());
        default: return s.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase());
      }
    };
    const walker = this.doc.createTreeWalker(r.commonAncestorContainer.nodeType === Node.TEXT_NODE ? r.commonAncestorContainer.parentNode! : r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    const parts: { node: Text; start: number; end: number }[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (!r.intersectsNode(n)) continue;
      const t = n as Text;
      const start = t === r.startContainer ? r.startOffset : 0;
      const end = t === r.endContainer ? r.endOffset : t.length;
      if (end > start) parts.push({ node: t, start, end });
    }
    const joined = parts.map((p) => p.node.data.slice(p.start, p.end)).join('');
    const out = transform(joined);
    let pos = 0;
    const sameLength = out.length === joined.length;
    parts.forEach((p) => {
      const len = p.end - p.start;
      const piece = sameLength ? out.slice(pos, pos + len) : transform(p.node.data.slice(p.start, p.end));
      pos += len;
      p.node.data = p.node.data.slice(0, p.start) + piece + p.node.data.slice(p.end);
    });
    if (parts.length) {
      const sel = this.doc.getSelection();
      const nr = this.doc.createRange();
      const last = parts[parts.length - 1];
      nr.setStart(parts[0].node, parts[0].start);
      nr.setEnd(last.node, Math.min(last.node.length, last.end + (sameLength ? 0 : 0)));
      sel?.removeAllRanges();
      sel?.addRange(nr);
      this.savedRange = nr.cloneRange();
    }
    this.afterChange();
  }

  clearFormatting(): void {
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    try {
      this.doc.execCommand('styleWithCSS', false, false as unknown as string);
      this.doc.execCommand('removeFormat');
    } catch {
      /* ignore */
    }
    const r2 = this.getRange();
    if (r2) {
      this.intersecting(r2, 'mark, code:not(pre code), span, font, sub, sup, s, strike, u, b, strong, i, em').forEach((el) => {
        if (el.closest('pre')) return;
        if (el.classList.contains('mention')) return;
        this.unwrap(el);
      });
    }
    this.afterChange();
  }

  toggleFormatPainter(): void {
    if (this.painter) {
      this.painter = null;
      return;
    }
    this.focusAndRestore();
    const el = this.caretElement();
    if (!el) return;
    const q = (c: string) => {
      try {
        return this.doc.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const find = (prop: string) => {
      const e = el.closest(`[style*="${prop}"]`) as HTMLElement | null;
      return e && this.root.contains(e) ? e.style.getPropertyValue(prop) : '';
    };
    const mark = el.closest('mark') as HTMLElement | null;
    this.painter = {
      bold: q('bold'), italic: q('italic'), underline: q('underline'), strikeThrough: q('strikeThrough'),
      subscript: q('subscript'), superscript: q('superscript'),
      color: find('color'), background: find('background-color'), family: find('font-family'), size: find('font-size'),
      mark: mark?.className ?? ''
    };
  }

  private applyFormatPainter(): void {
    const p = this.painter;
    const r = this.getRange();
    if (!p || !r || r.collapsed) return;
    this.painter = null;
    this.clearFormatting();
    (['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript'] as const).forEach((c) => {
      if (p[c]) {
        this.doc.execCommand('styleWithCSS', false, false as unknown as string);
        this.doc.execCommand(c);
      }
    });
    if (p['color']) {
      this.doc.execCommand('styleWithCSS', false, true as unknown as string);
      this.doc.execCommand('foreColor', false, p['color'] as string);
    }
    if (p['background']) {
      this.doc.execCommand('styleWithCSS', false, true as unknown as string);
      this.doc.execCommand('hiliteColor', false, p['background'] as string);
    }
    if (p['family']) {
      this.doc.execCommand('styleWithCSS', false, true as unknown as string);
      this.doc.execCommand('fontName', false, p['family'] as string);
    }
    if (p['size']) {
      this.currentSizeMarker = p['size'] as string;
      this.doc.execCommand('styleWithCSS', false, true as unknown as string);
      this.doc.execCommand('fontSize', false, '7');
    }
    this.afterChange();
    if (p['mark']) this.applyHighlight(p['mark'] as string);
  }

  // ===================================================================
  // Block formatting
  // ===================================================================

  applyAlignment(align: 'left' | 'center' | 'right' | 'justify'): void {
    this.openMenu = null;
    if (this.selectedEl && (align === 'left' || align === 'center' || align === 'right')) {
      this.setImageStyle(align === 'left' ? 'blockLeft' : align === 'right' ? 'blockRight' : 'alignCenter');
      return;
    }
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    const blocks = this.leafBlocks(r);
    if (!blocks.length) {
      const map: Record<string, string> = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' };
      this.exec(map[align]);
      return;
    }
    blocks.forEach((b) => {
      const target = b.tagName === 'LI' ? b : b;
      if (align === 'left' && getComputedStyle(target).direction !== 'rtl') target.style.removeProperty('text-align');
      else target.style.textAlign = align;
      if (!target.getAttribute('style')) target.removeAttribute('style');
    });
    this.afterChange();
  }

  applyHeading(tag: string): void {
    this.openMenu = null;
    if (!tag) return;
    this.focusAndRestore();
    if (this.closestInEditor('pre') && tag !== 'pre') {
      this.toggleCodeBlock();
    }
    this.exec('formatBlock', `<${tag}>`);
  }

  applyTextDirection(dir: 'ltr' | 'rtl'): void {
    this.openMenu = null;
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    this.leafBlocks(r).forEach((b) => {
      const target = b.tagName === 'LI' ? (b.parentElement as HTMLElement) : b;
      if (dir === 'ltr') target.removeAttribute('dir');
      else target.setAttribute('dir', 'rtl');
    });
    this.afterChange();
  }

  insertUnorderedList(style?: string): void {
    this.openMenu = null;
    this.focusAndRestore();
    const list = this.closestInEditor('ul, ol');
    if (list && list.classList.contains('todo-list')) {
      list.classList.remove('todo-list');
      list.querySelectorAll('li').forEach((li) => li.removeAttribute('data-checked'));
      if (!list.className) list.removeAttribute('class');
      this.afterChange();
      if (style) this.setListStyle(style);
      return;
    }
    if (style && list?.tagName === 'UL') {
      this.setListStyle(style);
      return;
    }
    this.exec('insertUnorderedList');
    if (style) this.setListStyle(style);
  }

  insertOrderedList(style?: string): void {
    this.openMenu = null;
    this.focusAndRestore();
    const list = this.closestInEditor('ul, ol');
    if (style && list?.tagName === 'OL') {
      this.setListStyle(style);
      return;
    }
    this.exec('insertOrderedList');
    if (style) this.setListStyle(style);
  }

  private setListStyle(style: string): void {
    const list = this.closestInEditor('ul, ol');
    if (!list) return;
    if (style === 'disc' || style === 'decimal') list.style.removeProperty('list-style-type');
    else list.style.listStyleType = style;
    if (!list.getAttribute('style')) list.removeAttribute('style');
    this.afterChange();
  }

  applyListProperties(): void {
    const ol = this.closestInEditor('ol') as HTMLOListElement | null;
    if (!ol) return;
    const start = Math.max(0, Math.floor(Number(this.listStart) || 1));
    if (start === 1) ol.removeAttribute('start');
    else ol.setAttribute('start', String(start));
    if (this.listReversed) ol.setAttribute('reversed', '');
    else ol.removeAttribute('reversed');
    this.afterChange();
  }

  currentListStyle(): string {
    const list = this.closestInEditor('ul, ol');
    return list?.style.listStyleType || (list?.tagName === 'OL' ? 'decimal' : 'disc');
  }

  toggleTodoList(): void {
    this.focusAndRestore();
    let list = this.closestInEditor('ul, ol');
    if (list?.classList.contains('todo-list')) {
      this.exec('insertUnorderedList'); // removes the list
      return;
    }
    if (!list) {
      this.exec('insertUnorderedList');
      list = this.closestInEditor('ul, ol');
    } else if (list.tagName === 'OL') {
      this.exec('insertUnorderedList'); // converts ol → ul
      list = this.closestInEditor('ul, ol');
    }
    if (!list) return;
    list.classList.add('todo-list');
    list.style.removeProperty('list-style-type');
    list.querySelectorAll(':scope > li').forEach((li) => {
      if (!li.hasAttribute('data-checked')) li.setAttribute('data-checked', 'false');
    });
    this.afterChange();
  }

  indent(): void {
    this.focusAndRestore();
    if (this.closestInEditor('li')) {
      this.exec('indent');
      return;
    }
    const r = this.getRange();
    if (!r) return;
    this.leafBlocks(r).forEach((b) => {
      if (b.tagName === 'TD' || b.tagName === 'TH') return;
      const cur = parseInt(b.style.marginLeft || '0', 10) || 0;
      b.style.marginLeft = cur + 40 + 'px';
    });
    this.afterChange();
  }

  outdent(): void {
    this.focusAndRestore();
    if (this.closestInEditor('li')) {
      this.exec('outdent');
      return;
    }
    const r = this.getRange();
    if (!r) return;
    this.leafBlocks(r).forEach((b) => {
      const cur = parseInt(b.style.marginLeft || '0', 10) || 0;
      const next = Math.max(0, cur - 40);
      if (next) b.style.marginLeft = next + 'px';
      else b.style.removeProperty('margin-left');
      if (!b.getAttribute('style')) b.removeAttribute('style');
    });
    this.afterChange();
  }

  insertBlockquote(): void {
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    const bq = this.closestInEditor('blockquote');
    if (bq) {
      this.unwrap(bq);
      this.afterChange();
      return;
    }
    const blocks = this.topLevelBlocks(r);
    if (!blocks.length) {
      this.exec('formatBlock', '<blockquote>');
      return;
    }
    const quote = this.doc.createElement('blockquote');
    blocks[0].parentNode?.insertBefore(quote, blocks[0]);
    blocks.forEach((b) => quote.appendChild(b));
    if (r) {
      const sel = this.doc.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    this.afterChange();
  }

  toggleCodeBlock(language?: string): void {
    this.focusAndRestore();
    const r = this.getRange();
    if (!r) return;
    const pre = this.closestInEditor('pre');
    if (pre && !language) {
      // back to paragraphs
      const lines = (pre.innerText || '').replace(/\n$/, '').split('\n');
      const frag = this.doc.createDocumentFragment();
      let first: HTMLElement | null = null;
      lines.forEach((line) => {
        const p = this.doc.createElement('p');
        if (line) p.textContent = line;
        else p.innerHTML = '<br>';
        frag.appendChild(p);
        first = first ?? p;
      });
      pre.replaceWith(frag);
      if (first) this.setCaret(first, 0);
      this.afterChange();
      return;
    }
    if (pre && language) {
      this.setCodeLanguage(language);
      return;
    }
    const lang = language || this.codeLanguages[0]?.language || 'plaintext';
    const blocks = this.topLevelBlocks(r).filter((b) => !['TABLE', 'FIGURE', 'UL', 'OL'].includes(b.tagName));
    const text = blocks.map((b) => b.innerText.replace(/\n$/, '')).join('\n');
    const newPre = this.doc.createElement('pre');
    newPre.setAttribute('data-language', lang);
    newPre.setAttribute('spellcheck', 'false');
    const code = this.doc.createElement('code');
    code.className = `language-${lang}`;
    code.textContent = text;
    if (!text) code.innerHTML = '<br>';
    newPre.appendChild(code);
    if (blocks.length) {
      blocks[0].replaceWith(newPre);
      blocks.slice(1).forEach((b) => b.remove());
      if (!newPre.nextElementSibling) {
        const p = this.doc.createElement('p');
        p.innerHTML = '<br>';
        newPre.after(p);
      }
      const last = code.lastChild;
      if (last && last.nodeType === Node.TEXT_NODE) this.setCaret(last, (last as Text).length);
      else this.setCaret(code, 0);
      this.afterChange();
    } else {
      this.insertBlock(newPre, code);
    }
  }

  setCodeLanguage(language: string): void {
    this.openMenu = null;
    const pre = this.currentPre ?? this.closestInEditor('pre');
    if (!pre) return;
    pre.setAttribute('data-language', language);
    const code = pre.querySelector('code');
    if (code) code.className = `language-${language}`;
    this.currentLanguage = language;
    this.afterChange();
  }

  codeLanguageLabel(lang: string): string {
    return this.codeLanguages.find((l) => l.language === lang)?.label ?? lang;
  }

  private exitCodeBlockIfEmptyLine(pre: HTMLElement): boolean {
    const r = this.getRange();
    if (!r || !r.collapsed) return false;
    // Is there real content after the caret?
    const after = this.doc.createRange();
    after.setStart(r.startContainer, r.startOffset);
    after.setEnd(pre, pre.childNodes.length);
    if (after.toString().replace(/\n/g, '').length) return false;
    // Node right before the caret
    let before: Node | null = null;
    const c = r.startContainer;
    if (c.nodeType === Node.TEXT_NODE) {
      const txt = (c as Text).data.slice(0, r.startOffset);
      if (txt.length) return txt.endsWith('\n\n') ? this.exitCodeBlock(pre, c as Text, r.startOffset) : false;
      before = c.previousSibling;
    } else {
      before = c.childNodes[r.startOffset - 1] ?? null;
    }
    while (before && before.nodeType === Node.TEXT_NODE && !(before as Text).data.length) before = before.previousSibling;
    if (before && before.nodeName === 'BR') {
      // remove trailing <br>s and exit
      const code = pre.querySelector('code') ?? pre;
      while (code.lastChild && (code.lastChild.nodeName === 'BR' || (code.lastChild.nodeType === Node.TEXT_NODE && !(code.lastChild as Text).data.trim()))) {
        code.removeChild(code.lastChild);
      }
      this.placeAfterBlock(pre);
      return true;
    }
    return false;
  }

  private exitCodeBlock(pre: HTMLElement, node: Text, offset: number): boolean {
    node.data = node.data.slice(0, offset).replace(/\n+$/, '') + node.data.slice(offset);
    this.placeAfterBlock(pre);
    return true;
  }

  private placeAfterBlock(block: HTMLElement): void {
    const p = this.doc.createElement('p');
    p.innerHTML = '<br>';
    block.after(p);
    this.setCaret(p, 0);
    this.afterChange();
  }

  insertHorizontalLine(): void {
    this.insertBlock(this.doc.createElement('hr'));
  }

  insertPageBreak(): void {
    const div = this.doc.createElement('div');
    div.className = 'page-break';
    div.setAttribute('contenteditable', 'false');
    div.style.pageBreakAfter = 'always';
    this.insertBlock(div);
  }

  insertCharacter(ch: string): void {
    this.focusAndRestore();
    this.doc.execCommand('insertText', false, ch);
    this.saveSelection();
    this.afterChange();
  }

  selectAll(): void {
    this.root.focus();
    this.selectNodeContents(this.root);
    this.updateToolbarState();
  }

  // ===================================================================
  // Links
  // ===================================================================

  openLinkDialog(forImage = false): void {
    this.saveSelection();
    this.linkError = '';
    this.linkForImage = forImage;
    const r = this.getRange();
    const img = forImage ? this.selectedImg() : null;
    const a = (img ? (img.closest('a') as HTMLAnchorElement | null) : (this.closestInEditor('a[href]') as HTMLAnchorElement | null));
    this.editingLink = a;
    this.linkUrl = a?.getAttribute('href') ?? '';
    this.linkNewTab = a ? a.getAttribute('target') === '_blank' : true;
    this.linkText = a ? a.textContent ?? '' : r?.toString() ?? '';
    this.linkShowText = !forImage && (!!a || !r || r.collapsed);
    this.modal = 'link';
    this.openMenu = null;
    this.cdr.markForCheck();
  }

  applyLink(): void {
    const normalized = normalizeLinkUrl(this.linkUrl);
    if (!normalized) {
      this.linkError = this.t('invalidUrl');
      this.cdr.markForCheck();
      return;
    }
    this.modal = null;
    const setAttrs = (a: HTMLAnchorElement) => {
      a.setAttribute('href', normalized);
      if (this.linkNewTab) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    };
    this.focusAndRestore();
    if (this.linkForImage) {
      const img = this.selectedImg();
      if (img) {
        let a = img.closest('a') as HTMLAnchorElement | null;
        if (!a) {
          a = this.doc.createElement('a');
          img.replaceWith(a);
          a.appendChild(img);
        }
        setAttrs(a);
      }
      this.afterChange();
      return;
    }
    if (this.editingLink && this.root.contains(this.editingLink)) {
      setAttrs(this.editingLink);
      if (this.linkText && this.linkText !== this.editingLink.textContent) this.editingLink.textContent = this.linkText;
      this.setCaret(this.editingLink.parentNode!, Array.from(this.editingLink.parentNode!.childNodes).indexOf(this.editingLink) + 1);
      this.afterChange();
      return;
    }
    const r = this.getRange();
    if (!r || r.collapsed) {
      const a = this.doc.createElement('a');
      a.textContent = this.linkText || normalized.replace(/^mailto:/, '');
      setAttrs(a);
      if (r) {
        r.insertNode(a);
        this.setCaret(a.parentNode!, Array.from(a.parentNode!.childNodes).indexOf(a) + 1);
      } else {
        this.root.appendChild(a);
      }
      this.afterChange();
      return;
    }
    const marker = 'https://kalpna-link-' + Date.now() + '.invalid/';
    this.doc.execCommand('createLink', false, marker);
    this.root.querySelectorAll<HTMLAnchorElement>(`a[href="${marker}"]`).forEach(setAttrs);
    this.afterChange();
  }

  cancelLinkDialog(): void {
    this.modal = null;
    this.focusAndRestore();
    this.cdr.markForCheck();
  }

  unlink(): void {
    this.focusAndRestore();
    const a = this.currentLink ?? (this.closestInEditor('a[href]') as HTMLAnchorElement | null);
    const r = this.getRange();
    if (a && (!r || r.collapsed || a.contains(r.commonAncestorContainer))) {
      this.unwrap(a);
      this.currentLink = null;
      this.afterChange();
      return;
    }
    this.exec('unlink');
  }

  openCurrentLink(): void {
    const href = this.currentLinkHref;
    if (href && isSafeUrl(href)) window.open(href, '_blank', 'noopener,noreferrer');
  }

  private handleAutoLink(beforeEnter = false): void {
    if (this.config.autoLink === false) return;
    const r = this.getRange();
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return;
    if (this.closestInEditor('a, pre, code', r.startContainer)) return;
    const node = r.startContainer as Text;
    const before = node.data.slice(0, r.startOffset);
    const re = beforeEnter
      ? /(?:^|\s)((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])$/i
      : /(?:^|\s)((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])[\s ]$/i;
    const m = before.match(re);
    if (!m) return;
    const url = m[1];
    const start = before.lastIndexOf(url);
    const href = normalizeLinkUrl(url);
    if (!href) return;
    const range = this.doc.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + url.length);
    const a = this.doc.createElement('a');
    a.setAttribute('href', href);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    this.saveState(false);
    this.wrapRange(range, a);
    const next = a.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE) this.setCaret(next, beforeEnter ? 0 : Math.min(1, (next as Text).length));
    else this.setCaret(a.parentNode!, Array.from(a.parentNode!.childNodes).indexOf(a) + 1);
    if (!beforeEnter) this.afterChange();
  }

  // ===================================================================
  // Images
  // ===================================================================

  triggerImageUpload(replace = false): void {
    if (this.disabled || this.readOnly) return;
    this.saveSelection();
    this.replaceTarget = replace ? this.selectedImg() : null;
    this.fileInput?.nativeElement?.click();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.handleImageFiles(files);
  }

  private handleImageFiles(files: File[]): void {
    const maxSize = this.config.maxImageSize ?? 5 * 1024 * 1024;
    const allowed = this.config.allowedImageTypes ?? DEFAULT_ALLOWED_IMAGE_TYPES;
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        alert(`${this.t('unsupportedImage')}: ${file.type || file.name}`);
        continue;
      }
      if (file.size > maxSize) {
        alert(`${this.t('imageTooLarge')} (${Math.round(maxSize / 1024 / 1024)}MB)`);
        continue;
      }
      this.fileToUrl(file)
        .then((url) => {
          if (!url || (!isSafeUrl(url) && !url.startsWith('blob:'))) {
            alert(this.t('invalidUrl'));
            return;
          }
          const alt = file.name.replace(/\.[^.]+$/, '');
          if (this.replaceTarget && this.root.contains(this.replaceTarget)) {
            this.replaceTarget.src = url;
            this.replaceTarget = null;
            this.afterChange();
          } else {
            this.insertImageAtCursor(url, alt);
          }
        })
        .catch((err) => {
          console.error('Image upload failed', err);
          alert(this.t('uploadFailed'));
        });
    }
  }

  private fileToUrl(file: File): Promise<string> {
    if (this.uploadHook?.image) return this.uploadHook.image(file);
    if (this.config.imageUploadMode === 'blob') return Promise.resolve(URL.createObjectURL(file));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  openImageUrlDialog(): void {
    this.saveSelection();
    this.imageUrl = '';
    this.imageAlt = '';
    this.imageError = '';
    this.modal = 'imageUrl';
    this.cdr.markForCheck();
  }

  applyImageFromUrl(): void {
    const url = (this.imageUrl || '').trim();
    if (!isSafeUrl(url)) {
      this.imageError = this.t('invalidUrl');
      this.cdr.markForCheck();
      return;
    }
    this.modal = null;
    this.insertImageAtCursor(url, this.imageAlt || '');
    this.cdr.markForCheck();
  }

  cancelImageUrlDialog(): void {
    this.modal = null;
    this.cdr.markForCheck();
  }

  private insertImageAtCursor(src: string, alt: string): void {
    this.focusAndRestore();
    const img = this.doc.createElement('img');
    img.src = src;
    img.alt = alt;
    const inlineHost = this.closestInEditor('td, th, li, figcaption, h1, h2, h3, h4, h5, h6');
    if (inlineHost) {
      const r = this.getRange();
      if (r) {
        r.deleteContents();
        r.insertNode(img);
        this.setCaret(img.parentNode!, Array.from(img.parentNode!.childNodes).indexOf(img) + 1);
      } else {
        inlineHost.appendChild(img);
      }
      this.afterChange();
      this.selectElement(img);
      return;
    }
    const figure = this.doc.createElement('figure');
    figure.className = 'image';
    figure.appendChild(img);
    this.insertBlock(figure);
    img.addEventListener('load', () => this.updateBalloon(), { once: true });
    this.selectElement(figure);
  }

  private selectedImg(): HTMLImageElement | null {
    const el = this.selectedEl;
    if (!el) return null;
    return el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
  }

  get selectedIsImage(): boolean {
    return !!this.selectedImg();
  }

  get selectedIsBlockImage(): boolean {
    return !!this.selectedEl && this.selectedEl.matches('figure.image');
  }

  get selectedHasCaption(): boolean {
    return !!this.selectedEl?.querySelector('figcaption');
  }

  get selectedImageStyle(): ImageStyle {
    const el = this.selectedEl;
    if (!el || el.tagName === 'IMG') return 'inline';
    if (el.classList.contains('image-style-align-left')) return 'alignLeft';
    if (el.classList.contains('image-style-align-right')) return 'alignRight';
    if (el.classList.contains('image-style-block-align-left')) return 'blockLeft';
    if (el.classList.contains('image-style-block-align-right')) return 'blockRight';
    return 'alignCenter';
  }

  get selectedImageWidth(): string {
    const el = this.selectedEl;
    if (!el) return '';
    return el.tagName === 'IMG' ? el.style.width : el.style.width;
  }

  private selectElement(el: HTMLElement): void {
    if (this.selectedEl && this.selectedEl !== el) this.selectedEl.classList.remove('kalpna-selected');
    this.selectedEl = el;
    el.classList.add('kalpna-selected');
    this.currentLink = null;
    // move caret near the element so typing / toolbar works predictably
    const sel = this.doc.getSelection();
    if (sel && this.root.contains(el)) {
      const r = this.doc.createRange();
      if (el.tagName === 'IMG') r.selectNode(el);
      else r.setStartAfter(el);
      sel.removeAllRanges();
      sel.addRange(r);
      this.savedRange = r.cloneRange();
    }
    this.updateBalloon();
    this.cdr.markForCheck();
  }

  deselect(): void {
    this.selectedEl?.classList.remove('kalpna-selected');
    this.selectedEl = null;
    this.handles = [];
    this.resizeLabel = null;
    this.updateBalloon();
    this.cdr.markForCheck();
  }

  removeSelected(): void {
    const el = this.selectedEl;
    if (!el) return;
    const next = el.nextElementSibling;
    const host = el.parentElement?.tagName === 'A' ? el.parentElement : el;
    host.remove();
    this.selectedEl = null;
    this.handles = [];
    if (next && this.root.contains(next)) this.setCaret(next, 0);
    this.afterChange();
  }

  setImageStyle(style: ImageStyle): void {
    let el = this.selectedEl;
    if (!el) return;
    const img = this.selectedImg();
    if (!img) return;
    if (style === 'inline') {
      if (el.tagName === 'FIGURE') {
        const p = this.doc.createElement('p');
        const linkWrap = img.parentElement?.tagName === 'A' ? img.parentElement : img;
        if (el.style.width) img.style.width = el.style.width;
        p.appendChild(linkWrap);
        el.replaceWith(p);
        this.selectElement(img);
      }
      this.afterChange();
      return;
    }
    if (el.tagName === 'IMG') {
      // inline → block figure placed after the current block
      const figure = this.doc.createElement('figure');
      figure.className = 'image';
      const block = this.closestInEditor('p, h1, h2, h3, h4, h5, h6, div, blockquote', img);
      const linkWrap = img.parentElement?.tagName === 'A' ? img.parentElement : img;
      if (img.style.width) {
        figure.style.width = img.style.width.endsWith('%') ? img.style.width : '';
        img.style.removeProperty('width');
        if (!img.getAttribute('style')) img.removeAttribute('style');
      }
      figure.appendChild(linkWrap);
      if (block && block.parentNode) {
        block.after(figure);
        if (this.isBlank(block)) block.remove();
      } else {
        this.root.appendChild(figure);
      }
      el = figure;
      this.selectElement(figure);
    }
    el.classList.remove('image-style-align-left', 'image-style-align-right', 'image-style-block-align-left', 'image-style-block-align-right');
    const map: Record<string, string> = { alignLeft: 'image-style-align-left', alignRight: 'image-style-align-right', blockLeft: 'image-style-block-align-left', blockRight: 'image-style-block-align-right' };
    if (map[style]) el.classList.add(map[style]);
    this.afterChange();
  }

  resizeImage(width: string): void {
    this.openMenu = null;
    const el = this.selectedEl;
    if (!el) return;
    const target = el.tagName === 'FIGURE' ? el : el;
    if (!width) target.style.removeProperty('width');
    else target.style.width = width;
    if (!target.getAttribute('style')) target.removeAttribute('style');
    this.afterChange();
  }

  toggleCaption(): void {
    let el = this.selectedEl;
    if (!el) return;
    if (el.tagName === 'IMG') {
      this.setImageStyle('alignCenter');
      el = this.selectedEl;
      if (!el) return;
    }
    const cap = el.querySelector('figcaption');
    if (cap) {
      cap.remove();
      this.afterChange();
      return;
    }
    const fc = this.doc.createElement('figcaption');
    fc.setAttribute('data-placeholder', this.t('captionPlaceholder'));
    fc.innerHTML = '<br>';
    el.appendChild(fc);
    this.deselect();
    this.root.focus();
    this.setCaret(fc, 0);
    this.afterChange();
  }

  openAltDialog(): void {
    const img = this.selectedImg();
    if (!img) return;
    this.imageAlt = img.alt;
    this.modal = 'imageAlt';
    this.cdr.markForCheck();
  }

  applyAlt(): void {
    const img = this.selectedImg();
    if (img) img.alt = this.imageAlt;
    this.modal = null;
    this.afterChange();
  }

  private positionHandles(): void {
    const img = this.selectedImg();
    if (!img || this.readOnly || this.disabled) {
      this.handles = [];
      return;
    }
    const body = this.bodyRef.nativeElement.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const t = r.top - body.top - 6;
    const l = r.left - body.left - 6;
    const b = r.bottom - body.top - 6;
    const rr = r.right - body.left - 6;
    const root = this.root.getBoundingClientRect();
    const minTop = root.top - body.top - 6;
    const maxTop = root.bottom - body.top - 6;
    this.handles = [
      { h: 'nw', top: t, left: l },
      { h: 'ne', top: t, left: rr },
      { h: 'sw', top: b, left: l },
      { h: 'se', top: b, left: rr }
    ].filter((h) => h.top >= minTop && h.top <= maxTop);
  }

  onResizeStart(event: PointerEvent, h: string): void {
    const img = this.selectedImg();
    const el = this.selectedEl;
    if (!img || !el) return;
    event.preventDefault();
    event.stopPropagation();
    this.resizing = {
      el,
      img,
      startX: event.clientX,
      startW: img.getBoundingClientRect().width,
      dir: h === 'nw' || h === 'sw' ? -1 : 1,
      block: el.tagName === 'FIGURE'
    };
  }

  private onResizeMove(e: PointerEvent): void {
    const rs = this.resizing;
    if (!rs) return;
    e.preventDefault();
    const centered = rs.block && this.selectedImageStyle === 'alignCenter';
    const delta = (e.clientX - rs.startX) * rs.dir * (centered ? 2 : 1);
    const px = Math.max(30, rs.startW + delta);
    const container = (rs.el.parentElement ?? this.root).getBoundingClientRect().width || this.root.clientWidth;
    const pct = Math.min(100, Math.max(5, (px / container) * 100));
    rs.el.style.width = pct.toFixed(2) + '%';
    this.positionHandles();
    const body = this.bodyRef.nativeElement.getBoundingClientRect();
    const r = rs.img.getBoundingClientRect();
    this.resizeLabel = { text: `${Math.round(r.width)} × ${Math.round(r.height)} (${Math.round(pct)}%)`, top: r.top - body.top + 8, left: r.right - body.left - 130 };
    this.cdr.markForCheck();
  }

  private onResizeEnd(): void {
    if (!this.resizing) return;
    this.resizing = null;
    this.resizeLabel = null;
    this.afterChange();
  }

  // ===================================================================
  // Marathi transliteration
  // ===================================================================

  private get translitConfig(): KalpnaTransliterationConfig {
    const c = this.config?.transliteration;
    if (c === true) return { enabled: true };
    if (c === false || c === undefined) return {};
    return c;
  }

  /** Legacy on/off switch: on = the last Indian language (Marathi by default). */
  toggleTransliteration(force?: boolean): void {
    const on = force ?? !this.translitOn;
    this.setTypingLanguage(on ? (this.typingLang !== 'en' ? this.typingLang : 'mr') : 'en');
  }

  private updateTranslit(): void {
    if (!this.translitOn || this.isSourceView) {
      if (this.translit) this.translit = null;
      return;
    }
    const r = this.getRange();
    const close = () => {
      if (this.translit) {
        this.translit = null;
        this.cdr.markForCheck();
      }
    };
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE || this.closestInEditor('pre, code, .mention', r.startContainer)) return close();
    const node = r.startContainer as Text;
    const before = node.data.slice(0, r.startOffset);
    if (/^[A-Za-z]/.test(node.data.slice(r.startOffset))) return close();
    const m = before.match(/(^|[^A-Za-z0-9@#\/\\:._\-'’])([A-Za-z]{1,40})$/);
    if (!m) return close();
    const latin = m[2];
    const start = r.startOffset - latin.length;
    if (this.translitSkip === `${start}:${latin}`) return close();
    this.translitSkip = '';
    const lang = this.typingLang === 'hi' ? 'hi' : 'mr';
    const items = translitSuggest(latin, { custom: { ...this.learned[lang], ...(this.translitConfig.dictionary ?? {}) }, max: 5, lang });
    const wordRange = this.doc.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, start + 1);
    const rect = wordRange.getBoundingClientRect();
    const fallback = node.parentElement?.getBoundingClientRect();
    const body = this.bodyRef.nativeElement.getBoundingClientRect();
    const bottom = rect.bottom || fallback?.bottom || 0;
    const left = rect.left || fallback?.left || 0;
    const provider = this.translitConfig.provider;
    if (provider) {
      const node0 = node;
      provider(latin)
        .then((remote) => {
          const cur = this.translit;
          if (!cur || cur.node !== node0 || cur.latin !== latin || !remote?.length) return;
          cur.items = Array.from(new Set([...remote, ...cur.items])).slice(0, 6);
          this.cdr.markForCheck();
        })
        .catch(() => undefined);
    }
    this.translit = {
      latin,
      items,
      index: 0,
      top: bottom - body.top + 4,
      left: Math.max(0, Math.min(left - body.left, body.width - 220)),
      node,
      start
    };
    this.cdr.markForCheck();
  }

  pickTranslit(index: number): void {
    const t = this.translit;
    if (!t) return;
    this.translit = null;
    if (index >= t.items.length) {
      // keep the English word
      this.translitSkip = `${t.start}:${t.latin}`;
      this.cdr.markForCheck();
      return;
    }
    const word = t.items[index];
    const node = t.node;
    if (!this.root.contains(node) || node.data.slice(t.start, t.start + t.latin.length) !== t.latin) return;
    this.saveState(false);
    node.data = node.data.slice(0, t.start) + word + node.data.slice(t.start + t.latin.length);
    this.root.focus({ preventScroll: true });
    this.setCaret(node, t.start + word.length);
    if (this.translitConfig.learn !== false && index > 0) {
      const lang = this.typingLang === 'hi' ? 'hi' : 'mr';
      const book = this.learned[lang];
      book[t.latin.toLowerCase()] = word;
      const keys = Object.keys(book);
      if (keys.length > 500) delete book[keys[0]];
      try {
        localStorage.setItem(lang === 'hi' ? 'kalpna-translit-learned-hi' : 'kalpna-translit-learned', JSON.stringify(book));
      } catch {
        /* ignore */
      }
    }
    this.afterChange();
  }

  // ===================================================================
  // Word (.docx) import
  // ===================================================================

  triggerWordImport(): void {
    if (this.disabled || this.readOnly) return;
    this.saveSelection();
    this.wordInput?.nativeElement?.click();
  }

  onWordFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.importWord(file);
  }

  /**
   * Import a Word (.docx) file and insert its content at the caret
   * (or replace the content when the editor is empty). Images go through
   * `uploadHook.image` when provided, otherwise they are embedded as base64.
   */
  async importWord(file: File): Promise<void> {
    if (this.disabled || this.readOnly) return;
    if (/\.doc$/i.test(file.name) && !/\.docx$/i.test(file.name)) {
      alert(this.t('docNotSupported'));
      return;
    }
    const max = this.config.maxWordFileSize ?? 20 * 1024 * 1024;
    if (file.size > max) {
      alert(`${this.t('wordTooLarge')} (${Math.round(max / 1024 / 1024)}MB)`);
      return;
    }
    this.importing = true;
    this.importMessage = this.t('importing');
    this.cdr.markForCheck();
    try {
      const result = await convertDocx(file);
      let html = result.html;
      for (const img of result.images) {
        let url = '';
        try {
          url = await this.fileToUrl(img.file);
        } catch {
          url = '';
        }
        const safe = url && (isSafeUrl(url) || url.startsWith('blob:'));
        html = html.split(`${DOCX_IMAGE_PREFIX}${img.id}"`).join(safe ? `${url.replace(/"/g, '%22')}"` : '"');
      }
      // images that could not be resolved
      html = html.replace(new RegExp(`<img src="${DOCX_IMAGE_PREFIX}[^"]*"[^>]*>`, 'g'), '');
      const clean = sanitizeHtml(html);
      if (this.isSourceView) this.toggleSourceCode();
      this.saveState(false);
      this.insertBlocksHtml(clean);
      this.afterChange();
      if (result.warnings.length) console.warn('[kalpna-editor] Word import:', result.warnings.join(' '));
    } catch (err) {
      console.error('[kalpna-editor] Word import failed', err);
      alert(this.t('importFailed'));
    } finally {
      this.importing = false;
      this.importMessage = '';
      this.cdr.markForCheck();
    }
  }

  /** Insert block-level HTML as top-level blocks after the caret's block (replaces it if blank). */
  private insertBlocksHtml(html: string): void {
    const tpl = this.doc.createElement('template');
    tpl.innerHTML = html;
    const frag = tpl.content;
    if (!frag.childNodes.length) return;
    const root = this.root;
    const rootBlank = this.isBlank(root);
    if (rootBlank) {
      root.innerHTML = '';
      root.appendChild(frag);
    } else {
      this.wrapRootInlines();
      const r = this.savedRange && root.contains(this.savedRange.startContainer) ? this.savedRange : null;
      let top: Node | null = r ? r.startContainer : null;
      while (top && top.parentNode !== root) top = top.parentNode;
      const last = frag.lastChild;
      if (top && top.nodeType === Node.ELEMENT_NODE && this.isBlank(top as Element)) {
        root.replaceChild(frag, top);
      } else if (top) {
        root.insertBefore(frag, top.nextSibling);
      } else {
        root.appendChild(frag);
      }
      if (last && last.parentNode === root) {
        this.ensureTrailingParagraph(last as Element);
      }
    }
    if (rootBlank && root.lastElementChild) this.ensureTrailingParagraph(root.lastElementChild);
    root.focus({ preventScroll: true });
  }

  private ensureTrailingParagraph(after: Element): void {
    let next = after.nextElementSibling;
    if (!next || ['TABLE', 'FIGURE', 'HR'].includes(next.tagName) || next.classList.contains('page-break')) {
      const p = this.doc.createElement('p');
      p.innerHTML = '<br>';
      after.after(p);
      next = p;
    }
    if (!['TABLE', 'FIGURE', 'HR', 'UL', 'OL'].includes(after.tagName) && !after.classList.contains('page-break')) {
      this.setCaret(after, after.childNodes.length);
    } else {
      this.setCaret(next, 0);
    }
  }

  // ===================================================================
  // Media embed
  // ===================================================================

  openMediaDialog(): void {
    this.saveSelection();
    this.mediaUrl = '';
    this.mediaError = '';
    this.modal = 'media';
    this.cdr.markForCheck();
  }

  applyMedia(): void {
    const info = parseMediaUrl(this.mediaUrl);
    if (!info) {
      this.mediaError = this.t('unsupportedMedia');
      this.cdr.markForCheck();
      return;
    }
    this.modal = null;
    this.insertMedia(this.mediaUrl.trim());
  }

  private insertMedia(url: string): boolean {
    const info = parseMediaUrl(url);
    if (!info) return false;
    const tmp = this.doc.createElement('div');
    tmp.innerHTML = sanitizeHtml(buildMediaHtml(url, info));
    const fig = tmp.firstElementChild as HTMLElement | null;
    if (!fig) return false;
    this.insertBlock(fig);
    return true;
  }

  // ===================================================================
  // Tables
  // ===================================================================

  toggleTableForm(): void {
    this.toggleMenu('table');
  }

  gridHover(r: number, c: number): void {
    this.gridRows = r;
    this.gridCols = c;
  }

  insertTable(rowsIn?: number, colsIn?: number): void {
    this.openMenu = null;
    const rows = Math.max(1, Math.min(100, Number(rowsIn ?? this.tableRows) || 1));
    const cols = Math.max(1, Math.min(30, Number(colsIn ?? this.tableCols) || 1));
    const table = this.doc.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    const tbody = this.doc.createElement('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = this.doc.createElement('tr');
      for (let c = 0; c < cols; c++) tr.appendChild(T.createCell('td'));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const first = table.querySelector('td')!;
    this.insertBlock(table, first);
  }

  tableAction(action: string): void {
    this.openMenu = null;
    const cell = this.currentCell && this.root.contains(this.currentCell) ? this.currentCell : (this.closestInEditor('td, th') as HTMLTableCellElement | null);
    if (!cell) return;
    const table = cell.closest('table') as HTMLTableElement;
    let focus: HTMLTableCellElement | null = cell;
    switch (action) {
      case 'rowAbove': T.insertRow(table, cell, false); break;
      case 'rowBelow': T.insertRow(table, cell, true); break;
      case 'colLeft': T.insertColumn(table, cell, false); break;
      case 'colRight': T.insertColumn(table, cell, true); break;
      case 'deleteRow': {
        const tr = cell.parentElement as HTMLTableRowElement;
        const nextRow = (tr.nextElementSibling ?? tr.previousElementSibling) as HTMLTableRowElement | null;
        T.deleteRow(table, cell);
        focus = nextRow?.cells[0] ?? null;
        break;
      }
      case 'deleteCol': {
        const sib = (cell.nextElementSibling ?? cell.previousElementSibling) as HTMLTableCellElement | null;
        T.deleteColumn(table, cell);
        focus = sib && this.root.contains(sib) ? sib : null;
        break;
      }
      case 'mergeRight': case 'mergeLeft': case 'mergeDown': case 'mergeUp':
        focus = T.mergeCell(table, cell, action.replace('merge', '').toLowerCase() as 'right' | 'left' | 'down' | 'up') ?? cell;
        break;
      case 'splitV': T.splitCellVertically(table, cell); break;
      case 'splitH': T.splitCellHorizontally(table, cell); break;
      case 'headerRow': T.toggleHeaderRow(table); focus = null; break;
      case 'headerCol': T.toggleHeaderColumn(table); focus = null; break;
      case 'caption': {
        if (table.caption) table.deleteCaption();
        else {
          const cap = table.createCaption();
          cap.innerHTML = '<br>';
          this.setCaret(cap, 0);
          this.afterChange();
          return;
        }
        break;
      }
      case 'deleteTable': {
        const next = table.nextElementSibling;
        table.remove();
        this.currentCell = null;
        if (next) this.setCaret(next, 0);
        this.afterChange();
        return;
      }
    }
    if (focus && this.root.contains(focus)) this.setCaret(focus, 0);
    else {
      const any = table.querySelector('td, th');
      if (any && this.root.contains(any)) this.setCaret(any, 0);
    }
    this.afterChange();
  }

  canMerge(dir: 'right' | 'left' | 'down' | 'up'): boolean {
    const cell = this.currentCell;
    if (!cell || !this.root.contains(cell)) return false;
    return T.canMerge(cell.closest('table') as HTMLTableElement, cell, dir);
  }

  // legacy helpers (0.1 API)
  addTableRow(): void {
    this.tableAction('rowBelow');
  }
  deleteTableRow(): void {
    this.tableAction('deleteRow');
  }
  addTableColumn(): void {
    this.tableAction('colRight');
  }
  deleteTableColumn(): void {
    this.tableAction('deleteCol');
  }
  deleteTable(): void {
    this.tableAction('deleteTable');
  }

  openTableProps(): void {
    this.openMenu = null;
    const table = this.currentCell?.closest('table') as HTMLTableElement | null;
    if (!table) return;
    const s = table.style;
    this.tp = {
      borderStyle: s.borderStyle || 'solid',
      borderColor: this.toHex(s.borderColor) || '#bfbfbf',
      borderWidth: s.borderWidth || '1px',
      background: this.toHex(s.backgroundColor),
      width: s.width || '',
      height: s.height || '',
      align: s.marginLeft === '0px' && s.marginRight === 'auto' ? 'left' : s.marginLeft === 'auto' && s.marginRight === '0px' ? 'right' : 'center'
    };
    this.modal = 'tableProps';
  }

  applyTableProps(): void {
    const table = this.currentCell?.closest('table') as HTMLTableElement | null;
    this.modal = null;
    if (!table) return;
    const p = this.tp;
    const border = p.borderStyle === 'none' ? 'none' : `${p.borderWidth || '1px'} ${p.borderStyle} ${p.borderColor || '#bfbfbf'}`;
    table.style.border = border;
    table.style.borderCollapse = 'collapse';
    Array.from(table.querySelectorAll<HTMLElement>('td, th')).filter((c) => c.closest('table') === table).forEach((c) => (c.style.border = border));
    this.setStyle(table, 'background-color', p.background);
    this.setStyle(table, 'width', p.width);
    this.setStyle(table, 'height', p.height);
    if (p.align === 'left') {
      table.style.marginLeft = '0px';
      table.style.marginRight = 'auto';
    } else if (p.align === 'right') {
      table.style.marginLeft = 'auto';
      table.style.marginRight = '0px';
    } else {
      table.style.removeProperty('margin-left');
      table.style.removeProperty('margin-right');
    }
    this.afterChange();
  }

  openCellProps(): void {
    this.openMenu = null;
    const cell = this.currentCell;
    if (!cell) return;
    const s = cell.style;
    this.cp = {
      borderStyle: s.borderStyle || 'solid',
      borderColor: this.toHex(s.borderColor) || '#bfbfbf',
      borderWidth: s.borderWidth || '1px',
      background: this.toHex(s.backgroundColor),
      padding: s.padding || '6px 8px',
      width: s.width || '',
      height: s.height || '',
      textAlign: s.textAlign || '',
      verticalAlign: s.verticalAlign || 'top'
    };
    this.modal = 'cellProps';
  }

  applyCellProps(): void {
    const cell = this.currentCell;
    this.modal = null;
    if (!cell) return;
    const p = this.cp;
    cell.style.border = p.borderStyle === 'none' ? 'none' : `${p.borderWidth || '1px'} ${p.borderStyle} ${p.borderColor || '#bfbfbf'}`;
    this.setStyle(cell, 'background-color', p.background);
    this.setStyle(cell, 'padding', p.padding);
    this.setStyle(cell, 'width', p.width);
    this.setStyle(cell, 'height', p.height);
    this.setStyle(cell, 'text-align', p.textAlign);
    this.setStyle(cell, 'vertical-align', p.verticalAlign === 'top' ? '' : p.verticalAlign);
    this.afterChange();
  }

  private setStyle(el: HTMLElement, prop: string, value: string): void {
    if (value) el.style.setProperty(prop, value);
    else el.style.removeProperty(prop);
  }

  private toHex(color: string): string {
    if (!color) return '';
    if (color.startsWith('#')) return color.length === 4 ? '#' + color.slice(1).split('').map((c) => c + c).join('') : color;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '';
    return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }

  // ===================================================================
  // Find & replace
  // ===================================================================

  toggleFind(force?: boolean): void {
    this.showFind = force ?? !this.showFind;
    if (this.showFind) {
      const r = this.getRange();
      const selected = r && !r.collapsed ? r.toString() : '';
      if (selected && selected.length < 100 && !selected.includes('\n')) this.findText = selected;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.findInput?.nativeElement.focus();
        this.findInput?.nativeElement.select();
        this.runFind(true);
      });
    } else {
      this.clearFindHighlights();
      this.findRanges = [];
      this.findCount = 0;
      this.findIndex = -1;
      this.focusAndRestore();
    }
    this.cdr.markForCheck();
  }

  runFind(resetIndex = true): void {
    this.findRanges = this.computeMatches();
    this.findCount = this.findRanges.length;
    if (resetIndex) this.findIndex = this.findCount ? 0 : -1;
    else if (this.findIndex >= this.findCount) this.findIndex = this.findCount - 1;
    this.paintFind(resetIndex);
    this.cdr.markForCheck();
  }

  findStep(dir: 1 | -1): void {
    if (!this.findCount) this.runFind(true);
    if (!this.findCount) return;
    this.findIndex = (this.findIndex + dir + this.findCount) % this.findCount;
    this.paintFind(true);
  }

  replaceOne(): void {
    if (!this.findCount) this.runFind(true);
    const range = this.findRanges[this.findIndex];
    if (!range) return;
    this.saveState(false);
    range.deleteContents();
    range.insertNode(this.doc.createTextNode(this.replaceText));
    this.root.normalize();
    const idx = this.findIndex;
    this.afterChange();
    this.runFind(false);
    this.findIndex = Math.min(idx, this.findCount - 1);
    this.paintFind(true);
  }

  replaceAll(): void {
    this.runFind(true);
    if (!this.findCount) return;
    this.saveState(false);
    [...this.findRanges].reverse().forEach((range) => {
      range.deleteContents();
      range.insertNode(this.doc.createTextNode(this.replaceText));
    });
    this.root.normalize();
    this.afterChange();
    this.runFind(true);
  }

  private computeMatches(): Range[] {
    const term = this.findText;
    if (!term || !this.viewReady) return [];
    const walker = this.doc.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    const segs: { node: Text; start: number }[] = [];
    let text = '';
    let lastBlock: Element | null = null;
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = n as Text;
      const block = t.parentElement?.closest(LEAF_BLOCK_SELECTOR) ?? null;
      if (block !== lastBlock) {
        text += '\n';
        lastBlock = block;
      }
      segs.push({ node: t, start: text.length });
      text += t.data;
    }
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = this.findWholeWords ? `(?<![\\p{L}\\p{N}\\p{M}_])${esc}(?![\\p{L}\\p{N}\\p{M}_])` : esc;
    let re: RegExp;
    try {
      re = new RegExp(pattern, 'gu' + (this.findMatchCase ? '' : 'i'));
    } catch {
      return [];
    }
    const locate = (pos: number, isEnd: boolean): [Text, number] | null => {
      let lo = 0;
      let hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].start < pos || (!isEnd && segs[mid].start === pos)) lo = mid;
        else hi = mid - 1;
      }
      const s = segs[lo];
      if (!s) return null;
      return [s.node, Math.min(pos - s.start, s.node.length)];
    };
    const ranges: Range[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (!m[0].length) {
        re.lastIndex++;
        continue;
      }
      const a = locate(m.index, false);
      const b = locate(m.index + m[0].length, true);
      if (!a || !b) continue;
      const r = this.doc.createRange();
      try {
        r.setStart(a[0], a[1]);
        r.setEnd(b[0], b[1]);
        ranges.push(r);
      } catch {
        /* skip */
      }
      if (ranges.length > 5000) break;
    }
    return ranges;
  }

  private paintFind(scroll: boolean): void {
    const hl = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
    const HighlightCtor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    const current = this.findRanges[this.findIndex];
    if (hl && HighlightCtor) {
      hl.set('kalpna-find', new HighlightCtor(...this.findRanges));
      if (current) hl.set('kalpna-find-current', new HighlightCtor(current));
      else hl.delete('kalpna-find-current');
    }
    if (current && scroll) {
      const el = current.startContainer.parentElement;
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (!hl || !HighlightCtor) {
        const sel = this.doc.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(current.cloneRange());
      }
      this.savedRange = current.cloneRange();
    }
  }

  private clearFindHighlights(): void {
    const hl = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
    hl?.delete('kalpna-find');
    hl?.delete('kalpna-find-current');
  }

  onFindKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.findStep(event.shiftKey ? -1 : 1);
    }
  }

  // ===================================================================
  // Autoformat / text transformation / mentions
  // ===================================================================

  /** Returns true when the input was consumed by a block autoformat. */
  private handleAutoformat(data: string): boolean {
    if (this.config.autoformat === false) return false;
    const r = this.getRange();
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return false;
    if (this.closestInEditor('pre, code', r.startContainer)) return false;
    const node = r.startContainer as Text;
    const block = this.closestInEditor('p, div, h1, h2, h3, h4, h5, h6, li', node);
    if (block) {
      const pre = this.doc.createRange();
      pre.setStart(block, 0);
      pre.setEnd(r.startContainer, r.startOffset);
      const before = pre.toString().replace(new RegExp(ZWSP, 'g'), '');
      const isPara = block.tagName === 'P' || block.tagName === 'DIV';
      const clearPrefix = () => {
        pre.deleteContents();
        if (!block.textContent) block.innerHTML = '<br>';
        this.setCaret(block, 0);
      };
      if (isPara && (data === ' ' || data === ' ') && !this.closestInEditor('li, td, th, blockquote', node)) {
        const b = before.replace(/ /g, ' ');
        let action: (() => void) | null = null;
        if (/^[*-] $/.test(b)) action = () => this.exec('insertUnorderedList');
        else if (/^1[.)] $/.test(b)) action = () => this.exec('insertOrderedList');
        else if (/^\[ ?\] $/.test(b)) action = () => this.toggleTodoList();
        else if (/^\[x\] $/i.test(b)) action = () => {
          this.toggleTodoList();
          this.closestInEditor('li')?.setAttribute('data-checked', 'true');
          this.afterChange();
        };
        else if (/^#{1,6} $/.test(b)) {
          const level = b.trim().length;
          action = () => this.exec('formatBlock', `<h${level}>`);
        } else if (/^> $/.test(b)) action = () => this.insertBlockquote();
        if (action) {
          this.saveState(false);
          clearPrefix();
          action();
          return true;
        }
      }
      if (isPara && data === '`' && before === '```') {
        this.saveState(false);
        clearPrefix();
        this.toggleCodeBlock();
        return true;
      }
      if (isPara && data === '-' && before === '---' && block.textContent === '---') {
        this.saveState(false);
        clearPrefix();
        const hr = this.doc.createElement('hr');
        if (this.isBlank(block)) {
          block.before(hr);
          this.setCaret(block, 0);
        } else {
          block.after(hr);
        }
        this.afterChange();
        return true;
      }
    }
    // inline
    if (!['*', '_', '`', '~'].includes(data)) return false;
    const text = node.data.slice(0, r.startOffset);
    const patterns: [RegExp, string, number][] = [
      [/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, 'strong', 2],
      [/__([^_\s](?:[^_]*[^_\s])?)__$/, 'strong', 2],
      [/(?:^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*$/, 'em', 1],
      [/(?:^|[^_\w])_([^_\s](?:[^_]*[^_\s])?)_$/, 'em', 1],
      [/`([^`]+)`$/, 'code', 1],
      [/~~([^~\s](?:[^~]*[^~\s])?)~~$/, 's', 2]
    ];
    for (const [re, tag, delim] of patterns) {
      const m = text.match(re);
      if (!m) continue;
      const inner = m[1];
      const start = r.startOffset - inner.length - delim * 2;
      if (start < 0) continue;
      this.saveState(false);
      const range = this.doc.createRange();
      range.setStart(node, start);
      range.setEnd(node, r.startOffset);
      range.deleteContents();
      const el = this.doc.createElement(tag);
      el.textContent = inner;
      range.insertNode(el);
      const after = this.doc.createTextNode(ZWSP);
      el.after(after);
      this.setCaret(after, 1);
      this.afterChange();
      return true;
    }
    return false;
  }

  private handleTextTransformation(): void {
    if (this.config.textTransformation === false) return;
    const r = this.getRange();
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return;
    if (this.closestInEditor('pre, code', r.startContainer)) return;
    const node = r.startContainer as Text;
    const before = node.data.slice(0, r.startOffset).replace(/ /g, ' ');
    for (const [from, to] of TEXT_TRANSFORMATIONS) {
      if (!before.endsWith(from)) continue;
      if (/^\d/.test(from) && /\d$/.test(before.slice(0, -from.length))) continue; // e.g. 11/2
      this.saveState(false);
      const start = r.startOffset - from.length;
      node.data = node.data.slice(0, start) + to + node.data.slice(r.startOffset);
      this.setCaret(node, start + to.length);
      return;
    }
  }

  private checkMention(): void {
    const feeds = this.config.mentions;
    if (!feeds?.length) return;
    const r = this.getRange();
    if (!r || !r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE || this.closestInEditor('pre, code, .mention', r.startContainer)) {
      if (this.mention) {
        this.mention = null;
        this.cdr.markForCheck();
      }
      return;
    }
    const node = r.startContainer as Text;
    const before = node.data.slice(0, r.startOffset);
    for (const feed of feeds) {
      const marker = feed.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = before.match(new RegExp(`(?:^|[\\s\\u00a0(])${marker}([\\p{L}\\p{N}\\p{M}_.-]*)$`, 'u'));
      if (!m) continue;
      const query = m[1];
      if (query.length < (feed.minimumCharacters ?? 0)) continue;
      const start = r.startOffset - query.length - feed.marker.length;
      const seq = ++this.mentionSeq;
      const done = (items: string[]) => {
        if (seq !== this.mentionSeq) return;
        if (!items.length) {
          this.mention = null;
          this.cdr.markForCheck();
          return;
        }
        const rect = r.getBoundingClientRect();
        const body = this.bodyRef.nativeElement.getBoundingClientRect();
        this.mention = { items: items.slice(0, 10), index: 0, top: rect.bottom - body.top + 4, left: Math.max(0, Math.min(rect.left - body.left, body.width - 200)), feed, node, start, end: r.startOffset };
        this.cdr.markForCheck();
      };
      if (Array.isArray(feed.feed)) {
        const q = query.toLowerCase();
        done(feed.feed.filter((it) => it.toLowerCase().replace(feed.marker, '').includes(q)));
      } else {
        Promise.resolve(feed.feed(query)).then(done).catch(() => done([]));
      }
      return;
    }
    if (this.mention) {
      this.mention = null;
      this.cdr.markForCheck();
    }
  }

  pickMention(item: string): void {
    const m = this.mention;
    if (!m) return;
    this.mention = null;
    const text = item.startsWith(m.feed.marker) ? item : m.feed.marker + item;
    const range = this.doc.createRange();
    try {
      range.setStart(m.node, m.start);
      range.setEnd(m.node, Math.min(m.end, m.node.length));
    } catch {
      return;
    }
    this.saveState(false);
    range.deleteContents();
    const span = this.doc.createElement('span');
    span.className = 'mention';
    span.setAttribute('data-mention', text);
    span.textContent = text;
    range.insertNode(span);
    const space = this.doc.createTextNode(' ');
    span.after(space);
    this.root.focus();
    this.setCaret(space, 1);
    this.afterChange();
  }

  // ===================================================================
  // Source mode, preview, print, export, fullscreen
  // ===================================================================

  toggleSourceCode(): void {
    if (this.disabled) return;
    if (!this.isSourceView) {
      this.deselect();
      this.sourceHtml = this.formatSource(this.serialize());
      this.isSourceView = true;
      this.balloon = null;
      if (this.showFind) this.toggleFind(false);
    } else {
      const cleaned = sanitizeHtml(this.sourceHtml.replace(/>\s*\n\s*</g, '><').trim());
      this.root.innerHTML = cleaned;
      this.isSourceView = false;
      this.updateEmptyState();
      this.saveState(false);
      this.emitContent(cleaned);
    }
    this.cdr.markForCheck();
  }

  onSourceInput(): void {
    // Applied to the DOM when leaving source mode; keep forms in sync meanwhile.
    const clean = sanitizeHtml(this.sourceHtml.replace(/>\s*\n\s*</g, '><').trim());
    this.emitContent(clean);
  }

  private formatSource(html: string): string {
    return html
      .replace(/(<\/(p|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tfoot|tr|figure|figcaption|div|caption)>)/gi, '$1\n')
      .replace(/(<(ul|ol|table|thead|tbody|tfoot|tr|figure|blockquote)(\s[^>]*)?>)/gi, '$1\n')
      .replace(/(<(hr|br)\s*\/?>)(?!\n)/gi, (m, tag: string) => (/hr/i.test(tag) ? m + '\n' : m))
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  openPreview(): void {
    // Content is produced by our own sanitizer, so trusting it here is safe.
    this.previewHtml = this.domSanitizer.bypassSecurityTrustHtml(this.getHtml());
    this.modal = 'preview';
  }

  private contentDocument(title: string): string {
    const esc = title.replace(/</g, '&lt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc}</title><style>body{font-family:system-ui,'Segoe UI',Roboto,'Noto Sans Devanagari',Arial,sans-serif;font-size:14px;color:#111;margin:24px;}${KALPNA_CONTENT_CSS}</style></head><body><div class="kalpna-content">${this.getHtml()}</div></body></html>`;
  }

  print(): void {
    if (!this.isBrowser) return;
    const iframe = this.doc.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    this.doc.body.appendChild(iframe);
    const w = iframe.contentWindow;
    const d = iframe.contentDocument;
    if (!w || !d) return;
    d.open();
    d.write(this.contentDocument(this.config.labels?.['documentTitle'] ?? 'Document'));
    d.close();
    const go = () => {
      w.focus();
      w.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    const imgs = Array.from(d.images);
    if (!imgs.length) setTimeout(go, 50);
    else Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((res) => (i.onload = i.onerror = () => res(null)))))).then(go);
  }

  exportWord(): void {
    if (!this.isBrowser) return;
    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>Document</title><style>${KALPNA_CONTENT_CSS} body{font-family:Calibri,'Noto Sans Devanagari',Arial,sans-serif;font-size:11pt}</style></head>` +
      `<body><div class="kalpna-content">${this.getHtml()}</div></body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const a = this.doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (this.config.labels?.['exportFileName'] ?? 'document') + '.doc';
    this.doc.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isBrowser) this.doc.body.style.overflow = this.isFullscreen ? 'hidden' : '';
    setTimeout(() => this.repositionOverlays());
  }

  pastePlainText(): void {
    this.saveSelection();
    const clip = (globalThis.navigator as Navigator | undefined)?.clipboard;
    if (clip?.readText) {
      clip.readText().then(
        (text) => this.insertPlainText(text),
        () => this.openPlainPasteDialog()
      );
    } else {
      this.openPlainPasteDialog();
    }
  }

  private openPlainPasteDialog(): void {
    this.plainText = '';
    this.modal = 'pastePlain';
    this.cdr.markForCheck();
  }

  applyPlainPaste(): void {
    this.modal = null;
    this.insertPlainText(this.plainText);
  }

  private insertPlainText(text: string): void {
    if (!text) return;
    this.focusAndRestore();
    if (this.closestInEditor('pre')) this.doc.execCommand('insertText', false, text);
    else this.doc.execCommand('insertHTML', false, this.plainToHtml(text));
    this.afterChange();
  }

  private plainToHtml(text: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paras = text.replace(/\r\n?/g, '\n').split(/\n{2,}/);
    if (paras.length === 1 && !paras[0].includes('\n')) return esc(paras[0]);
    return paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }

  closeModal(): void {
    this.modal = null;
    this.focusAndRestore();
    this.cdr.markForCheck();
  }

  // ===================================================================
  // Undo / redo
  // ===================================================================

  private resetHistory(): void {
    this.undoStack = [{ html: this.root?.innerHTML ?? '', sel: null }];
    this.redoStack = [];
    this.canUndo = false;
    this.canRedo = false;
  }

  private saveState(typing = false): void {
    if (!this.editorRef?.nativeElement) return;
    const html = this.root.innerHTML;
    const now = Date.now();
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && top.html === html) return;
    const entry = { html, sel: this.serializeSelection() };
    if (typing && this.lastSaveWasTyping && now - this.lastSaveTime < 1000 && this.undoStack.length > 1) {
      this.undoStack[this.undoStack.length - 1] = entry;
    } else {
      this.undoStack.push(entry);
      if (this.undoStack.length > 200) this.undoStack.shift();
    }
    this.lastSaveTime = now;
    this.lastSaveWasTyping = typing;
    this.redoStack = [];
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = false;
  }

  undo(): void {
    if (this.isSourceView || this.undoStack.length < 2) return;
    // flush pending typing into the stack first
    this.lastSaveWasTyping = false;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    this.restoreEntry(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): void {
    if (this.isSourceView || this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.restoreEntry(next);
  }

  private restoreEntry(entry: HistoryEntry): void {
    this.deselect();
    this.root.innerHTML = entry.html;
    this.root.querySelectorAll('.kalpna-selected, .kalpna-cell-focus').forEach((e) => e.classList.remove('kalpna-selected', 'kalpna-cell-focus'));
    this.currentCell = null;
    this.root.focus({ preventScroll: true });
    this.restoreSerializedSelection(entry.sel);
    this.lastSaveWasTyping = false;
    this.emitFromDom();
    this.updateEmptyState();
    this.updateToolbarState();
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = this.redoStack.length > 0;
    this.cdr.markForCheck();
  }

  private nodePath(node: Node): number[] | null {
    const path: number[] = [];
    let n: Node | null = node;
    while (n && n !== this.root) {
      const parent: Node | null = n.parentNode;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, n));
      n = parent;
    }
    return n === this.root ? path : null;
  }

  private nodeFromPath(path: number[]): Node | null {
    let n: Node | null = this.root;
    for (const i of path) {
      n = n?.childNodes[i] ?? null;
      if (!n) return null;
    }
    return n;
  }

  private serializeSelection(): SerializedSel {
    const r = this.getRange();
    if (!r) return null;
    const s = this.nodePath(r.startContainer);
    const e = this.nodePath(r.endContainer);
    if (!s || !e) return null;
    return { s, so: r.startOffset, e, eo: r.endOffset };
  }

  private restoreSerializedSelection(sel: SerializedSel): void {
    const selection = this.doc.getSelection();
    if (!selection) return;
    try {
      if (sel) {
        const s = this.nodeFromPath(sel.s);
        const e = this.nodeFromPath(sel.e);
        if (s && e) {
          const r = this.doc.createRange();
          r.setStart(s, Math.min(sel.so, s.nodeType === Node.TEXT_NODE ? (s as Text).length : s.childNodes.length));
          r.setEnd(e, Math.min(sel.eo, e.nodeType === Node.TEXT_NODE ? (e as Text).length : e.childNodes.length));
          selection.removeAllRanges();
          selection.addRange(r);
          this.savedRange = r.cloneRange();
          return;
        }
      }
    } catch {
      /* fall through */
    }
    const r = this.doc.createRange();
    r.selectNodeContents(this.root);
    r.collapse(false);
    selection.removeAllRanges();
    selection.addRange(r);
    this.savedRange = r.cloneRange();
  }

  // ===================================================================
  // Paste & drop
  // ===================================================================

  onPaste(event: ClipboardEvent): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    event.preventDefault();
    this.deselect();

    const files = Array.from(clipboard.files ?? []).filter((f) => f.type.startsWith('image/'));
    const html = clipboard.getData('text/html');
    const plain = clipboard.getData('text/plain');
    const plainOnly = this.plainPasteNext;
    this.plainPasteNext = false;

    if (files.length && !plain.trim() && (!html || !/<img/i.test(html) || /<img[^>]+src="file:/i.test(html))) {
      this.handleImageFiles(files);
      return;
    }

    this.restoreSelection();
    this.saveState(false);
    const inPre = !!this.closestInEditor('pre');
    const url = plain.trim();
    if (!plainOnly && !inPre && /^https?:\/\/\S+$/i.test(url)) {
      const r = this.getRange();
      const block = this.closestInEditor('p, div');
      if (this.config.autoMediaEmbed !== false && parseMediaUrl(url) && (!r || r.collapsed) && (!block || this.isBlank(block))) {
        this.insertMedia(url);
        return;
      }
      if (r && !r.collapsed && this.config.autoLink !== false) {
        const href = normalizeLinkUrl(url);
        if (href) {
          const marker = 'https://kalpna-link-' + Date.now() + '.invalid/';
          this.doc.execCommand('createLink', false, marker);
          this.root.querySelectorAll<HTMLAnchorElement>(`a[href="${marker}"]`).forEach((a) => {
            a.setAttribute('href', href);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });
          this.afterChange();
          return;
        }
      }
      if (this.config.autoLink !== false) {
        const href = normalizeLinkUrl(url);
        const esc = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        if (href) {
          this.doc.execCommand('insertHTML', false, `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${esc}</a>&nbsp;`);
          this.afterChange();
          return;
        }
      }
    }

    if (inPre) {
      this.doc.execCommand('insertText', false, plain);
    } else if (!plainOnly && html && html.includes('<')) {
      const clean = sanitizePastedHtml(html);
      this.doc.execCommand('insertHTML', false, clean);
    } else if (plain) {
      this.doc.execCommand('insertHTML', false, this.plainToHtml(plain));
    }
    this.afterChange();
  }

  onDrop(event: DragEvent): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    const all = Array.from(event.dataTransfer?.files ?? []);
    const wordFile = all.find((f) => /\.docx?$/i.test(f.name));
    if (wordFile) {
      event.preventDefault();
      this.placeCaretAtPoint(event.clientX, event.clientY);
      this.importWord(wordFile);
      return;
    }
    const files = all.filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      // let the browser move content, then normalize
      setTimeout(() => this.afterChange());
      return;
    }
    event.preventDefault();
    this.placeCaretAtPoint(event.clientX, event.clientY);
    this.handleImageFiles(files);
  }

  private placeCaretAtPoint(x: number, y: number): void {
    const event = { clientX: x, clientY: y };
    const d = this.doc as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
    let range: Range | null = null;
    if (d.caretRangeFromPoint) range = d.caretRangeFromPoint(event.clientX, event.clientY);
    else if (d.caretPositionFromPoint) {
      const pos = d.caretPositionFromPoint(event.clientX, event.clientY);
      if (pos) {
        range = this.doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (range && this.root.contains(range.startContainer)) {
      this.root.focus();
      const sel = this.doc.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      this.savedRange = range.cloneRange();
    }
  }

  onDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
  }

  // ===================================================================
  // Selection helpers
  // ===================================================================

  saveSelection(): void {
    const selection = this.doc.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (this.editorRef?.nativeElement?.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
    }
  }

  restoreSelection(): void {
    if (!this.savedRange) return;
    if (!this.root.contains(this.savedRange.startContainer)) return;
    const selection = this.doc.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this.savedRange);
  }

  onSelectionChangeLegacy(): void {
    this.saveSelection();
  }

  // ===================================================================
  // Output
  // ===================================================================

  /** Clean HTML from the live DOM (no editor-only classes / helpers). */
  private serialize(): string {
    if (!this.editorRef?.nativeElement) return '';
    const clone = this.root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.kalpna-selected, .kalpna-cell-focus').forEach((e) => {
      e.classList.remove('kalpna-selected', 'kalpna-cell-focus');
      if (!e.getAttribute('class')) e.removeAttribute('class');
    });
    clone.querySelectorAll('figcaption[data-placeholder]').forEach((e) => e.removeAttribute('data-placeholder'));
    // strip zero-width helpers
    const walker = this.doc.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    const empties: Node[] = [];
    while ((n = walker.nextNode())) {
      const t = n as Text;
      if (t.data.includes(ZWSP)) {
        t.data = t.data.replace(new RegExp(ZWSP, 'g'), '');
        if (!t.data) empties.push(t);
      }
    }
    empties.forEach((e) => {
      const p = e.parentElement;
      e.parentNode?.removeChild(e);
      if (p && p !== clone && !p.childNodes.length && ['CODE', 'MARK', 'STRONG', 'EM', 'S', 'SPAN'].includes(p.tagName)) p.remove();
    });
    let html = clone.innerHTML;
    if (this.isBlank(clone) && !clone.querySelector('ul, ol')) html = '';
    return sanitizeHtml(html);
  }

  private emitFromDom(): void {
    this.emitContent(this.serialize());
  }

  private emitContent(html: string): void {
    if (html === this.lastEmitted) return;
    this.lastEmitted = html;
    this.onChange(html);
    this.contentChange.emit(html);
    const tmp = this.doc.createElement('div');
    tmp.innerHTML = html;
    this.textChange.emit(tmp.textContent ?? '');
    this.refreshStats(html);
    this.scheduleAutosave(html);
  }

  private refreshStats(html: string): void {
    if (!this.isBrowser) return;
    const el = this.doc.createElement('div');
    el.innerHTML = html;
    const plain = (el.textContent ?? '').replace(new RegExp(ZWSP, 'g'), '');
    // block boundaries count as word separators
    el.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, figcaption, caption, br, div').forEach((b) => b.append(' '));
    const spaced = el.textContent ?? '';
    const words = spaced.match(/[\p{L}\p{N}\p{M}]+(?:['’\-.][\p{L}\p{N}\p{M}]+)*/gu)?.length ?? 0;
    const characters = Array.from(plain.replace(/\n/g, '')).length;
    if (words !== this.words || characters !== this.characters) {
      this.words = words;
      this.characters = characters;
      this.wordCountChange.emit({ words, characters });
    }
  }

  private scheduleAutosave(html: string): void {
    if (this.autosave.observed === false) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.autosave.emit(html), this.config.autosaveDelay ?? 1500);
  }

  private updateEmptyState(): void {
    if (!this.editorRef?.nativeElement) return;
    const root = this.root;
    const empty = this.isBlank(root) && !root.querySelector('ul, ol, blockquote, pre, h1, h2, h3, h4, h5, h6') && root.querySelectorAll('p, div').length <= 1;
    if (empty !== this.isEmpty) {
      this.isEmpty = empty;
      this.cdr.markForCheck();
    }
    root.classList.toggle('kalpna-empty', empty);
  }
}
