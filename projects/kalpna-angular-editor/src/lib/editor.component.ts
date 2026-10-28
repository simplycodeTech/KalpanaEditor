import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostBinding
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_ALLOWED_IMAGE_TYPES,
  DEFAULT_FONT_FAMILIES,
  DEFAULT_FONT_SIZES,
  DEFAULT_TOOLBAR,
  KalpnaEditorConfig,
  KalpnaToolbarItem,
  KalpnaUploadHook
} from './editor.types';
import {
  isSafeUrl,
  normalizeLinkUrl,
  sanitizeHtml,
  sanitizePastedHtml
} from './utils/sanitize';

@Component({
  selector: 'kalpna-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
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
export class KalpnaEditorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder = 'Start typing...';
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

  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sourceArea') sourceAreaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('textColorInput') textColorInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bgColorInput') bgColorInput?: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  @HostBinding('class.kalpna-editor-host') hostClass = true;
  @HostBinding('class.kalpna-disabled') get isDisabledHost(): boolean {
    return this.disabled || this.readOnly;
  }

  isSourceView = false;
  sourceHtml = '';
  showTableForm = false;
  tableRows = 3;
  tableCols = 3;
  selectedFontSize = '';
  selectedFontFamily = '';
  selectedHeading = '';
  isLinkSelected = false;
  showLinkDialog = false;
  linkUrl = '';
  linkNewTab = true;
  showImageUrlDialog = false;
  imageUrl = '';
  imageAlt = '';

  fontFamilies: string[] = DEFAULT_FONT_FAMILIES;
  fontSizes: string[] = DEFAULT_FONT_SIZES;
  activeToolbar: KalpnaToolbarItem[] = DEFAULT_TOOLBAR;

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private savedRange: Range | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private lastEmitted = '';
  private pasteLock = false;
  private mutationObserver?: MutationObserver;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fontFamilies = this.config.fontFamilies ?? DEFAULT_FONT_FAMILIES;
    this.fontSizes = this.config.fontSizes ?? DEFAULT_FONT_SIZES;
    this.activeToolbar = this.toolbar ?? this.config.toolbar ?? DEFAULT_TOOLBAR;
    if (this.config.placeholder) {
      this.placeholder = this.config.placeholder;
    }
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
  }

  // --- ControlValueAccessor ---

  writeValue(value: string | null): void {
    const html = sanitizeHtml(value ?? '');
    if (this.editorRef?.nativeElement) {
      if (this.editorRef.nativeElement.innerHTML !== html) {
        this.editorRef.nativeElement.innerHTML = html || '';
        this.lastEmitted = html;
      }
    } else {
      // View not ready; store for afterViewInit pattern via setTimeout
      setTimeout(() => this.writeValue(value), 0);
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
    this.updateEditableState();
    this.cdr.markForCheck();
  }

  // --- Public API ---

  /** Get current HTML content (sanitized). */
  getHtml(): string {
    if (this.isSourceView) {
      return sanitizeHtml(this.sourceHtml);
    }
    return sanitizeHtml(this.editorRef?.nativeElement?.innerHTML ?? '');
  }

  /** Set HTML content (sanitized). */
  setHtml(html: string): void {
    const clean = sanitizeHtml(html ?? '');
    if (this.isSourceView) {
      this.sourceHtml = clean;
    } else if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.innerHTML = clean;
    }
    this.emitContent(clean);
    this.cdr.markForCheck();
  }

  /** Get plain text content. */
  getText(): string {
    if (this.isSourceView) {
      const tmp = document.createElement('div');
      tmp.innerHTML = sanitizeHtml(this.sourceHtml);
      return tmp.textContent ?? '';
    }
    return this.editorRef?.nativeElement?.innerText ?? '';
  }

  /** Focus the editor surface. */
  focus(): void {
    if (this.isSourceView) {
      this.sourceAreaRef?.nativeElement?.focus();
    } else {
      this.editorRef?.nativeElement?.focus();
    }
  }

  hasToolbarItem(item: KalpnaToolbarItem): boolean {
    return this.activeToolbar.includes(item);
  }

  // --- Lifecycle helpers ---

  onEditorInput(): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    this.saveState();
    this.emitFromDom();
  }

  onEditorFocus(): void {
    this.focusEvent.emit();
  }

  onEditorBlur(): void {
    this.onTouched();
    this.blurEvent.emit();
    this.emitFromDom();
  }

  onSelectionChange(): void {
    this.saveSelection();
    this.checkLinkSelection();
  }

  // --- Commands ---

  format(command: string, value?: string): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    this.restoreSelection();
    this.editorRef.nativeElement.focus();

    if (command === 'createLink') {
      this.openLinkDialog();
      return;
    }

    try {
      document.execCommand(command, false, value ?? '');
    } catch {
      // ignore unsupported commands
    }
    this.saveState();
    this.emitFromDom();
    this.cdr.markForCheck();
  }

  applyBold(): void {
    this.format('bold');
  }
  applyItalic(): void {
    this.format('italic');
  }
  applyUnderline(): void {
    this.format('underline');
  }
  applyStrike(): void {
    this.format('strikeThrough');
  }

  applyAlignment(align: 'left' | 'center' | 'right' | 'justify'): void {
    const map: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull'
    };
    this.format(map[align]);
  }

  applyHeading(tag: string): void {
    if (!tag) return;
    this.restoreSelection();
    if (tag === 'p') {
      this.format('formatBlock', 'p');
    } else {
      this.format('formatBlock', tag);
    }
    this.selectedHeading = '';
    this.cdr.markForCheck();
  }

  applyFontFamily(family: string): void {
    if (!family) return;
    this.restoreSelection();
    this.format('fontName', family);
    this.selectedFontFamily = family;
  }

  applyFontSize(size: string): void {
    if (!size) return;
    this.restoreSelection();
    // execCommand fontSize only accepts 1-7; use span style for pixel sizes
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch {
      // fallback: insert HTML
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    this.selectedFontSize = size;
    this.saveState();
    this.emitFromDom();
  }

  applyColor(type: 'color' | 'backgroundColor', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.restoreSelection();
    if (type === 'color') {
      this.format('foreColor', value);
    } else {
      // hiliteColor / backColor
      try {
        document.execCommand('hiliteColor', false, value);
      } catch {
        document.execCommand('backColor', false, value);
      }
      this.saveState();
      this.emitFromDom();
    }
  }

  openColorPicker(type: 'text' | 'bg'): void {
    this.saveSelection();
    if (type === 'text') {
      this.textColorInput?.nativeElement?.click();
    } else {
      this.bgColorInput?.nativeElement?.click();
    }
  }

  insertUnorderedList(): void {
    this.format('insertUnorderedList');
  }
  insertOrderedList(): void {
    this.format('insertOrderedList');
  }
  indent(): void {
    this.format('indent');
  }
  outdent(): void {
    this.format('outdent');
  }

  insertBlockquote(): void {
    this.format('formatBlock', 'blockquote');
  }

  clearFormatting(): void {
    this.format('removeFormat');
    this.format('unlink');
  }

  // --- Link ---

  openLinkDialog(): void {
    this.saveSelection();
    this.linkUrl = '';
    this.linkNewTab = true;
    this.showLinkDialog = true;
    this.cdr.markForCheck();
  }

  applyLink(): void {
    const normalized = normalizeLinkUrl(this.linkUrl);
    if (!normalized) {
      alert('Invalid or unsafe URL. Allowed: http(s), mailto, tel, relative paths.');
      return;
    }
    this.restoreSelection();
    this.editorRef.nativeElement.focus();
    document.execCommand('createLink', false, normalized);
    // Set target if needed
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const anchor = selection.getRangeAt(0).startContainer.parentElement?.closest('a');
      if (anchor) {
        if (this.linkNewTab) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
        if (!isSafeUrl(anchor.getAttribute('href'))) {
          anchor.removeAttribute('href');
        }
      }
    }
    this.showLinkDialog = false;
    this.saveState();
    this.emitFromDom();
    this.cdr.markForCheck();
  }

  cancelLinkDialog(): void {
    this.showLinkDialog = false;
    this.cdr.markForCheck();
  }

  unlink(): void {
    this.format('unlink');
  }

  checkLinkSelection(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const parent = selection.getRangeAt(0).startContainer.parentElement;
      this.isLinkSelected = !!(parent && parent.closest('a'));
    } else {
      this.isLinkSelected = false;
    }
  }

  // --- Image ---

  triggerImageUpload(): void {
    if (this.disabled || this.readOnly) return;
    this.fileInput?.nativeElement?.click();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const maxSize = this.config.maxImageSize ?? 5 * 1024 * 1024;
    const allowed = this.config.allowedImageTypes ?? DEFAULT_ALLOWED_IMAGE_TYPES;

    if (!allowed.includes(file.type)) {
      alert(`Unsupported image type: ${file.type}`);
      return;
    }
    if (file.size > maxSize) {
      alert(`Image exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    if (this.uploadHook?.image) {
      this.uploadHook
        .image(file)
        .then((url) => {
          if (!isSafeUrl(url) && !url.startsWith('blob:')) {
            alert('Upload handler returned an unsafe URL.');
            return;
          }
          this.insertImageAtCursor(url, file.name);
        })
        .catch((err) => {
          console.error('Image upload failed', err);
          alert('Image upload failed.');
        });
    } else {
      // Local preview only via object URL
      const objectUrl = URL.createObjectURL(file);
      this.insertImageAtCursor(objectUrl, file.name);
    }
  }

  openImageUrlDialog(): void {
    this.saveSelection();
    this.imageUrl = '';
    this.imageAlt = '';
    this.showImageUrlDialog = true;
    this.cdr.markForCheck();
  }

  applyImageFromUrl(): void {
    const url = (this.imageUrl || '').trim();
    if (!isSafeUrl(url)) {
      alert('Invalid or unsafe image URL.');
      return;
    }
    this.insertImageAtCursor(url, this.imageAlt || 'Image');
    this.showImageUrlDialog = false;
    this.cdr.markForCheck();
  }

  cancelImageUrlDialog(): void {
    this.showImageUrlDialog = false;
    this.cdr.markForCheck();
  }

  private insertImageAtCursor(src: string, alt: string): void {
    this.restoreSelection();
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || 'Image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.setAttribute('data-kalpna-image', 'true');

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      this.editorRef.nativeElement.appendChild(img);
    }
    this.saveState();
    this.emitFromDom();
  }

  // --- Table ---

  toggleTableForm(): void {
    this.showTableForm = !this.showTableForm;
    this.cdr.markForCheck();
  }

  insertTable(): void {
    const rows = Math.max(1, Math.min(50, Number(this.tableRows) || 1));
    const cols = Math.max(1, Math.min(20, Number(this.tableCols) || 1));

    const table = document.createElement('table');
    table.setAttribute('border', '1');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.className = 'kalpna-table';

    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? 'th' : 'td');
        cell.innerHTML = '<br>';
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '6px 8px';
        cell.style.minWidth = '40px';
        tr.appendChild(cell);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    this.restoreSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      // Add paragraph after table for easier editing
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      if (table.nextSibling) {
        table.parentNode?.insertBefore(p, table.nextSibling);
      } else {
        table.parentNode?.appendChild(p);
      }
    } else {
      this.editorRef.nativeElement.appendChild(table);
    }

    this.showTableForm = false;
    this.saveState();
    this.emitFromDom();
    this.cdr.markForCheck();
  }

  addTableRow(): void {
    const cell = this.getSelectedTableCell();
    if (!cell) return;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return;
    const colCount = row.children.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      td.style.border = '1px solid #ccc';
      td.style.padding = '6px 8px';
      newRow.appendChild(td);
    }
    row.parentNode?.insertBefore(newRow, row.nextSibling);
    this.saveState();
    this.emitFromDom();
  }

  deleteTableRow(): void {
    const cell = this.getSelectedTableCell();
    if (!cell) return;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return;
    if (table.querySelectorAll('tr').length <= 1) {
      table.remove();
    } else {
      row.remove();
    }
    this.saveState();
    this.emitFromDom();
  }

  addTableColumn(): void {
    const cell = this.getSelectedTableCell();
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const cellIndex = Array.from(cell.parentElement!.children).indexOf(cell);
    table.querySelectorAll('tr').forEach((tr) => {
      const ref = tr.children[cellIndex];
      const isHeader = ref?.tagName === 'TH';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = '<br>';
      newCell.style.border = '1px solid #ccc';
      newCell.style.padding = '6px 8px';
      if (ref?.nextSibling) {
        tr.insertBefore(newCell, ref.nextSibling);
      } else {
        tr.appendChild(newCell);
      }
    });
    this.saveState();
    this.emitFromDom();
  }

  deleteTableColumn(): void {
    const cell = this.getSelectedTableCell();
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const cellIndex = Array.from(cell.parentElement!.children).indexOf(cell);
    table.querySelectorAll('tr').forEach((tr) => {
      if (tr.children[cellIndex]) {
        tr.children[cellIndex].remove();
      }
    });
    // Remove empty table
    if (!table.querySelector('td, th')) {
      table.remove();
    }
    this.saveState();
    this.emitFromDom();
  }

  deleteTable(): void {
    const cell = this.getSelectedTableCell();
    if (!cell) return;
    const table = cell.closest('table');
    table?.remove();
    this.saveState();
    this.emitFromDom();
  }

  private getSelectedTableCell(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.getRangeAt(0).startContainer;
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    return el?.closest('td, th') as HTMLElement | null;
  }

  // --- Source mode ---

  toggleSourceCode(): void {
    if (this.disabled) return;

    if (!this.isSourceView) {
      this.sourceHtml = this.editorRef.nativeElement.innerHTML;
      this.isSourceView = true;
    } else {
      const cleaned = sanitizeHtml(this.sourceHtml);
      this.editorRef.nativeElement.innerHTML = cleaned;
      this.isSourceView = false;
      this.emitContent(cleaned);
    }
    this.cdr.markForCheck();
  }

  onSourceInput(): void {
    // Do not apply to DOM until exit; still notify for forms if desired
    // We keep sourceHtml bound via ngModel
  }

  // --- Undo / Redo ---

  private saveState(): void {
    if (!this.editorRef?.nativeElement) return;
    const html = this.editorRef.nativeElement.innerHTML;
    if (this.undoStack[this.undoStack.length - 1] === html) return;
    this.undoStack.push(html);
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length < 2) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.editorRef.nativeElement.innerHTML = prev;
    this.emitFromDom();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.editorRef.nativeElement.innerHTML = next;
    this.emitFromDom();
  }

  // --- Paste ---

  onPaste(event: ClipboardEvent): void {
    if (this.disabled || this.readOnly || this.isSourceView) return;
    if (this.pasteLock) {
      event.preventDefault();
      return;
    }
    this.pasteLock = true;
    setTimeout(() => (this.pasteLock = false), 50);

    event.preventDefault();
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData('text/html');
    const plain = clipboard.getData('text/plain');

    this.restoreSelection();
    if (html && html.includes('<')) {
      const clean = sanitizePastedHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (plain) {
      document.execCommand('insertText', false, plain);
    }
    this.saveState();
    this.emitFromDom();
  }

  // --- Selection helpers ---

  saveSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (this.editorRef?.nativeElement?.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
    }
  }

  restoreSelection(): void {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this.savedRange);
  }

  // --- Emit ---

  private emitFromDom(): void {
    const html = sanitizeHtml(this.editorRef?.nativeElement?.innerHTML ?? '');
    this.emitContent(html);
  }

  private emitContent(html: string): void {
    if (html === this.lastEmitted) return;
    this.lastEmitted = html;
    this.onChange(html);
    this.contentChange.emit(html);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    this.textChange.emit(tmp.textContent ?? '');
  }

  private updateEditableState(): void {
    if (!this.editorRef?.nativeElement) return;
    const editable = !this.disabled && !this.readOnly && !this.isSourceView;
    this.editorRef.nativeElement.setAttribute('contenteditable', editable ? 'true' : 'false');
  }
}
