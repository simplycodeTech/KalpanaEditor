/*
 * Public API surface of kalpna-angular-editor
 */

export * from './lib/editor.component';
export * from './lib/editor.types';
export { KALPNA_CONTENT_CSS } from './lib/editor.styles';
export {
  sanitizeHtml,
  sanitizePastedHtml,
  isSafeUrl,
  isSafeIframeSrc,
  normalizeLinkUrl
} from './lib/utils/sanitize';
export { parseMediaUrl, buildMediaHtml } from './lib/utils/media';
export type { KalpnaMediaInfo } from './lib/utils/media';
export { SPECIAL_CHARACTERS, EMOJI_CATEGORIES } from './lib/utils/special-characters';
export type { KalpnaCharCategory } from './lib/utils/special-characters';
