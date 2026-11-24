# process-triage

Independent demo, not affiliated with Oowlish (cliente não diz).

A small Node script. You list the steps of a business process. It tells you which steps need an LLM, which need plain code, and which should stay with a person.

I wrote it after applying for a Forward Deployed Engineer role that mixes full-stack work and AI automation. In that kind of job, the first question is often "should an LLM do this at all?" This tool is a first pass at answering it. It is a rule-of-thumb sorter, not a model of any real company.

## Run it

Needs Node 20 or newer. No dependencies.

```
node src/cli.mjs examples/invoice-process.json
node src/cli.mjs my-steps.json --out report.md
```

Each step in the JSON file has: `name`, `runs_per_week`, `minutes_per_run`, `input` (`structured`, `semi` or `unstructured`), `rules_clear`, `needs_judgment`, `error_cost` (`low`, `medium` or `high`).

The rules, in order:

1. Structured input and clear rules: `script`.
2. Needs judgment and a mistake is costly: `human`.
3. Structured input, fuzzy rules: `script+review`.
4. Messy input, costly mistakes: `llm+human`.
5. Messy input, cheap mistakes: `llm`.

Steps are sorted by hours per week, so the biggest time sinks come first.

## What the example shows

`examples/invoice-process.json` is invented data for a fictional accounts-payable process. It has 8 steps and 34.5 hours a week. Three steps (12 hours) are rules on structured data, so plain code does them. Two more (6.5 hours) should stay with a person. Only the other three, 16 hours, are real LLM work, and two of those still need a human check or sampling.

## Tests

```
npm test
```

## What was tested

- Each of the five rules, with one step that triggers it.
- Input validation: bad `input` value, negative numbers, empty name, empty list.
- Sort order, and the counts and hours for the example file.
- The Markdown output and the command line, including a clean error for a missing file.
- All of this runs offline. GitHub Actions runs the same tests on every push.

## What was not tested

- Whether the rules match what works in real projects. They are my judgment, not measured.
- Real company data. Only the invented example was used.
- Node versions other than the one on my Mac and Node 22 in CI.
- Large inputs. There is no limit on step count, and I did not try thousands.
