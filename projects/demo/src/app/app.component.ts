import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  KalpnaEditorComponent,
  KalpnaUploadHook
} from 'kalpna-angular-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, KalpnaEditorComponent],
  template: `
    <div class="demo-page">
      <h1>Kalpna Angular Editor</h1>
      <p class="subtitle">Demo of the production library (forms + upload hook).</p>

      <div class="demo-card">
        <h2>Reactive forms</h2>
        <kalpna-editor
          [formControl]="contentControl"
          [uploadHook]="uploadHook"
          placeholder="Write something amazing…"
          minHeight="220px"
          (contentChange)="onContentChange($event)"
        ></kalpna-editor>
        <div class="preview">
          <strong>HTML output</strong>
          <code>{{ contentControl.value || '(empty)' }}</code>
        </div>
      </div>

      <div class="demo-card">
        <h2>Read-only</h2>
        <kalpna-editor
          [readOnly]="true"
          [formControl]="readonlyControl"
          minHeight="100px"
        ></kalpna-editor>
      </div>
    </div>
  `
})
export class AppComponent {
  contentControl = new FormControl<string>(
    '<p>Hello from <strong>Kalpna</strong> editor.</p>',
    { nonNullable: true }
  );

  readonlyControl = new FormControl<string>(
    '<p>This content is <em>read-only</em>.</p>',
    { nonNullable: true }
  );

  /**
   * Demo upload hook: uses a local object URL for preview only.
   * In production, upload to your server and return the permanent URL.
   */
  uploadHook: KalpnaUploadHook = {
    image: async (file: File) => {
      // Local preview only — not uploaded to any server
      return URL.createObjectURL(file);
    }
  };

  onContentChange(html: string): void {
    // Optional side effect
    console.debug('[demo] contentChange length', html.length);
  }
}
