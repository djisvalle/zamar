#!/usr/bin/env node
// Regenerates the self-contained WebView HTML bundles for PDF and MusicXML
// rendering (src/screens/live-stage/generated/*.ts). Re-run this whenever
// src/music/musicxmlTransform.ts, scripts/webview-drivers/*.js, or the
// pdfjs-dist/opensheetmusicdisplay/fflate dependency versions change, then
// commit the regenerated output.
//
//   node scripts/generate-webview-bundles.js

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/screens/live-stage/generated');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function compileTransform() {
  const src = read('src/music/musicxmlTransform.ts');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2019 },
  });
  return outputText;
}

function writeGenerated(fileName, constName, html) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const banner = '// GENERATED FILE. Do not edit by hand — run `npm run generate:webview-bundles`.\n';
  const contents = `${banner}export const ${constName} = ${JSON.stringify(html)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, fileName), contents, 'utf8');
  console.log(`wrote ${fileName} (${Math.round(contents.length / 1024)} KB)`);
}

function buildMusicXmlHtml() {
  const fflateSrc = read('node_modules/fflate/umd/index.js');
  const osmdSrc = read('node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js');
  const transformJs = compileTransform();
  const driver = read('scripts/webview-drivers/musicxml-driver.js');

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;background:#fff;}</style></head>',
    '<body>',
    '<div id="osmd-container"></div>',
    `<script>${fflateSrc}</script>`,
    `<script>${osmdSrc}</script>`,
    `<script>(function(){${transformJs}\nwindow.transformMusicXml = transformMusicXml;})();</script>`,
    `<script>${driver}</script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

function buildPdfHtml() {
  const pdfjsSrc = read('node_modules/pdfjs-dist/legacy/build/pdf.min.mjs');
  const pdfWorkerSrc = read('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
  const driver = read('scripts/webview-drivers/pdf-driver.js');

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="utf-8" /><style>',
    'html,body{margin:0;padding:0;background:#fff;}',
    '#pages{display:flex;flex-direction:column;align-items:center;}',
    'canvas{display:block;margin-bottom:8px;}',
    '</style></head>',
    '<body>',
    '<div id="pages"></div>',
    '<script>',
    `window.__PDFJS_SRC__ = ${JSON.stringify(pdfjsSrc)};`,
    `window.__PDFJS_WORKER_SRC__ = ${JSON.stringify(pdfWorkerSrc)};`,
    '</script>',
    `<script type="module">${driver}</script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

writeGenerated('musicXmlViewerHtml.ts', 'MUSIC_XML_VIEWER_HTML', buildMusicXmlHtml());
writeGenerated('pdfViewerHtml.ts', 'PDF_VIEWER_HTML', buildPdfHtml());
