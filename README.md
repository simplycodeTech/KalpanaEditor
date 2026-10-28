# kalpna-angular-editor

A lightweight, secure, production-ready **Angular rich text editor** library.

- Contenteditable WYSIWYG editor
- Formatting, lists, links, tables, images
- HTML source mode with sanitization
- Angular reactive & template-driven forms (`ControlValueAccessor`)
- Configurable toolbar and upload hook
- MIT licensed

**Package name:** `kalpna-angular-editor` (available on npm)  
**Current version:** `0.1.0`  
**Supported Angular:** 17.x – 19.x  
**Node.js:** 18+ recommended

---

## Features

### Text formatting
- Bold, italic, underline, strikethrough  
- Font family and font size  
- Text color and highlight  
- Paragraph and headings (H1–H6)  
- Align left / center / right / justify  
- Ordered and unordered lists  
- Indent / outdent  
- Blockquote  
- Links with safe URL validation  
- Undo / redo  
- Clear formatting  

### Images
- Insert from local file via configurable `uploadHook`  
- Insert from URL  
- File type and size validation  
- Alt text support  
- Max-width responsive images  
- Local object-URL preview when no upload handler is provided (not uploaded to any server)

### Tables
- Insert table with configurable rows/columns  
- Add / delete rows and columns  
- Delete table  
- Editable cells  
- Mobile-friendly horizontal scroll  

### Source mode
- Toggle visual ↔ HTML source  
- HTML is sanitized when leaving source mode  

### Editor behavior
- Placeholder  
- Read-only and disabled modes  
- `getHtml()` / `setHtml()` / `getText()`  
- `contentChange` and `textChange` outputs  
- Focus management  
- Responsive toolbar  

### Security
- Built-in HTML sanitization for paste, source mode, and programmatic content  
- Rejects `javascript:`, `vbscript:`, and dangerous `data:` URLs  
- Strips event handlers and disallowed tags  
- **Your application must still validate and sanitize stored content** according to your threat model when rendering outside the editor  

---

## Installation

```bash
npm install kalpna-angular-editor
```

Peer dependencies (install if not already present):

```bash
npm install @angular/common @angular/core @angular/forms
```

---

## Basic usage

```typescript
import { Component } from '@angular/core';
import { KalpnaEditorComponent } from 'kalpna-angular-editor';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [KalpnaEditorComponent],
  template: `
    <kalpna-editor
      [(ngModel)]="html"
      placeholder="Start writing…"
      (contentChange)="onChange($event)"
    ></kalpna-editor>
  `
})
export class ExampleComponent {
  html = '<p>Hello</p>';

  onChange(value: string): void {
    console.log(value);
  }
}
```

For NgModule-based apps, import `KalpnaEditorComponent` into the module’s `imports` array (standalone component).

---

## Reactive forms

```typescript
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { KalpnaEditorComponent } from 'kalpna-angular-editor';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, KalpnaEditorComponent],
  template: `<kalpna-editor [formControl]="body"></kalpna-editor>`
})
export class FormExampleComponent {
  body = new FormControl('<p></p>');
}
```

---

## Image upload handler

The library **does not upload files**. Provide an `uploadHook` that returns a URL:

```typescript
import { KalpnaUploadHook } from 'kalpna-angular-editor';

uploadHook: KalpnaUploadHook = {
  image: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.url; // must be a safe http(s) or relative URL
  }
};
```

```html
<kalpna-editor [uploadHook]="uploadHook"></kalpna-editor>
```

Without a hook, selected files are previewed with a local `blob:` object URL only.

---

## Configuration options

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `placeholder` | `string` | `'Start typing...'` | Empty-state placeholder |
| `readOnly` | `boolean` | `false` | Non-editable |
| `disabled` | `boolean` | `false` | Disabled (forms) |
| `uploadHook` | `KalpnaUploadHook` | `{}` | Image upload handler |
| `toolbar` | `KalpnaToolbarItem[]` | full set | Visible toolbar items |
| `config` | `KalpnaEditorConfig` | `{}` | Fonts, sizes, max image size, etc. |
| `minHeight` | `string` | `'200px'` | Editor min height |

### Outputs

| Output | Payload |
|--------|---------|
| `contentChange` | Sanitized HTML string |
| `textChange` | Plain text |
| `focusEvent` | `void` |
| `blurEvent` | `void` |

### Public methods

```typescript
editor.getHtml(): string;
editor.setHtml(html: string): void;
editor.getText(): string;
editor.focus(): void;
```

### Toolbar items

`bold` | `italic` | `underline` | `strikethrough` | `fontFamily` | `fontSize` | `textColor` | `highlight` | `heading` | `alignLeft` | `alignCenter` | `alignRight` | `alignJustify` | `orderedList` | `unorderedList` | `indent` | `outdent` | `blockquote` | `link` | `unlink` | `image` | `table` | `undo` | `redo` | `clear` | `source`

Example: minimal toolbar

```html
<kalpna-editor [toolbar]="['bold', 'italic', 'link', 'image']"></kalpna-editor>
```

---

## Security guidance

1. Content written into the editor is sanitized for common XSS vectors.  
2. **Do not** treat editor HTML as fully trusted for storage or other views without your own server-side / CSP policy.  
3. Always use a Content-Security-Policy that restricts `script-src` when rendering user HTML.  
4. Upload handlers must return safe URLs; the library rejects dangerous schemes.  

Exported helpers (optional):

```typescript
import { sanitizeHtml, isSafeUrl, normalizeLinkUrl } from 'kalpna-angular-editor';
```

---

## Styling

The editor ships with neutral default styles under the `.kalpna-editor` class. Override CSS variables or classes in your global stylesheet as needed. The component uses `ViewEncapsulation.None` so host app styles can theme the toolbar and content area.

---

## Development (this repository)

```bash
# Install
npm install

# Build the library
npm run build:lib

# Run the demo app
npm start

# Unit tests
npm test

# Pack for local install test
npm run pack:lib
# → dist/kalpna-angular-editor/kalpna-angular-editor-0.1.0.tgz
```

### Test install from tarball

```bash
cd /path/to/some-angular-app
npm install /path/to/kalpna-angular-editor/dist/kalpna-angular-editor/kalpna-angular-editor-0.1.0.tgz
```

---

## Known limitations

- Uses `document.execCommand` for many formatting commands (deprecated but still widely supported). A future major version may move to a non-`execCommand` model.  
- Undo/redo is HTML-snapshot based (not operational transform).  
- Image resize UI is limited to CSS `max-width`; drag-handles are not included.  
- DOCX import and PDF export from the original demo app are **not** part of this library (keep them in the host app if needed).  
- Angular Material is optional and not required.  

---

## License

MIT © Suryakant Ubhe

## Contributing

Issues and PRs: [github.com/simplycodeTech/kalpna-angular-editor](https://github.com/simplycodeTech/kalpna-angular-editor)

1. Fork and branch from `main`  
2. Keep changes focused; add tests for security and CVA behavior  
3. Run `npm run build:lib` and `npm test` before opening a PR  

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) (to be maintained per release).
