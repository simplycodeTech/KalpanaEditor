/*
 * Public API surface of kalpna-angular-editor
 */

export * from './lib/editor.component';
export * from './lib/editor.types';
export {
  sanitizeHtml,
  sanitizePastedHtml,
  isSafeUrl,
  normalizeLinkUrl
} from './lib/utils/sanitize';
