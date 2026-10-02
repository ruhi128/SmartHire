/*
 * Copy a browser-ready PDF.js parser and its matching worker into /public.
 *
 * PDF.js v5 ships native ES modules. PDF.js v3 ships browser scripts that
 * expose window.pdfjsLib. Both layouts are supported so the app can keep the
 * project's existing pdfjs-dist version and does not need a package.json edit.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const publicPdfJsDir = path.join(projectRoot, 'public', 'pdfjs');

const runtimeFormats = [
  {
    name: 'ES module',
    parserCandidates: [
      'node_modules/pdfjs-dist/build/pdf.mjs',
      'node_modules/pdfjs-dist/legacy/build/pdf.mjs',
    ],
    workerCandidates: [
      'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    ],
    parserDestination: 'pdf.mjs',
    workerDestination: 'pdf.worker.min.mjs',
    staleFiles: ['pdf.min.js', 'pdf.worker.min.js'],
  },
  {
    name: 'classic browser script',
    parserCandidates: [
      'node_modules/pdfjs-dist/build/pdf.min.js',
      'node_modules/pdfjs-dist/build/pdf.js',
      'node_modules/pdfjs-dist/legacy/build/pdf.min.js',
      'node_modules/pdfjs-dist/legacy/build/pdf.js',
    ],
    workerCandidates: [
      'node_modules/pdfjs-dist/build/pdf.worker.min.js',
      'node_modules/pdfjs-dist/build/pdf.worker.js',
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js',
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
    ],
    parserDestination: 'pdf.min.js',
    workerDestination: 'pdf.worker.min.js',
    staleFiles: ['pdf.mjs', 'pdf.worker.min.mjs'],
  },
];

function findAsset(candidates) {
  return candidates
    .map((relativePath) => path.join(projectRoot, relativePath))
    .find((candidate) => fs.existsSync(candidate));
}

const runtime = runtimeFormats
  .map((format) => ({
    ...format,
    parserSource: findAsset(format.parserCandidates),
    workerSource: findAsset(format.workerCandidates),
  }))
  .find((format) => format.parserSource && format.workerSource);

if (!runtime) {
  const checked = runtimeFormats
    .flatMap((format) => [...format.parserCandidates, ...format.workerCandidates]);
  throw new Error(`Could not find a compatible PDF.js parser and worker. Checked: ${checked.join(', ')}`);
}

fs.mkdirSync(publicPdfJsDir, { recursive: true });
fs.copyFileSync(runtime.parserSource, path.join(publicPdfJsDir, runtime.parserDestination));
fs.copyFileSync(runtime.workerSource, path.join(publicPdfJsDir, runtime.workerDestination));
for (const staleFile of runtime.staleFiles) {
  fs.rmSync(path.join(publicPdfJsDir, staleFile), { force: true });
}

console.log(`Copied PDF.js ${runtime.name} runtime:`);
console.log(`  ${path.relative(projectRoot, runtime.parserSource)} -> public/pdfjs/${runtime.parserDestination}`);
console.log(`  ${path.relative(projectRoot, runtime.workerSource)} -> public/pdfjs/${runtime.workerDestination}`);
