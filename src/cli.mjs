#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { triage, toMarkdown } from './triage.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : null;
if (!file) {
  console.error('usage: process-triage <steps.json> [--out report.md]');
  process.exit(2);
}
try {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const md = toMarkdown(triage(data.steps ?? data), data.title);
  if (out) writeFileSync(out, md); else process.stdout.write(md);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}
