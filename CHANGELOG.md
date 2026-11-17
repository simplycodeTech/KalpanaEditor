# Changelog

## 1.0.1 (2026-11)

- Published as **`kalpna-editor`** (`npm i kalpna-editor`). Replaces the old 0.0.x `kalpna-editor` package and `kalpna-angular-editor` 0.2.x.
- Import path is now `kalpna-editor`.

## 0.2.1 (2026-11)

- Include README and LICENSE in the npm package

## 0.2.0 (2026-11)

### Full-featured editor

- New toolbar (Material icons, dropdowns, split buttons, sticky, configurable order with `'|'` separators, `DEFAULT_TOOLBAR` / `BASIC_TOOLBAR` presets)
- Subscript, superscript, inline code, highlight markers/pens, font background colour with palette, line height, change case, format painter
- Lists: list styles, start number, reversed; to-do lists; Tab / Shift+Tab nesting
- Code blocks with language selector; horizontal line; page break; text direction
- Links: edit dialog, link balloon, auto-link, e-mail → mailto
- Images: paste / drag & drop / multiple upload, base64 by default, resize handles and presets, captions, alt text, 6 alignment styles, link image, replace image
- Media embed (YouTube, Vimeo, Dailymotion, Spotify, Google Maps, Facebook, SoundCloud) with auto-embed on paste
- Tables: grid picker, insert/delete rows & columns, merge & split cells, header row/column, table & cell properties, caption, Tab navigation
- Special characters, emoji, @mentions / #tags
- Find & replace, autoformat, text transformation, paste as plain text, Word / Google Docs paste clean-up
- Show blocks, preview, fullscreen, print, export to Word, export to PDF (print), keyboard-shortcut help
- Word / character count, character limit, `autosave` and `wordCountChange` outputs
- Undo / redo restores the caret and groups typing; Ctrl+Z / Ctrl+Y handled by the editor
- i18n: English and Marathi (`config.language`), every label overridable via `config.labels`
- Styles injected at runtime (no component-style budget issues); `KALPNA_CONTENT_CSS` exported for rendering saved HTML
- Sanitizer: allows editor structures (figure, mark, todo, code block, safe embed iframes), drops script content, blocks CSS `url()`
- **Word (.docx) import** via toolbar button (`importWord`) or drag & drop — built-in converter, no dependencies; images go through `uploadHook` or base64
- Public API additions: `importWord(file)`, `insertHtml`, `execute`, `getWordCount`, `parseMediaUrl`, `isSafeIframeSrc`

## 0.1.0 (2025)

### Initial library release

- Converted demo application into a proper Angular library (`kalpna-angular-editor`)
- Standalone `KalpnaEditorComponent` with `ControlValueAccessor`
- Text formatting, lists, alignment, headings, blockquote, links
- Image insert (file upload hook + URL) with type/size checks
- Table insert and row/column add/delete
- Source mode with HTML sanitization on exit
- Paste sanitization and dangerous URL rejection
- Public API: `getHtml`, `setHtml`, `getText`, `focus`
- Configurable toolbar and editor config
- Demo application without hardcoded API keys
- Unit tests for component and sanitizer
