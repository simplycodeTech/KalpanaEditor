import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  BASIC_TOOLBAR,
  KalpnaEditorComponent,
  KalpnaEditorConfig,
  KalpnaUploadHook,
  KalpnaWordCount
} from 'kalpna-angular-editor';

const SAMPLE = `
<h2>Welcome to Kalpna Editor</h2>
<p>A <strong>free</strong>, <em>CKEditor-style</em> rich text editor for Angular. Try <mark class="marker-yellow">highlighting</mark>,
<span style="color: #1d4ed8">colours</span>, <code>inline code</code>, links like <a href="https://angular.dev" target="_blank" rel="noopener noreferrer">angular.dev</a> and mentions such as <span class="mention" data-mention="@Suryakant">@Suryakant</span>.</p>
<ul class="todo-list"><li data-checked="true">Bold, italic, underline, strike, sub/superscript</li><li data-checked="false">Tables with merge / split cells</li></ul>
<table style="border-collapse: collapse; width: 100%"><tbody>
<tr><th style="border: 1px solid #bfbfbf; padding: 6px 8px" scope="col">Feature</th><th style="border: 1px solid #bfbfbf; padding: 6px 8px" scope="col">Status</th></tr>
<tr><td style="border: 1px solid #bfbfbf; padding: 6px 8px">Images (resize, caption, align)</td><td style="border: 1px solid #bfbfbf; padding: 6px 8px">✅</td></tr>
<tr><td style="border: 1px solid #bfbfbf; padding: 6px 8px">Find &amp; replace, word count</td><td style="border: 1px solid #bfbfbf; padding: 6px 8px">✅</td></tr>
</tbody></table>
<blockquote><p>मराठी मजकूर देखील व्यवस्थित लिहिता येतो.</p></blockquote>
<pre data-language="typescript" spellcheck="false"><code class="language-typescript">const editor = 'Kalpna';
console.log(editor);</code></pre>
<p>Type <code>## </code> at the start of a line for a heading, <code>* </code> for a list, or <code>**bold**</code>.</p>
`.trim();

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, KalpnaEditorComponent],
  template: `
    <div class="demo-page">
      <h1>Kalpna Angular Editor</h1>
      <p class="subtitle">Free, CKEditor-style rich text editor for Angular (forms, upload hook, mentions, Marathi UI).</p>

      <div class="demo-card">
        <div class="demo-head">
          <h2>Full editor</h2>
          <label>UI language
            <select (change)="setLanguage($any($event.target).value)">
              <option value="en">English</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
        </div>
        <kalpna-editor
          [formControl]="contentControl"
          [uploadHook]="uploadHook"
          [config]="config"
          placeholder="Write something amazing…"
          minHeight="320px"
          (wordCountChange)="stats = $event"
          (autosave)="lastAutosave = now()"
        ></kalpna-editor>
        <p class="meta">Words: {{ stats.words }} · Characters: {{ stats.characters }} · Last autosave: {{ lastAutosave || '—' }}</p>
        <details class="preview">
          <summary><strong>HTML output</strong></summary>
          <code>{{ contentControl.value || '(empty)' }}</code>
        </details>
        <details class="preview">
          <summary><strong>Rendered output (KALPNA_CONTENT_CSS)</strong></summary>
          <div class="kalpna-content" [innerHTML]="trusted(contentControl.value)"></div>
        </details>
      </div>

      <div class="demo-card">
        <h2>Basic toolbar</h2>
        <kalpna-editor [toolbar]="basicToolbar" minHeight="120px" [config]="{ wordCount: false }"></kalpna-editor>
      </div>

      <div class="demo-card">
        <h2>Read-only</h2>
        <kalpna-editor [readOnly]="true" [formControl]="readonlyControl" minHeight="60px" [config]="{ wordCount: false }"></kalpna-editor>
      </div>
    </div>
  `
})
export class AppComponent {
  contentControl = new FormControl<string>(SAMPLE, { nonNullable: true });
  readonlyControl = new FormControl<string>('<p>This content is <em>read-only</em>.</p>', { nonNullable: true });
  basicToolbar = BASIC_TOOLBAR;
  stats: KalpnaWordCount = { words: 0, characters: 0 };
  lastAutosave = '';

  config: KalpnaEditorConfig = {
    language: 'en',
    maxHeight: '600px',
    mentions: [
      { marker: '@', feed: ['@Suryakant', '@Kalpna', '@Aaple Sarkar', '@Admin', '@Support'] },
      { marker: '#', feed: (q: string) => ['#angular', '#editor', '#marathi', '#maharashtra'].filter((t) => t.includes(q.toLowerCase())) }
    ]
  };

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Demo upload hook. Without a hook the editor embeds images as base64.
   * In production, upload to your server and return the permanent URL.
   */
  uploadHook: KalpnaUploadHook = {
    image: (file: File) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      })
  };

  setLanguage(lang: 'en' | 'mr'): void {
    this.config = { ...this.config, language: lang };
  }

  now(): string {
    return new Date().toLocaleTimeString();
  }

  /** Output of the editor is already sanitized by the library. */
  trusted(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
