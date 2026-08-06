#!/usr/bin/env node
/**
 * Regenerate omg_flowchart.html from omg_flowchart.md.
 *
 * Repo-local documentation tooling. NOT part of the shipped npm package --
 * omg_flowchart.md/.html are documentation *about* the product, so their build
 * tooling lives here in tools/docs/ with its own manifest and lockfile.
 *
 * Produces a fully self-contained, offline-capable page: the mermaid library is
 * inlined, all CSS is inlined, and the result makes zero network requests.
 *
 * Usage (from anywhere -- paths resolve relative to the repo, not to cwd):
 *
 *   just docs-build
 *   node tools/docs/build-flowchart-html.mjs
 *   node tools/docs/build-flowchart-html.mjs [input.md] [output.html]
 *
 * Setup:
 *
 *   bun install --cwd tools/docs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // <repo>/tools/docs
const REPO = path.resolve(HERE, '..', '..');              // <repo>
const rel = p => path.relative(REPO, p) || p;
const INSTALL_CMD = `bun install --cwd "${HERE}"`;

function fail(what, remedy) {
  console.error(`\nbuild-flowchart-html: ${what}\n\n${remedy}\n`);
  process.exit(1);
}

/* ---------- 0. Inputs, resolved against the repo -- never against cwd ---------- */
const args = process.argv.slice(2).filter(a => a !== '--');
if (args.includes('-h') || args.includes('--help')) {
  console.log([
    'Usage: node tools/docs/build-flowchart-html.mjs [input.md] [output.html]',
    '',
    `  input.md     default: ${rel(path.join(REPO, 'omg_flowchart.md'))}`,
    `  output.html  default: ${rel(path.join(REPO, 'omg_flowchart.html'))}`,
    '',
    'Paths given on the command line are resolved against the current directory;',
    'the defaults are always resolved against the repository root.',
  ].join('\n'));
  process.exit(0);
}
const SRC = args[0] ? path.resolve(process.cwd(), args[0]) : path.join(REPO, 'omg_flowchart.md');
const OUT = args[1] ? path.resolve(process.cwd(), args[1]) : path.join(REPO, 'omg_flowchart.html');

/* ---------- 0a. Dependencies. Never fall back to a CDN: that would silently
   break the offline guarantee this file exists to provide. ---------- */
const MERMAID_JS = path.join(HERE, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
if (!fs.existsSync(MERMAID_JS)) {
  fail(
    `the mermaid bundle is missing at ${rel(MERMAID_JS)}`,
    `Install the docs tooling, then re-run:\n\n    ${INSTALL_CMD}`
  );
}

let Marked;
try {
  ({ Marked } = await import('marked'));
} catch {
  fail(
    "the 'marked' package could not be loaded",
    `Install the docs tooling, then re-run:\n\n    ${INSTALL_CMD}`
  );
}

if (!fs.existsSync(SRC)) fail(`input file not found: ${SRC}`, 'Pass a path explicitly, or run with --help.');

const md = fs.readFileSync(SRC, 'utf8');

/* ---------- 1. Pull the mermaid fences out byte-for-byte ---------- */
const lines = md.split('\n');
const kept = [];
const blocks = [];
for (let i = 0; i < lines.length; ) {
  if (lines[i].trim() === '```mermaid') {
    const buf = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '```') { buf.push(lines[j]); j++; }
    if (j >= lines.length) throw new Error(`unterminated mermaid fence at line ${i + 1}`);
    blocks.push(buf.join('\n'));
    kept.push(`@@MERMAIDBLOCK${blocks.length - 1}@@`);
    i = j + 1;
  } else {
    kept.push(lines[i]);
    i++;
  }
}
console.error(`extracted ${blocks.length} mermaid blocks`);

/* ---------- 2. Markdown -> HTML ---------- */
const headings = [];
const slugCount = new Map();
function slugify(text) {
  let s = text.toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!s) s = 'section';
  const n = slugCount.get(s) || 0;
  slugCount.set(s, n + 1);
  return n ? `${s}-${n}` : s;
}

const marked = new Marked({ gfm: true, breaks: false, pedantic: false });
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const plain = tokens.map(t => t.raw).join('');
      const id = slugify(plain);
      if (depth === 2) headings.push({ id, html: inner });
      if (depth === 1) {
        // The document header wraps the source's own H1 (verbatim) and adds the
        // one-line note that this file is a derived view. No heading is duplicated.
        return `<header class="doc-header">\n<h1 id="${id}">${inner}</h1>\n` +
          `<p class="derived">A derived, read-only view of <code>omg_flowchart.md</code>, rendered with its diagrams inline. The Markdown file is the source of truth.</p>\n` +
          `</header>\n`;
      }
      return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
    },
  },
});

let body = marked.parse(kept.join('\n'));

/* ---------- 3. Re-inject the diagrams, raw source HTML-escaped ---------- */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let injected = 0;
blocks.forEach((src, i) => {
  const token = `@@MERMAIDBLOCK${i}@@`;
  const figure =
    `<figure class="diagram" role="group" aria-label="Diagram ${i + 1}">` +
    `<pre class="mermaid-src" data-index="${i}" hidden>${esc(src)}</pre>` +
    `<div class="mermaid-out" id="mermaid-out-${i}"></div>` +
    `</figure>`;
  const wrapped = `<p>${token}</p>`;
  if (body.includes(wrapped)) { body = body.replace(wrapped, figure); injected++; }
  else if (body.includes(token)) { body = body.replace(token, figure); injected++; }
  else throw new Error(`placeholder ${token} vanished during markdown conversion`);
});
if (injected !== blocks.length) throw new Error('injection count mismatch');
if (body.includes('@@MERMAIDBLOCK')) throw new Error('leftover placeholder in output');

/* ---------- 4. TOC ---------- */
const toc = headings
  .map(h => `        <li><a href="#${h.id}">${h.html}</a></li>`)
  .join('\n');

/* ---------- 5. Inline the mermaid bundle ---------- */
let mermaidJs = fs.readFileSync(MERMAID_JS, 'utf8');
if (/<\/script/i.test(mermaidJs)) throw new Error('mermaid bundle contains a </script sequence; needs splitting');
if (/<!--/.test(mermaidJs)) console.error('note: bundle contains <!-- (harmless inside classic script)');

const CSS = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  --ink:        #1f2430;
  --ink-soft:   #4a5265;
  --ink-faint:  #6b7385;
  --rule:       #e2e6ee;
  --rule-soft:  #eef1f6;
  --bg:         #ffffff;
  --bg-soft:    #f7f8fb;
  --bg-code:    #f1f3f8;
  --accent:     #2f5fd0;
  --accent-bg:  #eef3fd;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --measure: 76ch;
  --toc-w: 19rem;
}

html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16.5px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* ---------- shell ---------- */
.layout { display: flex; align-items: flex-start; gap: 0; }

.toc {
  flex: 0 0 var(--toc-w);
  width: var(--toc-w);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-right: 1px solid var(--rule);
  background: var(--bg-soft);
  padding: 1.75rem 1.25rem 3rem;
}
.toc > summary {
  cursor: pointer;
  list-style: none;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  user-select: none;
}
.toc > summary::-webkit-details-marker { display: none; }
.toc > summary::before {
  content: "\\25BE";
  display: inline-block;
  width: 1em;
  transition: transform 0.15s ease;
  color: var(--ink-faint);
}
.toc:not([open]) > summary::before { transform: rotate(-90deg); }
.toc > summary:hover { background: var(--rule-soft); color: var(--ink); }

.toc ol {
  list-style: none;
  margin: 0.85rem 0 0;
  padding: 0;
  counter-reset: none;
}
.toc li { margin: 0; }
.toc a {
  display: block;
  padding: 0.34rem 0.55rem;
  border-radius: 5px;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 0.875rem;
  line-height: 1.4;
  border-left: 2px solid transparent;
}
.toc a:hover { background: var(--accent-bg); color: var(--accent); border-left-color: var(--accent); }
.toc a code { background: none; border: none; padding: 0; font-size: 0.94em; color: inherit; }

main {
  flex: 1 1 auto;
  min-width: 0;
  padding: 2.5rem 3rem 6rem;
  max-width: 74rem;
}

/* ---------- document header ---------- */
.doc-header { border-bottom: 1px solid var(--rule); padding-bottom: 1.5rem; margin-bottom: 2.5rem; }
.doc-header h1 { margin: 0 0 0.5rem; border: 0; padding: 0; }
.doc-header .derived {
  margin: 0;
  color: var(--ink-faint);
  font-size: 0.9rem;
  max-width: var(--measure);
}
.doc-header .derived code { font-size: 0.9em; }

/* ---------- prose rhythm ---------- */
main > h1, main > h2, main > h3, main > h4,
main > p, main > ul, main > ol, main > blockquote, main > table, main > hr,
main > header.doc-header { max-width: var(--measure); }

h1, h2, h3, h4 { line-height: 1.25; font-weight: 650; letter-spacing: -0.011em; color: var(--ink); }
h1 { font-size: 2.05rem; margin: 0 0 1rem; }
h2 {
  font-size: 1.45rem;
  margin: 3.25rem 0 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--rule);
  scroll-margin-top: 1rem;
}
h3 { font-size: 1.13rem; margin: 2.25rem 0 0.75rem; scroll-margin-top: 1rem; }
h4 { font-size: 1rem; margin: 1.75rem 0 0.6rem; }

p { margin: 0 0 1.15rem; }
ul, ol { margin: 0 0 1.15rem; padding-left: 1.4rem; }
li { margin: 0 0 0.5rem; }
li > ul, li > ol { margin-top: 0.5rem; }
li::marker { color: var(--ink-faint); }

strong { font-weight: 650; color: var(--ink); }
em { font-style: italic; }

a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }

hr {
  border: 0;
  border-top: 1px solid var(--rule);
  margin: 3rem 0;
}

/* ---------- inline code ---------- */
code {
  font-family: var(--mono);
  font-size: 0.855em;
  background: var(--bg-code);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 0.1em 0.34em;
  white-space: break-spaces;
  overflow-wrap: break-word;
}
h1 code, h2 code, h3 code { font-size: 0.9em; }
pre code { background: none; border: 0; padding: 0; }

blockquote {
  margin: 0 0 1.15rem;
  padding: 0.75rem 1.1rem;
  border-left: 3px solid var(--accent);
  background: var(--accent-bg);
  border-radius: 0 6px 6px 0;
  color: var(--ink-soft);
}
blockquote > :last-child { margin-bottom: 0; }

/* ---------- tables ---------- */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 1.6rem;
  font-size: 0.93rem;
  border: 1px solid var(--rule);
  border-radius: 7px;
  overflow: hidden;
}
thead th {
  background: var(--bg-soft);
  text-align: left;
  font-weight: 650;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-faint);
  border-bottom: 2px solid var(--rule);
}
th, td {
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--rule-soft);
  vertical-align: top;
}
tbody tr:nth-child(even) { background: #fbfcfe; }
tbody tr:last-child td { border-bottom: 0; }
td code { white-space: nowrap; }

/* ---------- diagrams ---------- */
figure.diagram {
  margin: 2rem 0 2.25rem;
  padding: 1.25rem;
  background: #fdfdfe;
  border: 1px solid var(--rule);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(24, 31, 47, 0.05), 0 6px 18px rgba(24, 31, 47, 0.045);
  overflow-x: auto;
  overflow-y: hidden;
}
.mermaid-out { display: flex; justify-content: center; min-width: min-content; }
.mermaid-out svg { display: block; height: auto; max-width: none; }
.diagram-error {
  font-family: var(--mono);
  font-size: 0.85rem;
  color: #a12a2a;
  background: #fdf1f1;
  border: 1px solid #f0c9c9;
  border-radius: 6px;
  padding: 0.75rem;
  white-space: pre-wrap;
}

/* ---------- narrow viewports ---------- */
@media (max-width: 980px) {
  .layout { display: block; }
  .toc {
    width: auto;
    max-width: none;
    position: static;
    height: auto;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid var(--rule);
    padding: 1rem 1.25rem;
  }
  main { padding: 1.75rem 1.25rem 4rem; max-width: none; }
  figure.diagram { padding: 0.85rem; }
  :root { --measure: 100%; }
}

@media print {
  .toc { display: none; }
  main { max-width: none; padding: 0; }
  figure.diagram { break-inside: avoid; box-shadow: none; }
}
`.trim();

const BOOT = `
(function () {
  var m = globalThis.mermaid;
  var status = { total: 0, rendered: 0, failed: [], errors: [] };
  globalThis.__DIAGRAM_STATUS__ = status;

  if (!m || typeof m.initialize !== 'function') {
    status.errors.push('mermaid global not found');
    globalThis.__DIAGRAMS_DONE__ = true;
    return;
  }

  m.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      background: '#fdfdfe',
      primaryColor: '#eef3fd',
      primaryTextColor: '#1f2430',
      primaryBorderColor: '#8fa6d4',
      secondaryColor: '#f2f4f8',
      tertiaryColor: '#f7f8fb',
      lineColor: '#64748b',
      textColor: '#1f2430',
      mainBkg: '#eef3fd',
      nodeBorder: '#8fa6d4',
      clusterBkg: '#f7f8fb',
      clusterBorder: '#cbd5e1',
      edgeLabelBackground: '#ffffff',
      titleColor: '#1f2430'
    },
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
      curve: 'basis',
      padding: 12,
      nodeSpacing: 45,
      rankSpacing: 55
    }
  });

  function run() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('pre.mermaid-src'));
    status.total = nodes.length;
    var chain = Promise.resolve();
    nodes.forEach(function (pre, i) {
      chain = chain.then(function () {
        var src = pre.textContent;
        var target = document.getElementById('mermaid-out-' + pre.dataset.index);
        return m.render('mmd-svg-' + i, src).then(function (res) {
          target.innerHTML = res.svg;
          if (typeof res.bindFunctions === 'function') res.bindFunctions(target);
          status.rendered++;
        }).catch(function (err) {
          status.failed.push(Number(pre.dataset.index));
          status.errors.push('diagram ' + i + ': ' + (err && err.message ? err.message : String(err)));
          var d = document.createElement('div');
          d.className = 'diagram-error';
          d.textContent = 'Diagram failed to render: ' + (err && err.message ? err.message : String(err));
          target.appendChild(d);
        });
      });
    });
    return chain.then(function () {
      // mermaid parks throwaway measurement nodes on <body>; clear any strays.
      Array.prototype.slice.call(document.querySelectorAll('body > #dmmd-svg-0, body > .mermaidTooltip'))
        .forEach(function (n) { if (n.parentNode === document.body) n.parentNode.removeChild(n); });
      globalThis.__DIAGRAMS_DONE__ = true;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
`.trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The OMG Workflow — Flowcharts</title>
<meta name="description" content="Rendered view of omg_flowchart.md — a descriptive map of the OMG workflow instruments.">
<style>
${CSS}
</style>
</head>
<body>
<div class="layout">
  <details class="toc" open>
    <summary>Contents</summary>
    <nav aria-label="Table of contents">
      <ol>
${toc}
      </ol>
    </nav>
  </details>

  <main>
${body}
  </main>
</div>

<script>
${mermaidJs}
</script>
<script>
${BOOT}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.error(`wrote ${rel(OUT)} (${fs.statSync(OUT).size} bytes, ${blocks.length} diagrams, ${headings.length} TOC entries)`);
