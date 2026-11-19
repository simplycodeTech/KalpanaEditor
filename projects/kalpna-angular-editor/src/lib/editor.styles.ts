/**
 * Styles are injected once at runtime (instead of `styleUrl`) so that consuming apps
 * do not hit Angular's `anyComponentStyle` budget.
 *
 * `KALPNA_CONTENT_CSS` styles the produced HTML. Apply it (and the `kalpna-content`
 * class) wherever you render saved editor output to get identical results.
 */
export const KALPNA_CONTENT_CSS = `
.kalpna-content { line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; }
.kalpna-content p { margin: 0 0 .75em; }
.kalpna-content h1, .kalpna-content h2, .kalpna-content h3, .kalpna-content h4, .kalpna-content h5, .kalpna-content h6 { margin: .9em 0 .5em; line-height: 1.25; }
.kalpna-content h1 { font-size: 2em; } .kalpna-content h2 { font-size: 1.6em; } .kalpna-content h3 { font-size: 1.35em; }
.kalpna-content h4 { font-size: 1.15em; } .kalpna-content h5 { font-size: 1em; } .kalpna-content h6 { font-size: .9em; }
.kalpna-content blockquote { margin: 1em 0; padding: .25em 1.25em; border-left: 5px solid #ccc; color: #4b5563; font-style: italic; }
.kalpna-content a { color: #1a5bd6; }
.kalpna-content code { background: rgba(199,199,199,.35); padding: .12em .3em; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
.kalpna-content pre { position: relative; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 1em; margin: 1em 0; overflow-x: auto; white-space: pre-wrap; tab-size: 4; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; line-height: 1.5; color: #1f2937; }
.kalpna-content pre code { background: none; padding: 0; font-size: 1em; }
.kalpna-content pre[data-language]::after { content: attr(data-language); position: absolute; top: 0; right: 10px; font-size: 10px; background: #757575; color: #fff; padding: 1px 6px; border-radius: 0 0 3px 3px; text-transform: uppercase; font-family: system-ui, sans-serif; }
.kalpna-content hr { border: 0; height: 4px; background: #dedede; margin: 1em 0; }
.kalpna-content mark { padding: 0 .1em; }
.kalpna-content .marker-yellow { background: #fdfd77; } .kalpna-content .marker-green { background: #62f962; }
.kalpna-content .marker-pink { background: #fc7899; } .kalpna-content .marker-blue { background: #72ccfd; }
.kalpna-content .pen-red { background: transparent; color: #e71313; } .kalpna-content .pen-green { background: transparent; color: #128a00; }
.kalpna-content ul, .kalpna-content ol { padding-left: 2em; margin: 0 0 .75em; }
.kalpna-content ul.todo-list { list-style: none; padding-left: 0; }
.kalpna-content ul.todo-list li { position: relative; padding-left: 1.75em; margin-bottom: .2em; }
.kalpna-content ul.todo-list li::before { content: ''; position: absolute; left: .1em; top: .3em; width: 1em; height: 1em; border: 1px solid #333; border-radius: 2px; background: #fff; cursor: pointer; box-sizing: border-box; }
.kalpna-content ul.todo-list li[data-checked="true"]::before { background: #25ab33; border-color: #25ab33; }
.kalpna-content ul.todo-list li[data-checked="true"]::after { content: ''; position: absolute; left: .42em; top: .42em; width: .3em; height: .55em; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); pointer-events: none; }
.kalpna-content ul.todo-list li[data-checked="true"] { color: #6b7280; text-decoration: line-through; }
.kalpna-content img { max-width: 100%; height: auto; }
.kalpna-content figure { margin: 1em 0; }
.kalpna-content figure.image { display: table; clear: both; text-align: center; margin: .9em auto; min-width: 50px; max-width: 100%; }
.kalpna-content figure.image img { display: block; margin: 0 auto; width: 100%; max-width: 100%; min-width: 100%; }
.kalpna-content figure.image:not([style*="width"]) img { width: auto; min-width: 0; }
.kalpna-content figcaption:empty::before, .kalpna-content figcaption[data-placeholder]:has(> br:only-child)::before { content: attr(data-placeholder); color: #9ca3af; }
.kalpna-content figure.image figcaption { display: table-caption; caption-side: bottom; padding: .6em; font-size: .85em; color: #4b5563; background: #f7f7f7; word-break: break-word; outline-offset: -1px; }
.kalpna-content .image-style-align-left { float: left; margin: .15em 1.5em 1em 0; }
.kalpna-content .image-style-align-right { float: right; margin: .15em 0 1em 1.5em; }
.kalpna-content .image-style-block-align-left { margin-left: 0; margin-right: auto; }
.kalpna-content .image-style-block-align-right { margin-left: auto; margin-right: 0; }
.kalpna-content img.image-style-align-left, .kalpna-content img.image-style-align-right { max-width: 50%; }
.kalpna-content figure.media { clear: both; margin: .9em 0; display: block; min-width: 15em; }
.kalpna-content table { border-collapse: collapse; border-spacing: 0; width: 100%; max-width: 100%; margin: 1em 0; table-layout: auto; }
.kalpna-content table td, .kalpna-content table th { border: 1px solid #bfbfbf; padding: 6px 8px; min-width: 2em; vertical-align: top; word-break: break-word; }
.kalpna-content table th { background: rgba(0,0,0,.05); font-weight: bold; text-align: left; }
.kalpna-content table caption { caption-side: top; padding: .5em; font-size: .9em; color: #333; background: #f7f7f7; }
.kalpna-content .page-break { position: relative; clear: both; padding: 5px 0; display: flex; align-items: center; justify-content: center; page-break-after: always; }
.kalpna-content .mention { background: rgba(153,0,48,.1); color: #990030; border-radius: 3px; padding: 0 .15em; }
.kalpna-content [dir="rtl"] { text-align: right; }
@media print { .kalpna-content .page-break { padding: 0; } .kalpna-content .page-break::after { display: none; } }
`;

export const KALPNA_EDITOR_CSS = `
.kalpna-editor-host { display: block; }
.kalpna-editor { position: relative; border: 1px solid #c4c4c4; border-radius: 6px; background: #fff; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Devanagari', Arial, sans-serif; font-size: 14px; color: #1a1a1a; }
.kalpna-editor *, .kalpna-editor *::before, .kalpna-editor *::after { box-sizing: border-box; }
.kalpna-editor.kalpna-disabled { opacity: .65; pointer-events: none; }
.kalpna-editor.kalpna-fullscreen { position: fixed; inset: 0; z-index: 10000; border-radius: 0; display: flex; flex-direction: column; }
.kalpna-editor.kalpna-fullscreen .kalpna-body { flex: 1; overflow: auto; background: #f0f0f0; padding: 24px 0; }
.kalpna-editor.kalpna-fullscreen .kalpna-content { max-width: 900px; margin: 0 auto; background: #fff; min-height: calc(100% - 0px); box-shadow: 0 1px 4px rgba(0,0,0,.15); padding: 40px 56px; max-height: none !important; }

.kalpna-toolbar { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; padding: 4px 6px; border-bottom: 1px solid #c4c4c4; background: #fafafa; border-radius: 6px 6px 0 0; z-index: 20; }
.kalpna-toolbar.kalpna-sticky { position: sticky; top: 0; }
.kalpna-btn { display: inline-flex; align-items: center; justify-content: center; gap: 2px; min-width: 30px; height: 30px; padding: 0 5px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: #333; font: inherit; font-size: 13px; cursor: pointer; line-height: 1; white-space: nowrap; user-select: none; }
.kalpna-btn:hover:not(:disabled) { background: #e6e6e6; }
.kalpna-btn:disabled { opacity: .4; cursor: default; }
.kalpna-btn:focus-visible { outline: 2px solid #2977ff; outline-offset: 0; }
.kalpna-btn.kalpna-on { background: #dfe8fb; color: #1a4fb3; }
.kalpna-btn-text { padding: 0 8px; }
.kalpna-btn-primary { background: #2977ff; color: #fff; border-color: #1f66e0; padding: 0 12px; }
.kalpna-btn-primary:hover:not(:disabled) { background: #1f66e0; }
.kalpna-btn-ghost { border-color: #c4c4c4; padding: 0 12px; background: #fff; }
.kalpna-icon { display: inline-flex; width: 20px; height: 20px; }
.kalpna-icon svg { width: 20px; height: 20px; fill: currentColor; }
.kalpna-caret { width: 14px; margin-left: -3px; }
.kalpna-caret svg { width: 18px; height: 18px; }
.kalpna-color-bar { position: absolute; left: 6px; right: 6px; bottom: 3px; height: 3px; border-radius: 1px; }
.kalpna-btn-color { position: relative; }
.kalpna-sep { width: 1px; height: 22px; background: #d4d4d4; margin: 0 3px; }
.kalpna-dd { position: relative; display: inline-flex; }
.kalpna-dd-label { max-width: 110px; overflow: hidden; text-overflow: ellipsis; text-align: left; min-width: 60px; }
.kalpna-panel { position: absolute; top: calc(100% + 3px); left: 0; z-index: 60; min-width: 160px; max-height: 360px; overflow-y: auto; background: #fff; border: 1px solid #c4c4c4; border-radius: 4px; box-shadow: 0 3px 12px rgba(0,0,0,.18); padding: 4px; }
.kalpna-panel.kalpna-panel-right { left: auto; right: 0; }
.kalpna-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; border: 0; background: none; text-align: left; font: inherit; font-size: 13px; color: #222; cursor: pointer; border-radius: 3px; white-space: nowrap; }
.kalpna-item:hover:not(:disabled), .kalpna-item.kalpna-active { background: #eef3fc; }
.kalpna-item.kalpna-on { color: #1a4fb3; font-weight: 600; }
.kalpna-item:disabled { opacity: .4; cursor: default; }
.kalpna-item-sep { height: 1px; background: #e4e4e4; margin: 4px 0; }
.kalpna-item-hint { margin-left: auto; color: #888; font-size: 11px; }
.kalpna-row { display: flex; gap: 2px; }
.kalpna-colors { display: grid; grid-template-columns: repeat(5, 24px); gap: 4px; padding: 6px; }
.kalpna-swatch { width: 24px; height: 24px; border-radius: 3px; border: 1px solid rgba(0,0,0,.18); cursor: pointer; padding: 0; }
.kalpna-swatch:hover { transform: scale(1.12); box-shadow: 0 0 0 2px #2977ff; }
.kalpna-grid-picker { display: grid; grid-template-columns: repeat(10, 18px); gap: 2px; padding: 6px; }
.kalpna-grid-cell { width: 18px; height: 18px; border: 1px solid #c4c4c4; background: #fff; border-radius: 2px; cursor: pointer; padding: 0; }
.kalpna-grid-cell.kalpna-hl { background: #cfe0fd; border-color: #2977ff; }
.kalpna-grid-label { text-align: center; font-size: 12px; color: #555; padding: 2px 0 4px; }
.kalpna-chars { display: grid; grid-template-columns: repeat(10, 30px); gap: 2px; padding: 4px; }
.kalpna-char { width: 30px; height: 30px; border: 1px solid transparent; border-radius: 3px; background: none; cursor: pointer; font-size: 18px; padding: 0; font-family: inherit; }
.kalpna-char:hover { border-color: #2977ff; background: #eef3fc; }
.kalpna-tabs { display: flex; flex-wrap: wrap; gap: 2px; padding: 4px; border-bottom: 1px solid #eee; }
.kalpna-tab { border: 0; background: none; padding: 4px 8px; border-radius: 3px; font-size: 12px; cursor: pointer; }
.kalpna-tab.kalpna-on { background: #dfe8fb; color: #1a4fb3; }
.kalpna-form { display: flex; flex-direction: column; gap: 8px; padding: 8px; min-width: 280px; }
.kalpna-form label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #444; }
.kalpna-form label.kalpna-inline { flex-direction: row; align-items: center; gap: 6px; }
.kalpna-form .kalpna-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kalpna-input, .kalpna-select { height: 30px; padding: 0 8px; border: 1px solid #c4c4c4; border-radius: 4px; font: inherit; font-size: 13px; background: #fff; color: #222; min-width: 0; }
.kalpna-input:focus, .kalpna-select:focus, .kalpna-textarea:focus { outline: none; border-color: #2977ff; box-shadow: 0 0 0 2px rgba(41,119,255,.2); }
.kalpna-input-color { padding: 2px; width: 44px; }
.kalpna-textarea { min-height: 140px; padding: 8px; border: 1px solid #c4c4c4; border-radius: 4px; font: inherit; resize: vertical; }
.kalpna-actions { display: flex; gap: 6px; justify-content: flex-end; }
.kalpna-hint { font-size: 11px; color: #777; }
.kalpna-error { font-size: 12px; color: #c0392b; }

.kalpna-body { position: relative; }
.kalpna-content { padding: 12px 18px; outline: none; overflow-y: auto; }
.kalpna-content:focus { box-shadow: inset 0 0 0 1px #2977ff; }
.kalpna-content.kalpna-empty::before { content: attr(data-placeholder); position: absolute; color: #9ca3af; pointer-events: none; }
.kalpna-content .page-break::after { content: 'Page break'; position: relative; z-index: 1; padding: .2em .7em; font-size: 11px; color: #666; background: #fff; border: 1px solid #ddd; border-radius: 2px; font-family: system-ui, sans-serif; text-transform: uppercase; box-shadow: 0 0 0 4px #fff; }
.kalpna-content .page-break::before { content: ''; position: absolute; left: 0; right: 0; border-bottom: 2px dashed #c4c4c4; }
.kalpna-content figure.media { position: relative; }
.kalpna-content figure.media::after { content: ''; position: absolute; inset: 0; cursor: default; }
.kalpna-content .kalpna-selected { outline: 3px solid #2977ff !important; outline-offset: 0; }
.kalpna-content img.kalpna-selected, .kalpna-content figure.kalpna-selected img { outline: none; }
.kalpna-content td.kalpna-cell-focus, .kalpna-content th.kalpna-cell-focus { box-shadow: inset 0 0 0 2px #9bbcf6; }
.kalpna-content ::highlight(kalpna-find) { background: #fde68a; }
.kalpna-content ::highlight(kalpna-find-current) { background: #f59e0b; color: #000; }
.kalpna-show-blocks .kalpna-content p, .kalpna-show-blocks .kalpna-content h1, .kalpna-show-blocks .kalpna-content h2, .kalpna-show-blocks .kalpna-content h3,
.kalpna-show-blocks .kalpna-content h4, .kalpna-show-blocks .kalpna-content h5, .kalpna-show-blocks .kalpna-content h6, .kalpna-show-blocks .kalpna-content blockquote,
.kalpna-show-blocks .kalpna-content pre, .kalpna-show-blocks .kalpna-content ul, .kalpna-show-blocks .kalpna-content ol, .kalpna-show-blocks .kalpna-content div,
.kalpna-show-blocks .kalpna-content figure, .kalpna-show-blocks .kalpna-content table { outline: 1px dashed #9aa5b1; outline-offset: 2px; background-image: none; position: relative; padding-top: 14px; }
.kalpna-show-blocks .kalpna-content p::before { content: 'P'; } .kalpna-show-blocks .kalpna-content h1::before { content: 'H1'; } .kalpna-show-blocks .kalpna-content h2::before { content: 'H2'; }
.kalpna-show-blocks .kalpna-content h3::before { content: 'H3'; } .kalpna-show-blocks .kalpna-content h4::before { content: 'H4'; } .kalpna-show-blocks .kalpna-content h5::before { content: 'H5'; }
.kalpna-show-blocks .kalpna-content h6::before { content: 'H6'; } .kalpna-show-blocks .kalpna-content blockquote::before { content: 'BLOCKQUOTE'; } .kalpna-show-blocks .kalpna-content ul::before { content: 'UL'; }
.kalpna-show-blocks .kalpna-content ol::before { content: 'OL'; } .kalpna-show-blocks .kalpna-content figure::before { content: 'FIGURE'; } .kalpna-show-blocks .kalpna-content div:not(.page-break)::before { content: 'DIV'; }
.kalpna-show-blocks .kalpna-content p::before, .kalpna-show-blocks .kalpna-content h1::before, .kalpna-show-blocks .kalpna-content h2::before, .kalpna-show-blocks .kalpna-content h3::before,
.kalpna-show-blocks .kalpna-content h4::before, .kalpna-show-blocks .kalpna-content h5::before, .kalpna-show-blocks .kalpna-content h6::before, .kalpna-show-blocks .kalpna-content blockquote::before,
.kalpna-show-blocks .kalpna-content ul::before, .kalpna-show-blocks .kalpna-content ol::before, .kalpna-show-blocks .kalpna-content figure::before, .kalpna-show-blocks .kalpna-content div:not(.page-break)::before
{ position: absolute; top: 0; left: 0; font: 9px/1 system-ui, sans-serif; color: #fff; background: #9aa5b1; padding: 2px 4px; font-style: normal; }

.kalpna-balloon { position: absolute; z-index: 50; display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 4px; background: #fff; border: 1px solid #c4c4c4; border-radius: 4px; box-shadow: 0 3px 12px rgba(0,0,0,.18); max-width: calc(100% - 8px); }
.kalpna-balloon::before { content: ''; position: absolute; top: -6px; left: 18px; width: 10px; height: 10px; background: #fff; border-left: 1px solid #c4c4c4; border-top: 1px solid #c4c4c4; transform: rotate(45deg); }
.kalpna-balloon.kalpna-balloon-above::before { top: auto; bottom: -6px; transform: rotate(225deg); }
.kalpna-balloon .kalpna-dd .kalpna-panel { top: calc(100% + 6px); }
.kalpna-balloon-link { display: inline-block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a5bd6; padding: 0 6px; font-size: 13px; }
.kalpna-balloon-label { font-size: 11px; color: #777; padding: 0 4px; }
.kalpna-resize-handle { position: absolute; z-index: 45; width: 12px; height: 12px; background: #2977ff; border: 2px solid #fff; border-radius: 2px; box-shadow: 0 0 0 1px #2977ff; }
.kalpna-resize-handle[data-h="nw"], .kalpna-resize-handle[data-h="se"] { cursor: nwse-resize; }
.kalpna-resize-handle[data-h="ne"], .kalpna-resize-handle[data-h="sw"] { cursor: nesw-resize; }
.kalpna-resize-size { position: absolute; z-index: 46; background: rgba(0,0,0,.75); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 3px; pointer-events: none; }
.kalpna-mentions { position: absolute; z-index: 55; min-width: 180px; max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid #c4c4c4; border-radius: 4px; box-shadow: 0 3px 12px rgba(0,0,0,.18); padding: 3px; }

.kalpna-translit { min-width: 200px; }
.kalpna-lang-switch { display: inline-flex; align-items: stretch; height: 32px; border: 1.5px solid #ff9933; border-radius: 8px; overflow: hidden; background: #fff; margin-right: 2px; box-shadow: 0 1px 0 rgba(0,0,0,.04); }
.kalpna-lang-opt { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: #7a3d00; font: inherit; font-size: 13px; font-weight: 600; padding: 0 10px 0 6px; cursor: pointer; white-space: nowrap; }
.kalpna-lang-opt + .kalpna-lang-opt { border-left: 1.5px solid #ff9933; }
.kalpna-lang-opt:hover:not(:disabled):not(.kalpna-on) { background: #fff4e5; }
.kalpna-lang-opt:focus-visible { outline: 2px solid #2977ff; outline-offset: -2px; }
.kalpna-lang-opt.kalpna-on { background: #ff9933; color: #fff; }
.kalpna-lang-opt:disabled { opacity: .45; cursor: default; }
.kalpna-lang-glyph { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; background: #fff4e5; color: #b45309; font-weight: 700; font-size: 13px; }
.kalpna-lang-opt.kalpna-on .kalpna-lang-glyph { background: rgba(255,255,255,.25); color: #fff; }
.kalpna-translit-num { display: inline-block; width: 16px; color: #999; font-size: 11px; }
.kalpna-translit-word { font-family: 'Noto Sans Devanagari', 'Mukta', system-ui, sans-serif; }
.kalpna-translit-hint { font-size: 10px; color: #888; padding: 4px 10px 2px; border-top: 1px solid #eee; margin-top: 2px; }
.kalpna-translit-badge { margin-right: auto; border: 0; background: #fff4e5; color: #9a3412; border-radius: 10px; padding: 1px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
.kalpna-find { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px; background: #f5f5f5; border-bottom: 1px solid #ddd; }
.kalpna-find .kalpna-input { width: 180px; }
.kalpna-find-count { font-size: 12px; color: #555; min-width: 60px; }

.kalpna-source { display: block; width: 100%; padding: 12px 16px; border: none; outline: none; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5; resize: vertical; background: #1e1e1e; color: #d4d4d4; tab-size: 2; }
.kalpna-status { display: flex; justify-content: flex-end; gap: 14px; padding: 3px 10px; border-top: 1px solid #e4e4e4; background: #fafafa; font-size: 11px; color: #666; border-radius: 0 0 6px 6px; }
.kalpna-status .kalpna-over { color: #c0392b; font-weight: 600; }

.kalpna-modal-backdrop { position: fixed; inset: 0; z-index: 10050; background: rgba(0,0,0,.45); display: flex; align-items: flex-start; justify-content: center; padding: 5vh 16px; overflow-y: auto; }
.kalpna-modal { background: #fff; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,.3); width: 100%; max-width: 860px; display: flex; flex-direction: column; max-height: 90vh; }
.kalpna-modal-sm { max-width: 520px; }
.kalpna-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e4e4e4; font-weight: 600; }
.kalpna-modal-body { padding: 14px; overflow: auto; }
.kalpna-modal-body.kalpna-content { padding: 24px 32px; }
.kalpna-kbd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.kalpna-kbd-table td { padding: 5px 6px; border-bottom: 1px solid #eee; }
.kalpna-kbd-table kbd { background: #f1f1f1; border: 1px solid #ccc; border-bottom-width: 2px; border-radius: 3px; padding: 1px 5px; font-size: 11px; font-family: inherit; }
.kalpna-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

@media (max-width: 640px) {
  .kalpna-btn { min-width: 28px; height: 28px; padding: 0 3px; }
  .kalpna-dd-label { max-width: 70px; min-width: 40px; }
  .kalpna-content table { display: block; overflow-x: auto; }
  .kalpna-panel { max-width: 92vw; }
  .kalpna-editor.kalpna-fullscreen .kalpna-content { padding: 16px; }
}
`;
