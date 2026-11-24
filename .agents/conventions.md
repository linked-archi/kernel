---
inclusion: auto
description: Principles, conventions and workflow for linked-archi-kernel, the model logic shared by la-gram and the Linked.Archi workspace.
---

# linked-archi-kernel — Project Conventions

## What This Is

The model logic of la-gram, made a package of its own so that la-gram and the Linked.Archi workspace run the same
code (platform decision PD-14). It has no UI and no application. It started as la-gram's `rdf-engine`,
`metamodel-manager` and `model-manager`, with `model-io`.

## Principles

1. **One behaviour for every user.** A change here changes la-gram and the workspace alike. la-gram's specification
   (`la-gram/.agents/specs/la-gram/requirements.md`) stays the reference for what these modules do, and its
   numbered requirements are cited in their comments.
2. **la-gram's architecture principles hold here unchanged.**
   - The store is the model of record.
   - The metamodel is data, not code.
   - SHACL is the contract.
   - The published vocabulary is used exactly.
   - Undo is an inverse diff.
3. **No UI, no DOM requirement.** The kernel runs in Node 22+ and in browsers. Where it needs something the
   environment may not have (a filesystem, a worker), it probes for it, as `bundled-assets.ts` and `rdf-store.ts`
   do. It never sniffs globals.
4. **Neutral to its user.** The kernel must not speak as la-gram. The tool's name, its build identity and its asset
   location come from the caller. This holds from K02; until then, la-gram's names remain (see `tasks.md`, *Queued
   for K02*).

## Consumer integration after L01

la-gram and the workspace install the same qualified kernel archive. Shared model fixes and asset updates are made
and tested here, then delivered by a package update with each consumer's lockfile. Do not copy modules into a
consumer or edit an installed package. la-gram's `.agents/tasks/kernel-migration/api-usage.md` inventories its
module calls for K02; that task records compatibility checks and each integration change's reason.

## Code Conventions

la-gram's code conventions apply to the code here, as written in `la-gram/.agents/conventions.md` (*Code
Conventions*). In particular:

- model data in the store's default graph;
- IRIs minted only through `rdf-engine/iri.ts`;
- language-tagged labels;
- terms from `model-manager/vocabulary.ts`;
- a `collect…` twin for every undoable removal;
- no blank nodes in model data;
- comments that say *why* and name the requirement or design decision.

Also:

- **No path aliases.** Modules import each other relatively, with `.js` extensions, as they do now.
- **The bundled metamodels** in `assets/` are byte-identical copies of their meta source. Refresh them with
  `npm run sync-assets`; never edit them here.

## Tech Stack

- **Language:** TypeScript 5 strict, ES2020 modules, `moduleResolution: bundler`. The package is published as source
  (KD-2).
- **RDF:** Oxigraph 0.5 (WASM), n3 2.13.12 (pinned exactly: `rdf-engine/turtle-writer.ts` overrides one of its
  internals), rdf-validate-shacl 0.5.
- **Test:** Vitest 4, in Node, with fast-check for the property tests.

## File Structure

```
src/
  index.ts             provisional entry: each module as a namespace (KD-5)
  rdf-engine/          store, observable wrapper, IRIs, parser/serializer, canonical Turtle, SHACL, validation worker
  metamodel-manager/   asset sources, loader, catalogue, palette, notation, viewpoints, SHACL property descriptors
  model-manager/       session, namespace, element/relationship/view managers, RDF edits, cascade, diff, merge, questions
  import-export/       model-io.ts only: reading and writing model files
  types/               build-flags.d.ts, the build-time globals the modules read (until K02)
  storage-scope.ts     the browser storage names by la-gram's channel; version-history.ts needs it (until K02)
  __tests__/           sync-assets.test.ts, and fixtures/merge and fixtures/diff (the seed of the conformance suite)
assets/                bundled metamodels, laid out as meta.linked.archi
scripts/               sync-assets.mjs (refresh assets/), bench-model.mjs (generated models for the timing tests)
```

## Workflow

- **Specs are living documents.** A change and the documents that describe it go in together.
- **Task folders.** A piece of work another person or agent may continue gets a folder, `.agents/tasks/<name>/`,
  written before the work.

### Finishing a change

1. **Tests.** `npm run typecheck` and `npm test`. A fixed bug gets a test that fails without the fix.
2. **Consumers:** update the installed archive and lockfiles together, and run the relevant la-gram and workspace conformance checks.
3. **`specs/kernel/`**: a requirement changed or added (KReq n.m); a decision made for a reason (KD-n); the
   checklist and an entry at the top of the change log in `tasks.md`.
4. **The bundled assets**, when the change needs meta's: `npm run sync-assets`.
