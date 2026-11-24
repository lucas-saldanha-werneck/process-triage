import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { classify, hoursPerWeek, triage, summary, toMarkdown, validate } from '../src/triage.mjs';

const base = { name: 'x', runs_per_week: 10, minutes_per_run: 6, input: 'structured', rules_clear: true, needs_judgment: false, error_cost: 'low' };
const ex = JSON.parse(readFileSync(new URL('../examples/invoice-process.json', import.meta.url)));

test('structured + clear rules -> script', () => assert.equal(classify(base).approach, 'script'));
test('judgment + high cost -> human', () => assert.equal(classify({ ...base, input: 'unstructured', rules_clear: false, needs_judgment: true, error_cost: 'high' }).approach, 'human'));
test('structured, fuzzy rules -> script+review', () => assert.equal(classify({ ...base, rules_clear: false }).approach, 'script+review'));
test('messy + high cost -> llm+human', () => assert.equal(classify({ ...base, input: 'unstructured', rules_clear: false, error_cost: 'high' }).approach, 'llm+human'));
test('messy + low cost -> llm', () => assert.equal(classify({ ...base, input: 'unstructured', rules_clear: false }).approach, 'llm'));
test('hours per week', () => assert.equal(hoursPerWeek(base), 1));
test('validate rejects bad input', () => {
  assert.throws(() => validate({ ...base, input: 'pdf' }), /input/);
  assert.throws(() => validate({ ...base, runs_per_week: -1 }), /runs_per_week/);
  assert.throws(() => validate({ ...base, name: '' }), /name/);
  assert.throws(() => triage([]), /non-empty/);
});
test('rows sorted by hours, biggest first', () => {
  const rows = triage(ex.steps);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].hours_per_week >= rows[i].hours_per_week);
  assert.equal(rows[0].name, 'Read supplier invoices from email PDFs');
});
test('example: 3 script, 2 human, 3 other', () => {
  const s = summary(triage(ex.steps));
  assert.equal(s.steps, 8);
  assert.equal(s.by_approach.script, 3);
  assert.equal(s.by_approach.human, 2);
  assert.equal(s.steps_without_llm, 5);
});
test('markdown has table and summary line', () => {
  const md = toMarkdown(triage(ex.steps), ex.title);
  assert.match(md, /5 of 8 steps do not need an LLM/);
  assert.match(md, /\| Step \| h\/week/);
});
test('cli prints report and fails cleanly on bad file', () => {
  const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
  const ok = execFileSync('node', [cli, new URL('../examples/invoice-process.json', import.meta.url).pathname]).toString();
  assert.match(ok, /# EXAMPLE DATA/);
  const bad = spawnSync('node', [cli, '/nonexistent.json']);
  assert.equal(bad.status, 1);
});
