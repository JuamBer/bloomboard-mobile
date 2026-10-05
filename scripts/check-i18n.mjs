#!/usr/bin/env node
// Keeps the translations whole (CI gate, `npm run check:i18n`):
//
// 1. Spanish and English carry the same keys in every namespace — a key in
//    one and missing from the other renders as the raw key.
// 2. Every key the code asks for with a literal `t('ns:key')` exists. A
//    plural asks for `key` and is satisfied by `key_one` / `key_other`.
//    Dynamic keys (`t(\`ns:${x}\`)`) are checked by their static prefix.
//
// It prints every problem, then exits 1 if there was any.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const locales = join(root, 'src', 'i18n', 'locales');
const problems = [];

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

const load = (lang) =>
  Object.fromEntries(
    readdirSync(join(locales, lang))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [
        f.replace(/\.json$/, ''),
        new Set(
          flatten(JSON.parse(readFileSync(join(locales, lang, f), 'utf8'))),
        ),
      ]),
  );

const es = load('es');
const en = load('en');

// ─── 1. Parity ─────────────────────────────────────────────────────────────────
for (const ns of new Set([...Object.keys(es), ...Object.keys(en)])) {
  if (!es[ns]) problems.push(`namespace "${ns}" exists in en but not es`);
  if (!en[ns]) problems.push(`namespace "${ns}" exists in es but not en`);
  if (!es[ns] || !en[ns]) continue;
  for (const key of es[ns])
    if (!en[ns].has(key)) problems.push(`${ns}:${key} missing in en`);
  for (const key of en[ns])
    if (!es[ns].has(key)) problems.push(`${ns}:${key} missing in es`);
}

// ─── 2. Keys the code uses ─────────────────────────────────────────────────────
const sources = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts'))
      sources.push(path);
  }
};
walk(join(root, 'src'));

const exists = (ns, key) => {
  const keys = es[ns];
  if (!keys) return false;
  return keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);
};
const prefixExists = (ns, prefix) => {
  const keys = es[ns];
  return !!keys && [...keys].some((k) => k.startsWith(prefix));
};

const literal = /\bt\(\s*'([a-z]+):([A-Za-z0-9_.]+)'/g;
const dynamic = /\bt\(\s*`([a-z]+):([A-Za-z0-9_.]*)\$\{/g;
const keyAttr = /i18nKey="([a-z]+):([A-Za-z0-9_.]+)"/g;

for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  const where = relative(root, file);
  for (const re of [literal, keyAttr]) {
    for (const [, ns, key] of text.matchAll(re)) {
      if (!exists(ns, key))
        problems.push(`${where}: ${ns}:${key} does not exist`);
    }
  }
  for (const [, ns, prefix] of text.matchAll(dynamic)) {
    if (!prefixExists(ns, prefix))
      problems.push(`${where}: no ${ns}:${prefix}… keys exist`);
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(
  `✓ i18n: ${Object.keys(es).length} namespaces in step, every key the code uses exists.`,
);
