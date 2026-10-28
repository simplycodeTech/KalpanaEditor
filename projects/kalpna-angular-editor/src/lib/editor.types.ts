/** Upload handler result: absolute or relative URL string. */
export type UploadResult = string;

/** Configurable upload handlers for images (and optional other file types). */
export interface KalpnaUploadHook {
  /**
   * Called when the user selects a local image file.
   * Must return a URL string (uploaded or blob/object URL for local preview).
   * The library does not upload to any server by itself.
   */
  image?: (file: File) => Promise<UploadResult>;
}

/** Toolbar button identifiers that can be shown or hidden. */
export type KalpnaToolbarItem =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'fontFamily'
  | 'fontSize'
  | 'textColor'
  | 'highlight'
  | 'heading'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'orderedList'
  | 'unorderedList'
  | 'indent'
  | 'outdent'
  | 'blockquote'
  | 'link'
  | 'unlink'
  | 'image'
  | 'table'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'source';

export const DEFAULT_TOOLBAR: KalpnaToolbarItem[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'fontFamily',
  'fontSize',
  'textColor',
  'highlight',
  'heading',
  'alignLeft',
  'alignCenter',
  'alignRight',
  'alignJustify',
  'orderedList',
  'unorderedList',
  'indent',
  'outdent',
  'blockquote',
  'link',
  'unlink',
  'image',
  'table',
  'undo',
  'redo',
  'clear',
  'source'
];

export interface KalpnaEditorConfig {
  /** Placeholder text when empty. */
  placeholder?: string;
  /** Toolbar items to show. Defaults to full set. */
  toolbar?: KalpnaToolbarItem[];
  /** Max image file size in bytes (default 5MB). */
  maxImageSize?: number;
  /** Allowed image MIME types. */
  allowedImageTypes?: string[];
  /** Font families offered in the toolbar. */
  fontFamilies?: string[];
  /** Font sizes offered in the toolbar. */
  fontSizes?: string[];
}

export const DEFAULT_FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Noto Sans Devanagari'
];

export const DEFAULT_FONT_SIZES = [
  '8px',
  '10px',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
  '32px',
  '36px',
  '48px',
  '72px'
];

export const DEFAULT_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];
