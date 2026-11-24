const INPUTS = ['structured', 'semi', 'unstructured'];
const COSTS = ['low', 'medium', 'high'];

export function validate(step, i = 0) {
  const where = `step #${i + 1}${step && step.name ? ` (${step.name})` : ''}`;
  if (!step || typeof step !== 'object') throw new Error(`${where}: not an object`);
  if (!step.name || typeof step.name !== 'string') throw new Error(`${where}: "name" is required`);
  for (const k of ['runs_per_week', 'minutes_per_run']) {
    if (typeof step[k] !== 'number' || !(step[k] >= 0)) throw new Error(`${where}: "${k}" must be a number >= 0`);
  }
  if (!INPUTS.includes(step.input)) throw new Error(`${where}: "input" must be one of ${INPUTS.join(', ')}`);
  if (!COSTS.includes(step.error_cost)) throw new Error(`${where}: "error_cost" must be one of ${COSTS.join(', ')}`);
  for (const k of ['rules_clear', 'needs_judgment']) {
    if (typeof step[k] !== 'boolean') throw new Error(`${where}: "${k}" must be true or false`);
  }
  return step;
}

// Decision order matters: plain code wins whenever the rules are clear and the input is structured.
export function classify(step) {
  if (step.input === 'structured' && step.rules_clear) {
    return { approach: 'script', why: 'Structured input and clear rules: plain code is cheaper and exact. No LLM needed.' };
  }
  if (step.needs_judgment && step.error_cost === 'high') {
    return { approach: 'human', why: 'Judgment plus costly mistakes: keep a person. An LLM may draft, never decide.' };
  }
  if (step.input === 'structured') {
    return { approach: 'script+review', why: 'Structured input but fuzzy rules: start with code, send the odd cases to a person.' };
  }
  if (step.error_cost === 'high') {
    return { approach: 'llm+human', why: 'Messy input where mistakes are costly: LLM extracts or drafts, a person approves each result.' };
  }
  return { approach: 'llm', why: 'Messy input and mistakes are cheap to fix: LLM can run it, with sampling checks.' };
}

export function hoursPerWeek(step) {
  return (step.runs_per_week * step.minutes_per_run) / 60;
}

export function triage(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('input must be a non-empty list of steps');
  steps.forEach(validate);
  return steps
    .map((s) => ({ ...s, hours_per_week: Math.round(hoursPerWeek(s) * 100) / 100, ...classify(s) }))
    .sort((a, b) => b.hours_per_week - a.hours_per_week || a.name.localeCompare(b.name));
}

export function summary(rows) {
  const total = rows.reduce((n, r) => n + r.hours_per_week, 0);
  const by = {};
  for (const r of rows) by[r.approach] = (by[r.approach] || 0) + 1;
  const noLlm = rows.filter((r) => r.approach === 'script' || r.approach === 'human').length;
  return { steps: rows.length, total_hours_per_week: Math.round(total * 100) / 100, by_approach: by, steps_without_llm: noLlm };
}

export function toMarkdown(rows, title = 'Process triage') {
  const s = summary(rows);
  const out = [`# ${title}`, '', `${s.steps} steps, ${s.total_hours_per_week} h/week of manual work.`,
    `${s.steps_without_llm} of ${s.steps} steps do not need an LLM (plain code or a person).`, '',
    '| Step | h/week | Approach | Why |', '|---|---:|---|---|'];
  for (const r of rows) out.push(`| ${r.name} | ${r.hours_per_week} | ${r.approach} | ${r.why} |`);
  return out.join('\n') + '\n';
}
