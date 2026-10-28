import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KalpnaEditorComponent } from './editor.component';
import { sanitizeHtml, isSafeUrl, normalizeLinkUrl, sanitizePastedHtml } from './utils/sanitize';

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
