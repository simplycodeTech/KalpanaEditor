import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KalpnaEditorComponent } from './editor.component';
import { sanitizeHtml, isSafeUrl, normalizeLinkUrl, sanitizePastedHtml } from './utils/sanitize';
import { parseMediaUrl } from './utils/media';
import * as T from './utils/table';

describe('KalpnaEditorComponent', () => {
  let component: KalpnaEditorComponent;
  let fixture: ComponentFixture<KalpnaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KalpnaEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KalpnaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose empty HTML by default', () => {
    expect(component.getHtml()).toBe('');
  });

  it('should set and get HTML via public API', () => {
    component.setHtml('<p>Hello <strong>world</strong></p>');
    fixture.detectChanges();
    const html = component.getHtml();
    expect(html).toContain('Hello');
    expect(html).toContain('strong');
  });

  it('should sanitize script tags on setHtml', () => {
    component.setHtml('<p>Safe</p><script>alert(1)</script>');
    const html = component.getHtml();
    expect(html).not.toContain('<script');
    expect(html).toContain('Safe');
  });

  it('should support writeValue from ControlValueAccessor', () => {
    component.writeValue('<p>Form value</p>');
    fixture.detectChanges();
    expect(component.getHtml()).toContain('Form value');
  });

  it('should report plain text', () => {
    component.setHtml('<p>Plain <em>text</em></p>');
    expect(component.getText().replace(/\s+/g, ' ').trim()).toContain('Plain text');
  });

  it('should respect readOnly input', () => {
    component.readOnly = true;
    fixture.detectChanges();
    expect(component.readOnly).toBeTrue();
  });
});

describe('sanitize utilities', () => {
  it('should strip script tags', () => {
    const out = sanitizeHtml('<p>x</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).toContain('x');
  });

  it('should strip event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">click</p>');
    expect(out).not.toContain('onclick');
  });

  it('should reject javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBeFalse();
    expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBeFalse();
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull();
  });

  it('should allow https URLs', () => {
    expect(isSafeUrl('https://example.com/path')).toBeTrue();
    expect(normalizeLinkUrl('https://example.com')).toBe('https://example.com');
  });

  it('should allow relative URLs', () => {
    expect(isSafeUrl('/path/page')).toBeTrue();
    expect(isSafeUrl('#section')).toBeTrue();
  });

  it('should strip dangerous paste content', () => {
    const out = sanitizePastedHtml('<p>ok</p><script>evil()</script>');
    expect(out).not.toContain('script');
  });

  it('should remove javascript href on anchors', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript');
  });
});

describe('sanitizer (0.2 additions)', () => {
  it('keeps safe YouTube iframes and drops other iframes', () => {
    const ok = sanitizeHtml('<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>');
    expect(ok).toContain('youtube.com/embed');
    const bad = sanitizeHtml('<iframe src="https://evil.example/x"></iframe>');
    expect(bad).not.toContain('iframe');
  });

  it('keeps editor structures (figure, mark, todo list, code block)', () => {
    const html = '<figure class="image"><img src="https://a.b/c.png" alt="x"><figcaption>c</figcaption></figure>' +
      '<p><mark class="marker-yellow">m</mark></p><ul class="todo-list"><li data-checked="true">t</li></ul>' +
      '<pre data-language="javascript"><code class="language-javascript">x</code></pre>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<figcaption>c</figcaption>');
    expect(out).toContain('marker-yellow');
    expect(out).toContain('data-checked="true"');
    expect(out).toContain('data-language="javascript"');
  });

  it('drops script content entirely and blocks css url()', () => {
    const out = sanitizeHtml('<p style="background: url(javascript:alert(1)); color: red">a</p><script>alert(1)</script>');
    expect(out).not.toContain('alert');
    expect(out).toContain('color: red');
  });

  it('converts e-mail addresses to mailto links', () => {
    expect(normalizeLinkUrl('a@b.com')).toBe('mailto:a@b.com');
  });
});

describe('media utilities', () => {
  it('parses YouTube, Vimeo and rejects unknown hosts', () => {
    expect(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ')?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.provider).toBe('youtube');
    expect(parseMediaUrl('https://vimeo.com/76979871')?.embedUrl).toBe('https://player.vimeo.com/video/76979871');
    expect(parseMediaUrl('https://example.com/video')).toBeNull();
  });
});

describe('table utilities', () => {
  function makeTable(rows: number, cols: number): HTMLTableElement {
    const t = document.createElement('table');
    for (let r = 0; r < rows; r++) {
      const tr = t.insertRow();
      for (let c = 0; c < cols; c++) tr.insertCell().textContent = `${r}${c}`;
    }
    return t;
  }

  it('merges right and splits back', () => {
    const t = makeTable(2, 3);
    const cell = t.rows[0].cells[0];
    T.mergeCell(t, cell, 'right');
    expect(cell.colSpan).toBe(2);
    expect(t.rows[0].cells.length).toBe(2);
    T.splitCellVertically(t, cell);
    expect(t.rows[0].cells.length).toBe(3);
    expect(cell.hasAttribute('colspan')).toBeFalse();
  });

  it('merges down and keeps a valid grid when inserting rows / columns', () => {
    const t = makeTable(3, 3);
    const cell = t.rows[0].cells[1];
    T.mergeCell(t, cell, 'down');
    expect(cell.rowSpan).toBe(2);
    T.insertRow(t, t.rows[0].cells[0], true); // inside the merged area → rowspan grows
    expect(cell.rowSpan).toBe(3);
    T.insertColumn(t, t.rows[0].cells[0], true);
    expect(T.buildGrid(t).width).toBe(4);
    T.deleteRow(t, t.rows[0].cells[0]);
    expect(T.buildGrid(t).grid.every((row) => row.every((c) => !!c))).toBeTrue();
  });

  it('toggles header row', () => {
    const t = makeTable(2, 2);
    T.toggleHeaderRow(t);
    expect(T.hasHeaderRow(t)).toBeTrue();
    T.toggleHeaderRow(t);
    expect(T.hasHeaderRow(t)).toBeFalse();
  });
});

describe('KalpnaEditorComponent (0.2 features)', () => {
  let component: KalpnaEditorComponent;
  let fixture: ComponentFixture<KalpnaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KalpnaEditorComponent] }).compileComponents();
    fixture = TestBed.createComponent(KalpnaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the full toolbar by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button[aria-label="Bold"]')).toBeTruthy();
    expect(el.querySelector('button[title="Insert table"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Find and replace"]')).toBeTruthy();
  });

  it('switches UI language to Marathi', () => {
    component.config = { language: 'mr' };
    component.ngOnChanges({ config: {} as never });
    fixture.detectChanges();
    expect(component.t('bold')).toBe('ठळक');
  });

  it('counts words and characters', () => {
    component.setHtml('<p>one two</p><p>तीन चार</p>');
    expect(component.getWordCount().words).toBe(4);
  });

  it('strips editor-only classes from output', () => {
    component.setHtml('<p>x</p>');
    (fixture.nativeElement.querySelector('.kalpna-content p') as HTMLElement).classList.add('kalpna-selected');
    expect(component.getHtml()).toBe('<p>x</p>');
  });
});
