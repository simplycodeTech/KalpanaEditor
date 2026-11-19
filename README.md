# kalpna-editor

**Kalpna Editor** — a free, open-source, full-featured rich text editor for Angular.

- Contenteditable WYSIWYG editor, no third-party runtime dependencies
- **Works on any website** with one `<script>` tag (plain HTML, PHP, WordPress, React, Vue…) — or as an Angular component
- Professional word-processor features: tables, images, media, code blocks, Word import and more
- Angular reactive & template-driven forms (`ControlValueAccessor`)
- Built-in HTML sanitizer, English and Marathi UI
- MIT licensed

**Package name:** `kalpna-editor`  
**Current version:** `1.1.2`  
**Supported Angular:** 17.x – 19.x  
**Node.js:** 18+ recommended

---

## Features

| Area | Features |
|------|----------|
| Basic styles | Bold, italic, underline, strikethrough, subscript, superscript, inline code |
| Fonts | Font family, font size, font colour, font background colour (palette + custom colour), highlight markers & pens, line height |
| Paragraph | Paragraph / Heading 1–6 / Preformatted, alignment (left, center, right, justify), indent / outdent (blocks and nested lists), block quote, text direction (LTR / RTL) |
| Lists | Bulleted & numbered lists, list styles (disc, circle, square, decimal, roman, alpha…), start number, reversed order, **to-do lists** with checkboxes |
| Links | Insert / edit / unlink dialog, open in new tab, link balloon, **auto-link** (typed or pasted URLs, e-mail → `mailto:`) |
| Images | Upload (button, paste, drag & drop, multiple files), insert by URL, **drag-handle resize** + presets, **captions**, alt text, inline / wrap left / centered / wrap right / side left / side right, link image, replace image |
| Media embed | YouTube, Vimeo, Dailymotion, Spotify, Google Maps, Facebook video, SoundCloud; **auto-embed** when a media URL is pasted |
| Tables | Grid picker insert, insert row above/below, column left/right, delete row/column, **merge cells** (up/right/down/left), **split cells**, header row / header column, table properties (border, background, width, height, alignment), cell properties (border, background, padding, size, horizontal & vertical alignment), caption, Tab navigation |
| Blocks | **Code blocks** with language selector, horizontal line, page break |
| Word import | **Import `.docx` files** (toolbar button or drag & drop): headings, bold/italic/underline/strike, colours, highlight, font size & family, alignment, indentation, bulleted / numbered lists, tables with merged cells and shading, images, hyperlinks, page breaks — no server needed |
| Marathi & Hindi typing | **Transliteration** `namaskar` → नमस्कार with suggestions, built-in Marathi word list, learning, custom dictionary (Alt+M) |
| Insert | Special characters (incl. ₹ and Devanagari), emoji picker, **@mentions / #tags** with custom feeds |
| Typing | **Autoformat** (`# `, `## `, `* `, `- `, `1. `, `[] `, `[x] `, `> `, ` ``` `, `---`, `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`), **text transformation** (`(c)` → ©, `->` → →, `1/2` → ½, `...` → …) |
| Tools | **Find & replace** (match case, whole words, replace all), select all, remove format, format painter, change case, paste as plain text, paste from Word / Google Docs clean-up |
| View | Source editing, show blocks, preview, fullscreen, print, export to Word (`.doc`), export to PDF (via print dialog), keyboard-shortcut help |
| Editor | Undo / redo with caret restore, sticky toolbar, configurable toolbar order with separators, word & character count, character limit, autosave output, read-only & disabled modes, placeholder, i18n (English / मराठी / custom labels) |

**Not included yet:** real-time collaboration, track changes, comments, revision history, server-side DOCX/PDF conversion, file manager.

---

## Installation

```bash
npm install kalpna-editor
```

Peer dependencies: `@angular/common`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`.

---

## Basic usage

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KalpnaEditorComponent } from 'kalpna-editor';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [FormsModule, KalpnaEditorComponent],
  template: `<kalpna-editor [(ngModel)]="html" placeholder="Start writing…"></kalpna-editor>`
})
export class ExampleComponent {
  html = '<p>Hello</p>';
}
```

Reactive forms:

```typescript
body = new FormControl('<p></p>');
```
```html
<kalpna-editor [formControl]="body"></kalpna-editor>
```

---

## Marathi & Hindi typing (transliteration)

Type Marathi or Hindi with an English keyboard: `namaskar` → **नमस्कार**, `maharashtra` → **महाराष्ट्र** (Marathi) · `aap kaise hain` → **आप कैसे हैं** (Hindi).
Works offline — no Google / external service.

- Click **म मराठी** or **हि हिंदी** on the **[ A English | म मराठी | हि हिंदी ]** switch at the start of the toolbar. **Alt+M** cycles English → मराठी → हिंदी. The active language is highlighted in saffron and remembered per browser.
- Choosing a Devanagari font (Mangal, Noto Sans Devanagari, Mukta, Hind…) switches typing to Marathi automatically (`fontLanguage: 'hi'` for Hindi); a Latin font (Arial…) switches back to English. Disable with `followFont: false`.
- While typing, a suggestion list appears: **Space / Enter** picks the highlighted word, **↑ ↓** change it, **Esc** keeps the English word.
- Picking a non-first suggestion teaches the editor (stored in `localStorage`).
- Phonetic rules: `aa` आ, `ee/ii` ई, `oo/uu` ऊ, `T` ट, `D` ड, `N` ण, `L` ळ, `sh` श, `Sh` ष, `x/ksh` क्ष, `dny` ज्ञ, `M` ं, `H` ः; a final `a` becomes ा (`maza` → माझा).
- A built-in list of common Marathi words, government terms, first names and surnames (सूर्यकांत, पाटील, कुलकर्णी…) improves accuracy; add your own:

```typescript
config: KalpnaEditorConfig = {
  transliteration: {
    language: 'mr',                                  // start in 'en', 'mr' or 'hi'
    languages: ['en', 'mr', 'hi'],                   // options shown on the switch
    dictionary: { simplycode: 'सिंपलीकोड', satara: 'सातारा' },
    learn: true,
    // optional: your own online service for even better accuracy
    provider: (word) => fetch('/api/translit?q=' + word).then((r) => r.json())
  }
};
```

Plain HTML: `<kalpna-text-editor typing-language="mr"></kalpna-text-editor>` (or `"hi"`) or `KalpnaEditor.create('#x', { typingLanguage: 'mr' })`.

---

## Use on any website (plain HTML, PHP, WordPress, React, Vue…)

No Angular and no build step needed — add **one script tag**:

```html
<script src="https://cdn.jsdelivr.net/npm/kalpna-editor@1/bundles/kalpna-editor.js"></script>
```

(or download `bundles/kalpna-editor.js` from the npm package and host it yourself).

### 1. HTML tag (works inside normal forms)

```html
<form method="post" action="save.php">
  <kalpna-text-editor name="content" placeholder="Write here…"></kalpna-text-editor>
  <button>Save</button>
</form>
```

The HTML is posted as `$_POST['content']`.

### 2. Turn an existing `<textarea>` into the editor

```html
<textarea id="body" name="body"><p>Existing content</p></textarea>
<script>
  KalpnaEditor.replace('#body', { language: 'mr', toolbar: 'basic' });
</script>
```

The textarea is hidden and kept in sync, so existing PHP / WordPress / Laravel forms keep working.
Zero-JavaScript variant: `<textarea name="notes" data-kalpna-editor='{"toolbar":"basic"}'></textarea>`.

### 3. Create from JavaScript

```js
KalpnaEditor.create('#holder', {
  value: '<h2>Report</h2>',
  language: 'mr',
  uploadUrl: '/upload.php',
  onChange: (html) => console.log(html)
}).then((editor) => {
  editor.getHtml();
});
```

### Attributes / options

| Attribute (HTML) | Option (JS) | Description |
|------------------|-------------|-------------|
| `value` | `value` | Initial HTML |
| `name` | `name` | Form field name (adds a hidden input) |
| `placeholder` | `placeholder` | Placeholder text |
| `min-height` | `minHeight` | e.g. `"300px"` |
| `read-only` | `readOnly` | Read-only mode |
| `disabled` | `disabled` | Disabled |
| `language` | `language` | `en` or `mr` |
| `typing-language` | `typingLanguage` | `en`, `mr` (Marathi) or `hi` (Hindi) |
| `transliteration` | `transliteration` | Same as `typing-language="mr"` |
| `toolbar` | `toolbar` | `basic`, `full`, or `"bold,italic,|,link"` |
| `config` | `config` | Any editor option as JSON (see *Configuration*) |
| `upload-url` | `uploadUrl` | Image upload endpoint — multipart POST, field `file`, returns `{"url": "…"}` |
| `upload-field-name` | `uploadFieldName` | Field name (default `file`) |
| `upload-headers` | `uploadHeaders` | JSON headers, e.g. `{"X-CSRF-TOKEN":"…"}` |
| — | `uploadHandler` | Custom `(file) => Promise<url>` |
| — | `onChange` / `onReady` | Callbacks |

### Element methods & events

```js
const ed = document.querySelector('kalpna-text-editor');
ed.value;                 // current HTML (also settable)
ed.getHtml(); ed.setHtml('<p>Hi</p>'); ed.getText();
ed.insertHtml('<b>x</b>'); ed.execute('bold'); ed.importWord(file);
ed.getWordCount(); ed.undo(); ed.redo(); ed.clear(); ed.focusEditor(); ed.destroy();
ed.setTypingLanguage('hi');    // 'en' = English, 'mr' = Marathi, 'hi' = Hindi
ed.getTypingLanguage();

ed.addEventListener('kalpna-change', (e) => console.log(e.detail.html));
// also: kalpna-ready, kalpna-autosave, kalpna-wordcount, kalpna-focus, kalpna-blur
```

A minimal PHP upload endpoint is in [`projects/elements/demo/upload.php`](projects/elements/demo/upload.php).
The bundle (~410 kB, ~105 kB gzipped) includes everything and does not load zone.js, so it does not interfere with the host page.

---

## Configuration

```typescript
import { KalpnaEditorConfig } from 'kalpna-editor';

config: KalpnaEditorConfig = {
  language: 'mr',                    // 'en' (default) | 'mr'
  toolbar: ['undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'link', 'image', 'table'],
  maxHeight: '600px',
  maxCharacters: 5000,
  imageUploadMode: 'base64',         // used when no uploadHook is given: 'base64' | 'blob'
  maxImageSize: 5 * 1024 * 1024,
  maxWordFileSize: 20 * 1024 * 1024,
  fontFamilies: ['Arial', 'Mukta', 'Noto Sans Devanagari'],
  fontSizes: ['12px', '14px', '16px', '20px'],
  mentions: [
    { marker: '@', feed: ['@Suryakant', '@Admin'] },
    { marker: '#', feed: (q) => fetch(`/api/tags?q=${q}`).then((r) => r.json()) }
  ],
  autoformat: true,
  textTransformation: true,
  autoLink: true,
  autoMediaEmbed: true,
  wordCount: true,
  autosaveDelay: 1500,
  labels: { placeholder: 'Type here…' }   // override any UI text
};
```
```html
<kalpna-editor [config]="config" [uploadHook]="uploadHook" (autosave)="save($event)"></kalpna-editor>
```

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `placeholder` | `string` | label `placeholder` | Empty-state placeholder |
| `readOnly` | `boolean` | `false` | Non-editable, toolbar hidden |
| `disabled` | `boolean` | `false` | Disabled (forms) |
| `uploadHook` | `KalpnaUploadHook` | `{}` | Image upload handler |
| `toolbar` | `KalpnaToolbarItem[]` | `DEFAULT_TOOLBAR` | Toolbar items in order (`'|'` = separator) |
| `config` | `KalpnaEditorConfig` | `{}` | See above |
| `minHeight` | `string` | `'200px'` | Editing area min height |

### Outputs

| Output | Payload |
|--------|---------|
| `contentChange` | Sanitized HTML |
| `textChange` | Plain text |
| `autosave` | Sanitized HTML, debounced |
| `wordCountChange` | `{ words, characters }` |
| `focusEvent` / `blurEvent` | `void` |

### Public methods

```typescript
editor.getHtml(): string;
editor.setHtml(html: string): void;
editor.getText(): string;
editor.insertHtml(html: string): void;
editor.execute(item: KalpnaToolbarItem): void;   // e.g. execute('bold')
editor.getWordCount(): { words: number; characters: number };
editor.importWord(file: File): Promise<void>;   // import a .docx file at the caret
editor.undo(); editor.redo(); editor.focus();
```

### Toolbar items

`bold` `italic` `underline` `strikethrough` `subscript` `superscript` `code` ·
`fontFamily` `fontSize` `textColor` `backgroundColor` `highlight` `lineHeight` `caseChange` `formatPainter` ·
`heading` `alignment` `alignLeft` `alignCenter` `alignRight` `alignJustify` `textDirection` ·
`unorderedList` `orderedList` `todoList` `indent` `outdent` `blockquote` `codeBlock` `horizontalLine` `pageBreak` ·
`link` `unlink` `image` `imageUrl` `importWord` `mediaEmbed` `table` `specialCharacters` `emoji` ·
`findReplace` `selectAll` `undo` `redo` `clear` `pastePlainText` `source` `showBlocks` `preview` `print` `exportWord` `exportPdf` `fullscreen` `help` · `|`

Presets: `DEFAULT_TOOLBAR` (everything) and `BASIC_TOOLBAR`.

---

## Image upload handler

The library **does not upload files**. Provide an `uploadHook` that returns a URL:

```typescript
uploadHook: KalpnaUploadHook = {
  image: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    return (await res.json()).url; // must be a safe http(s) or relative URL
  }
};
```

Without a hook, images are embedded as base64 (`imageUploadMode: 'base64'`, default) or as temporary `blob:` URLs (`'blob'`).

---

## Showing saved content

Saved HTML uses a few semantic classes (`figure.image`, `image-style-align-left`, `todo-list`, `marker-yellow`, `page-break`, `mention` …). To render it outside the editor with the same look, add the content stylesheet once and wrap the HTML in `.kalpna-content`:

```typescript
import { KALPNA_CONTENT_CSS } from 'kalpna-editor';
// e.g. inject once: document.head.insertAdjacentHTML('beforeend', `<style>${KALPNA_CONTENT_CSS}</style>`)
```
```html
<div class="kalpna-content" [innerHTML]="savedHtml"></div>
```

(The editor injects this stylesheet automatically while it is on the page.)

---

## Keyboard shortcuts

| Action | Keys |
|--------|------|
| Bold / Italic / Underline | `Ctrl+B` / `Ctrl+I` / `Ctrl+U` |
| Strikethrough / Inline code | `Ctrl+Shift+X` / `Ctrl+E` |
| Subscript / Superscript | `Ctrl+,` / `Ctrl+.` |
| Link | `Ctrl+K` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y`, `Ctrl+Shift+Z` |
| Align left / center / right / justify | `Ctrl+Shift+L` / `E` / `R` / `J` |
| Find & replace | `Ctrl+F` |
| Paste as plain text | `Ctrl+Shift+V` |
| Indent / outdent list, next / previous table cell | `Tab` / `Shift+Tab` |
| Focus toolbar / Help | `Alt+F10` / `Alt+0` |
| Typing language English → मराठी → हिंदी | `Alt+M` |
| Leave code block | `Enter` on an empty last line |

---

## Security

1. Everything that enters the editor (initial value, paste, drop, source mode, `setHtml`) goes through `sanitizeHtml` — scripts, event handlers, `javascript:` / `vbscript:` URLs, CSS `url()` / `expression()` and unknown tags are removed.
2. `<iframe>` is only kept for known embed players (YouTube, Vimeo, Dailymotion, Spotify, Google Maps, Facebook, SoundCloud, Twitch).
3. **Still sanitize on the server** before storing, and use a Content-Security-Policy when rendering user HTML.

Exported helpers: `sanitizeHtml`, `sanitizePastedHtml`, `isSafeUrl`, `isSafeIframeSrc`, `normalizeLinkUrl`, `parseMediaUrl`.

---

## Styling

Styles are injected at runtime (one `<style id="kalpna-editor-styles">`), so they never count against your app's `anyComponentStyle` budget. All classes are prefixed `kalpna-`; override them in your global stylesheet to theme the toolbar.

---

## Development (this repository)

```bash
npm install
npm run build:lib     # build the Angular library
npm run build:all     # library + plain-JS bundle (dist/kalpna-editor/bundles/kalpna-editor.js)
npm run publish:lib   # build everything and publish to npm
npm start             # run the demo app
npm test              # unit tests
npm run pack:lib      # → dist/kalpna-editor/kalpna-editor-1.1.2.tgz
```

---

## Known limitations

- Formatting still uses `document.execCommand` for some commands (deprecated but supported by all current browsers).
- Undo / redo is HTML-snapshot based (typing is grouped into ~1 s steps).
- Table operations work on the cell containing the caret (no multi-cell selection).
- Find highlights use the CSS Custom Highlight API (Chrome 105+, Safari 17.2+, Firefox 140+); older browsers fall back to selecting the current match.
- Word import supports `.docx` only (old `.doc` files must be re-saved as `.docx`); footnotes, headers/footers, comments, charts and SmartArt are skipped.
- "Export to Word" produces an HTML-based `.doc` that Word opens; "Export to PDF" uses the browser's print dialog.

---

## License

MIT © Suryakant Ubhe. Toolbar icons from Google Material Symbols (Apache License 2.0).

## Contributing

Issues and PRs: [github.com/simplycodeTech/KalpanaEditor](https://github.com/simplycodeTech/KalpanaEditor)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
