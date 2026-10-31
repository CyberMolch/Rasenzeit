// Build ohne Vite: bündelt mit esbuild in eine einzelne, eigenständige index.html (dist/).
// Funktioniert offline und als Grundlage für die Android-App (Capacitor: webDir = dist).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const watch = process.argv.includes('--dev');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: !watch,
  sourcemap: false,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari15'],
  jsx: 'automatic',
  write: false,
  outdir: 'dist',
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  logLevel: 'info',
});
const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
let html = await readFile('index.html', 'utf8');
html = html.replace('<!--STYLES-->', () => `<style>${css}</style>`).replace('<!--SCRIPT-->', () => `<script>${js.replace(/<\/script/g, '<\\/script')}</script>`);
await writeFile('dist/index.html', html);
console.log(`dist/index.html: ${(html.length / 1024).toFixed(0)} KB`);
