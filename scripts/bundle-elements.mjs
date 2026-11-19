// Turns the Angular "elements" build into one classic <script> file:
//   dist/kalpna-editor/bundles/kalpna-editor.js      (also copied to dist/elements/)
import { build } from 'esbuild';
import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const libPkg = JSON.parse(readFileSync(join(root, 'projects/kalpna-angular-editor/package.json'), 'utf8'));
const browserDir = join(root, 'dist/elements/browser');
const entry = join(browserDir, 'main.js');
if (!existsSync(entry)) throw new Error('Run "ng build elements" first');

const extra = readdirSync(browserDir).filter((f) => f.endsWith('.js') && f !== 'main.js');
if (extra.length) console.warn('Note: extra chunks found (they will be inlined):', extra.join(', '));

const outDir = join(root, 'dist/kalpna-editor/bundles');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'kalpna-editor.js');

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  legalComments: 'none',
  define: { KALPNA_VERSION: JSON.stringify(libPkg.version) },
  banner: { js: `/*! Kalpna Editor v${libPkg.version} | MIT | https://github.com/simplycodeTech/KalpanaEditor */` },
  outfile
});
copyFileSync(outfile, join(root, 'dist/elements/kalpna-editor.js'));
const size = readFileSync(outfile).length;
console.log(`✔ Built ${outfile} (${(size / 1024).toFixed(1)} kB)`);
