/** Upload handler result: absolute or relative URL string. */
export type UploadResult = string;

/** Configurable upload handlers for images (and optional other file types). */
export interface KalpnaUploadHook {
  /**
   * Called when the user selects, pastes or drops a local image file.
   * Must return a URL string (uploaded URL, or blob/data URL for local preview).
   * The library does not upload to any server by itself.
   */
  image?: (file: File) => Promise<UploadResult>;
}

/** Toolbar button identifiers that can be shown or hidden. Use `'|'` for a separator. */
export type KalpnaToolbarItem =
  // Basic styles
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'subscript'
  | 'superscript'
  | 'code'
  // Fonts
  | 'fontFamily'
  | 'fontSize'
  | 'textColor'
  | 'backgroundColor'
  | 'highlight'
  | 'lineHeight'
  | 'caseChange'
  | 'formatPainter'
  // Blocks
  | 'heading'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'alignment'
  | 'orderedList'
  | 'unorderedList'
  | 'todoList'
  | 'indent'
  | 'outdent'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalLine'
  | 'pageBreak'
  | 'textDirection'
  | 'transliteration'
  // Insert
  | 'link'
  | 'unlink'
  | 'image'
  | 'imageUrl'
  | 'importWord'
  | 'mediaEmbed'
  | 'table'
  | 'specialCharacters'
  | 'emoji'
  // Tools
  | 'findReplace'
  | 'selectAll'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'pastePlainText'
  | 'source'
  | 'showBlocks'
  | 'preview'
  | 'print'
  | 'exportWord'
  | 'exportPdf'
  | 'fullscreen'
  | 'help'
  | '|';

/** Full toolbar (default). */
export const DEFAULT_TOOLBAR: KalpnaToolbarItem[] = [
  'transliteration', '|',
  'undo', 'redo', '|',
  'heading', 'fontFamily', 'fontSize', '|',
  'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'code', '|',
  'textColor', 'backgroundColor', 'highlight', 'formatPainter', 'clear', '|',
  'alignment', 'lineHeight', 'textDirection', '|',
  'unorderedList', 'orderedList', 'todoList', 'outdent', 'indent', '|',
  'link', 'image', 'imageUrl', 'mediaEmbed', 'table', 'importWord', '|',
  'blockquote', 'codeBlock', 'horizontalLine', 'pageBreak', 'specialCharacters', 'emoji', '|',
  'caseChange', 'findReplace', 'selectAll', 'pastePlainText', '|',
  'source', 'showBlocks', 'preview', 'print', 'exportWord', 'exportPdf', 'fullscreen', 'help'
];

/** A compact toolbar preset. */
export const BASIC_TOOLBAR: KalpnaToolbarItem[] = [
  'transliteration', '|', 'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'underline', '|',
  'link', 'image', 'table', '|', 'unorderedList', 'orderedList', '|', 'alignment', 'clear'
];

/** A mention feed (`@mentions`, `#tags`). */
export interface KalpnaMentionFeed {
  /** Single character that opens the feed, e.g. `'@'` or `'#'`. */
  marker: string;
  /** Static list, or async function returning matches for the typed query. */
  feed: string[] | ((query: string) => string[] | Promise<string[]>);
  /** Minimum characters after the marker before the list opens. Default 0. */
  minimumCharacters?: number;
}

/** Code block language option. */
export interface KalpnaCodeLanguage {
  language: string;
  label: string;
}

/** Word / character statistics emitted by the editor. */
export interface KalpnaWordCount {
  words: number;
  characters: number;
}

/** Marathi transliteration ("namaskar" → "नमस्कार") settings. */
export interface KalpnaTransliterationConfig {
  /** Start with Marathi typing switched on (otherwise the user's last choice is remembered). */
  enabled?: boolean;
  /** Start in this typing language (overrides `enabled`). */
  language?: 'en' | 'mr' | 'hi';
  /** Languages shown on the switch. Default `['en', 'mr', 'hi']`. */
  languages?: ('en' | 'mr' | 'hi')[];
  /** Language used when a Devanagari font is chosen while typing English. Default `'mr'`. */
  fontLanguage?: 'mr' | 'hi';
  /** Extra word mappings, e.g. `{ "simplycode": "सिंपलीकोड" }` (used for Marathi and Hindi). */
  dictionary?: Record<string, string>;
  /** Remember the suggestions a user picks (stored in localStorage). Default true. */
  learn?: boolean;
  /** Switch Marathi typing on when a Devanagari font is chosen (and off for Latin fonts). Default true. */
  followFont?: boolean;
  /** Extra font names treated as Devanagari fonts. */
  devanagariFonts?: string[];
  /**
   * Optional online provider for better accuracy (e.g. your own API).
   * Receives the Latin word and returns Devanagari candidates; they are shown first.
   */
  provider?: (word: string) => Promise<string[]>;
}

export interface KalpnaEditorConfig {
  /** Placeholder text when empty. */
  placeholder?: string;
  /** Toolbar items to show (in order). Defaults to the full set. */
  toolbar?: KalpnaToolbarItem[];
  /** Max image file size in bytes (default 5MB). */
  maxImageSize?: number;
  /** Allowed image MIME types. */
  allowedImageTypes?: string[];
  /**
   * What to do with local images when no `uploadHook.image` is provided.
   * `'base64'` (default) embeds them in the HTML so they survive saving;
   * `'blob'` uses a temporary object URL (preview only).
   */
  imageUploadMode?: 'base64' | 'blob';
  /** Font families offered in the toolbar. */
  fontFamilies?: string[];
  /** Font sizes offered in the toolbar. */
  fontSizes?: string[];
  /** Line heights offered in the toolbar. */
  lineHeights?: string[];
  /** Colour palette for text / background colour pickers. */
  colors?: { color: string; label: string }[];
  /** Languages offered for code blocks. */
  codeBlockLanguages?: KalpnaCodeLanguage[];
  /** Mention feeds. */
  mentions?: KalpnaMentionFeed[];
  /** Marathi phonetic typing. `true` = start enabled. */
  transliteration?: boolean | KalpnaTransliterationConfig;
  /** Markdown-like autoformat while typing (`# `, `* `, `1. `, `> `, `**bold**`, …). Default true. */
  autoformat?: boolean;
  /** Typographic text transformation (`(c)` → ©, `->` → →, …). Default true. */
  textTransformation?: boolean;
  /** Automatically turn typed / pasted URLs into links. Default true. */
  autoLink?: boolean;
  /** Turn a pasted YouTube / Vimeo / … URL into an embedded player. Default true. */
  autoMediaEmbed?: boolean;
  /** Show the word / character counter in the status bar. Default true. */
  wordCount?: boolean;
  /** Optional character limit (shown in the status bar; typing beyond it is blocked). */
  maxCharacters?: number;
  /** Debounce delay in ms for the `autosave` output. Default 1500. */
  autosaveDelay?: number;
  /** Max size in bytes for imported Word (.docx) files (default 20MB). */
  maxWordFileSize?: number;
  /** Max height of the editing area, e.g. `'600px'`. Content scrolls beyond it. */
  maxHeight?: string;
  /** Keep the toolbar visible while scrolling long content. Default true. */
  stickyToolbar?: boolean;
  /** Override any UI label (for translation). See `KALPNA_LABELS_EN` for keys. */
  labels?: Partial<KalpnaLabels>;
  /** Built-in UI language. Default `'en'`. */
  language?: 'en' | 'mr';
}

export const DEFAULT_FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Lucida Sans Unicode',
  'Noto Sans Devanagari',
  'Mangal',
  'Mukta',
  'Hind'
];

export const DEFAULT_FONT_SIZES = [
  '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px',
  '24px', '28px', '32px', '36px', '48px', '60px', '72px'
];

export const DEFAULT_LINE_HEIGHTS = ['1', '1.15', '1.5', '1.75', '2', '2.5', '3'];

export const DEFAULT_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp'
];

export const DEFAULT_COLORS: { color: string; label: string }[] = [
  { color: '#000000', label: 'Black' },
  { color: '#4d4d4d', label: 'Dim grey' },
  { color: '#999999', label: 'Grey' },
  { color: '#e6e6e6', label: 'Light grey' },
  { color: '#ffffff', label: 'White' },
  { color: '#e64c4c', label: 'Red' },
  { color: '#e6994c', label: 'Orange' },
  { color: '#e6e64c', label: 'Yellow' },
  { color: '#99e64c', label: 'Light green' },
  { color: '#4ce64c', label: 'Green' },
  { color: '#4ce699', label: 'Aquamarine' },
  { color: '#4ce6e6', label: 'Turquoise' },
  { color: '#4c99e6', label: 'Light blue' },
  { color: '#4c4ce6', label: 'Blue' },
  { color: '#994ce6', label: 'Purple' },
  { color: '#b91c1c', label: 'Dark red' },
  { color: '#c2410c', label: 'Dark orange' },
  { color: '#a16207', label: 'Dark yellow' },
  { color: '#15803d', label: 'Dark green' },
  { color: '#0f766e', label: 'Teal' },
  { color: '#1d4ed8', label: 'Dark blue' },
  { color: '#1e3a8a', label: 'Navy' },
  { color: '#6b21a8', label: 'Dark purple' },
  { color: '#be185d', label: 'Magenta' },
  { color: '#78350f', label: 'Brown' }
];

export const DEFAULT_CODE_LANGUAGES: KalpnaCodeLanguage[] = [
  { language: 'plaintext', label: 'Plain text' },
  { language: 'html', label: 'HTML' },
  { language: 'css', label: 'CSS' },
  { language: 'javascript', label: 'JavaScript' },
  { language: 'typescript', label: 'TypeScript' },
  { language: 'json', label: 'JSON' },
  { language: 'python', label: 'Python' },
  { language: 'java', label: 'Java' },
  { language: 'csharp', label: 'C#' },
  { language: 'cpp', label: 'C++' },
  { language: 'php', label: 'PHP' },
  { language: 'sql', label: 'SQL' },
  { language: 'xml', label: 'XML' },
  { language: 'bash', label: 'Bash' }
];

/** All UI strings. Override via `config.labels`. */
export interface KalpnaLabels {
  [key: string]: string;
}

export const KALPNA_LABELS_EN: KalpnaLabels = {
  bold: 'Bold', italic: 'Italic', underline: 'Underline', strikethrough: 'Strikethrough',
  subscript: 'Subscript', superscript: 'Superscript', code: 'Inline code',
  fontFamily: 'Font family', fontSize: 'Font size', defaultValue: 'Default',
  textColor: 'Font color', backgroundColor: 'Font background color', highlight: 'Highlight',
  removeColor: 'Remove color', customColor: 'Custom color…', removeHighlight: 'Remove highlight',
  lineHeight: 'Line height', caseChange: 'Change case', upperCase: 'UPPER CASE', lowerCase: 'lower case',
  titleCase: 'Title Case', sentenceCase: 'Sentence case',
  formatPainter: 'Copy formatting', heading: 'Heading', paragraph: 'Paragraph',
  heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3', heading4: 'Heading 4',
  heading5: 'Heading 5', heading6: 'Heading 6', preformatted: 'Preformatted',
  alignment: 'Text alignment', alignLeft: 'Align left', alignCenter: 'Align center',
  alignRight: 'Align right', alignJustify: 'Justify',
  orderedList: 'Numbered list', unorderedList: 'Bulleted list', todoList: 'To-do list',
  listStyle: 'List style', startAt: 'Start at', reversed: 'Reversed order',
  indent: 'Increase indent', outdent: 'Decrease indent', blockquote: 'Block quote',
  codeBlock: 'Insert code block', horizontalLine: 'Horizontal line', pageBreak: 'Page break',
  textDirection: 'Text direction', ltr: 'Left to right', rtl: 'Right to left',
  link: 'Link', unlink: 'Unlink', editLink: 'Edit link', openLink: 'Open link in new tab',
  linkUrl: 'Link URL', linkText: 'Text', openInNewTab: 'Open in a new tab', save: 'Save', cancel: 'Cancel',
  insert: 'Insert', apply: 'Apply', close: 'Close',
  image: 'Upload image', imageUrl: 'Insert image via URL', imageAlt: 'Text alternative', imageAltHint: 'Describe the image for screen readers',
  imageCaption: 'Toggle caption', captionPlaceholder: 'Enter image caption', imageInline: 'In line',
  imageLeft: 'Wrap text — image left', imageCenter: 'Centered image', imageRight: 'Wrap text — image right',
  imageSideLeft: 'Left aligned image', imageSideRight: 'Right aligned image',
  imageResize: 'Resize image', original: 'Original', replaceImage: 'Replace image', linkImage: 'Link image',
  remove: 'Remove', mediaEmbed: 'Insert media', mediaUrl: 'Media URL', mediaHint: 'YouTube, Vimeo, Dailymotion, Spotify, Google Maps, Facebook video…',
  table: 'Insert table', rows: 'Rows', columns: 'Columns', tableRow: 'Row', tableColumn: 'Column', mergeCells: 'Merge cells',
  headerRow: 'Header row', headerColumn: 'Header column', insertRowAbove: 'Insert row above', insertRowBelow: 'Insert row below',
  deleteRow: 'Delete row', insertColLeft: 'Insert column left', insertColRight: 'Insert column right', deleteColumn: 'Delete column',
  mergeRight: 'Merge cell right', mergeLeft: 'Merge cell left', mergeDown: 'Merge cell down', mergeUp: 'Merge cell up',
  splitVertical: 'Split cell vertically', splitHorizontal: 'Split cell horizontally',
  tableProperties: 'Table properties', cellProperties: 'Cell properties', deleteTable: 'Delete table', tableCaption: 'Toggle caption',
  border: 'Border', borderStyle: 'Style', borderColor: 'Color', borderWidth: 'Width', background: 'Background',
  width: 'Width', height: 'Height', padding: 'Padding', tableAlignment: 'Alignment', verticalAlign: 'Vertical alignment',
  horizontalAlign: 'Horizontal alignment', top: 'Top', middle: 'Middle', bottom: 'Bottom', none: 'None',
  specialCharacters: 'Special characters', emoji: 'Emoji', search: 'Search…',
  findReplace: 'Find and replace', find: 'Find', findPlaceholder: 'Find in text…', replace: 'Replace', replaceWith: 'Replace with…',
  replaceAll: 'Replace all', matchCase: 'Match case', wholeWords: 'Whole words only', previous: 'Previous', next: 'Next', of: 'of',
  noResults: 'No results',
  selectAll: 'Select all', undo: 'Undo', redo: 'Redo', clear: 'Remove format', pastePlainText: 'Paste as plain text',
  pastePlainTextHint: 'Paste plain text below (Ctrl+V), then press Insert.',
  source: 'Source', showBlocks: 'Show blocks', preview: 'Preview', print: 'Print', exportWord: 'Export to Word',
  exportPdf: 'Export to PDF (print dialog)', fullscreen: 'Fullscreen', help: 'Keyboard shortcuts',
  words: 'Words', characters: 'Characters', invalidUrl: 'Invalid or unsafe URL.',
  unsupportedMedia: 'This media URL is not supported.', uploadFailed: 'Image upload failed.',
  unsupportedImage: 'Unsupported image type', imageTooLarge: 'Image is larger than the allowed size',
  codeLanguage: 'Code block language', placeholder: 'Start typing...',
  transliteration: 'Marathi typing (namaskar → नमस्कार)', translitHint: 'Space / Enter = select · Esc = keep English', translitOn: 'Marathi typing ON', keepEnglish: 'English', typingLanguage: 'Typing language', english: 'English', marathi: 'मराठी (Marathi)', hindi: 'हिंदी (Hindi)', translitOnHi: 'Hindi typing ON',
  importWord: 'Import Word file (.docx)', importing: 'Importing Word file…', importFailed: 'Could not import this Word file.',
  docNotSupported: 'Old .doc files are not supported. Please open the file in Word and save it as .docx.', wordTooLarge: 'Word file is larger than the allowed size'
};

export const KALPNA_LABELS_MR: KalpnaLabels = {
  bold: 'ठळक', italic: 'तिरपे', underline: 'अधोरेखित', strikethrough: 'खोडलेले',
  subscript: 'खालची लिपी', superscript: 'वरची लिपी', code: 'कोड',
  fontFamily: 'फॉन्ट', fontSize: 'फॉन्ट आकार', defaultValue: 'मूळ',
  textColor: 'अक्षराचा रंग', backgroundColor: 'पार्श्वभूमी रंग', highlight: 'हायलाइट',
  removeColor: 'रंग काढा', customColor: 'स्वतःचा रंग…', removeHighlight: 'हायलाइट काढा',
  lineHeight: 'ओळीतील अंतर', caseChange: 'केस बदला', upperCase: 'UPPER CASE', lowerCase: 'lower case',
  titleCase: 'Title Case', sentenceCase: 'Sentence case',
  formatPainter: 'फॉरमॅटिंग कॉपी करा', heading: 'शीर्षक', paragraph: 'परिच्छेद',
  heading1: 'शीर्षक 1', heading2: 'शीर्षक 2', heading3: 'शीर्षक 3', heading4: 'शीर्षक 4',
  heading5: 'शीर्षक 5', heading6: 'शीर्षक 6', preformatted: 'पूर्व-स्वरूपित',
  alignment: 'मजकूर संरेखन', alignLeft: 'डावीकडे', alignCenter: 'मध्यभागी', alignRight: 'उजवीकडे', alignJustify: 'दोन्ही बाजूंनी',
  orderedList: 'क्रमांकित यादी', unorderedList: 'बुलेट यादी', todoList: 'करायची यादी',
  listStyle: 'यादी शैली', startAt: 'येथून सुरू', reversed: 'उलट क्रम',
  indent: 'इंडेंट वाढवा', outdent: 'इंडेंट कमी करा', blockquote: 'अवतरण',
  codeBlock: 'कोड ब्लॉक', horizontalLine: 'आडवी रेषा', pageBreak: 'पान खंड',
  textDirection: 'मजकूर दिशा', ltr: 'डावीकडून उजवीकडे', rtl: 'उजवीकडून डावीकडे',
  link: 'लिंक', unlink: 'लिंक काढा', editLink: 'लिंक बदला', openLink: 'नवीन टॅबमध्ये उघडा',
  linkUrl: 'लिंक URL', linkText: 'मजकूर', openInNewTab: 'नवीन टॅबमध्ये उघडा', save: 'जतन करा', cancel: 'रद्द करा',
  insert: 'घाला', apply: 'लागू करा', close: 'बंद करा',
  image: 'प्रतिमा अपलोड', imageUrl: 'URL ने प्रतिमा', imageAlt: 'पर्यायी मजकूर', imageAltHint: 'प्रतिमेचे वर्णन लिहा',
  imageCaption: 'कॅप्शन', captionPlaceholder: 'प्रतिमेचे कॅप्शन लिहा', imageInline: 'ओळीत',
  imageLeft: 'डावीकडे (मजकूर भोवती)', imageCenter: 'मध्यभागी', imageRight: 'उजवीकडे (मजकूर भोवती)',
  imageSideLeft: 'डावीकडे', imageSideRight: 'उजवीकडे',
  imageResize: 'आकार बदला', original: 'मूळ', replaceImage: 'प्रतिमा बदला', linkImage: 'प्रतिमेला लिंक',
  remove: 'काढा', mediaEmbed: 'मीडिया घाला', mediaUrl: 'मीडिया URL', mediaHint: 'YouTube, Vimeo, Dailymotion, Spotify, Google Maps…',
  table: 'टेबल घाला', rows: 'ओळी', columns: 'स्तंभ', tableRow: 'ओळ', tableColumn: 'स्तंभ', mergeCells: 'सेल जोडा',
  headerRow: 'शीर्ष ओळ', headerColumn: 'शीर्ष स्तंभ', insertRowAbove: 'वर ओळ घाला', insertRowBelow: 'खाली ओळ घाला',
  deleteRow: 'ओळ हटवा', insertColLeft: 'डावीकडे स्तंभ', insertColRight: 'उजवीकडे स्तंभ', deleteColumn: 'स्तंभ हटवा',
  mergeRight: 'उजवीकडील सेल जोडा', mergeLeft: 'डावीकडील सेल जोडा', mergeDown: 'खालील सेल जोडा', mergeUp: 'वरील सेल जोडा',
  splitVertical: 'सेल उभा विभागा', splitHorizontal: 'सेल आडवा विभागा',
  tableProperties: 'टेबल गुणधर्म', cellProperties: 'सेल गुणधर्म', deleteTable: 'टेबल हटवा', tableCaption: 'टेबल कॅप्शन',
  border: 'बॉर्डर', borderStyle: 'शैली', borderColor: 'रंग', borderWidth: 'जाडी', background: 'पार्श्वभूमी',
  width: 'रुंदी', height: 'उंची', padding: 'पॅडिंग', tableAlignment: 'संरेखन', verticalAlign: 'उभे संरेखन',
  horizontalAlign: 'आडवे संरेखन', top: 'वर', middle: 'मध्य', bottom: 'खाली', none: 'काहीही नाही',
  specialCharacters: 'विशेष चिन्हे', emoji: 'इमोजी', search: 'शोधा…',
  findReplace: 'शोधा आणि बदला', find: 'शोधा', findPlaceholder: 'मजकुरात शोधा…', replace: 'बदला', replaceWith: 'याने बदला…',
  replaceAll: 'सर्व बदला', matchCase: 'अक्षर केस जुळवा', wholeWords: 'फक्त पूर्ण शब्द', previous: 'मागील', next: 'पुढील', of: '/',
  noResults: 'काही सापडले नाही',
  selectAll: 'सर्व निवडा', undo: 'पूर्ववत', redo: 'पुन्हा करा', clear: 'फॉरमॅट काढा', pastePlainText: 'साधा मजकूर पेस्ट',
  pastePlainTextHint: 'खाली साधा मजकूर पेस्ट करा (Ctrl+V), मग "घाला" दाबा.',
  source: 'सोर्स', showBlocks: 'ब्लॉक दाखवा', preview: 'पूर्वावलोकन', print: 'प्रिंट', exportWord: 'Word मध्ये निर्यात',
  exportPdf: 'PDF मध्ये निर्यात (प्रिंट)', fullscreen: 'पूर्ण स्क्रीन', help: 'कीबोर्ड शॉर्टकट',
  words: 'शब्द', characters: 'अक्षरे', invalidUrl: 'चुकीचा किंवा असुरक्षित URL.',
  unsupportedMedia: 'हा मीडिया URL समर्थित नाही.', uploadFailed: 'प्रतिमा अपलोड अयशस्वी.',
  unsupportedImage: 'असमर्थित प्रतिमा प्रकार', imageTooLarge: 'प्रतिमा परवानगीपेक्षा मोठी आहे',
  codeLanguage: 'कोड भाषा', placeholder: 'लिहायला सुरुवात करा...',
  transliteration: 'मराठी टायपिंग (namaskar → नमस्कार)', translitHint: 'Space / Enter = निवडा · Esc = इंग्रजीच ठेवा', translitOn: 'मराठी टायपिंग चालू', keepEnglish: 'English', typingLanguage: 'टायपिंग भाषा', english: 'English', marathi: 'मराठी', hindi: 'हिंदी', translitOnHi: 'हिंदी टायपिंग चालू',
  importWord: 'Word फाईल आयात करा (.docx)', importing: 'Word फाईल आयात होत आहे…', importFailed: 'ही Word फाईल आयात करता आली नाही.',
  docNotSupported: 'जुन्या .doc फाईल्स चालत नाहीत. फाईल Word मध्ये उघडून .docx म्हणून सेव्ह करा.', wordTooLarge: 'Word फाईल परवानगीपेक्षा मोठी आहे'
};
