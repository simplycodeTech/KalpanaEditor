# Changelog

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
