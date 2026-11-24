# linked-archi-kernel

`@linked-archi/kernel`: the model logic shared by [la-gram](../../modellers/la-gram/README.md) and the Linked.Archi
workspace. It covers:

- loading Linked.Archi metamodels;
- deciding which relationships the shapes permit;
- minting IRIs;
- creating, changing and deleting elements, relationships and views with exactly the triples la-gram writes;
- diff and three-way merge;
- SHACL validation;
- model questions;
- reading and writing model files in six RDF formats, with canonical Turtle.

Because both tools run this code, a model one of them saves is a model the other would have saved (platform
decision PD-14).

## Status

**K01: copied from la-gram and synced again on 2026-11-23; to type-check, test and pack again.** The first test run, on 2026-11-21, passed: 49 test files.

- **Source.** The modules are la-gram's `rdf-engine`, `metamodel-manager` and `model-manager`, with `model-io`, at
  the same paths and byte for byte. They come from la-gram's branch `basic-interaction` on 2026-11-20.
- **Tests.** 49 of their test files come with them. One is adapted, `turtle-writer.test.ts`, so that it no longer
  reads la-gram's repository layout.
- **Left behind.** 14 tests stay in la-gram, because they need its application.
- **History.** The Git history is not imported yet: see `.agents/tasks/import-from-la-gram/`.
- **Public API.** It is provisional until K02, which freezes it from what the workspace and la-gram actually call.

| To read | Where |
|---|---|
| What the kernel guarantees | [`.agents/specs/kernel/requirements.md`](.agents/specs/kernel/requirements.md) |
| How it is packaged, and why | [`.agents/specs/kernel/design.md`](.agents/specs/kernel/design.md) |
| What happens next | [`.agents/specs/kernel/plan.md`](.agents/specs/kernel/plan.md) and [`tasks.md`](.agents/specs/kernel/tasks.md) |
| How to work on it | [`.agents/conventions.md`](.agents/conventions.md) |

## Use

The package is published as TypeScript source (KD-2): a bundler (Vite, webpack) or a test runner (Vitest) compiles it
with the consumer's code.

```ts
import { modelManager, rdfEngine } from '@linked-archi/kernel';
import { diffModels } from '@linked-archi/kernel/model-manager/model-diff.js'; // any module file, until K02
```

Until K02 publishes a version, a consumer installs the tarball `npm pack` makes here:

```json
"@linked-archi/kernel": "file:../linked-archi-kernel/linked-archi-kernel-0.0.0.tgz"
```

**Do not link the folder** (`file:../linked-archi-kernel`). The link brings this repository's own `node_modules/`,
so the consumer gets two copies of n3 and Oxigraph, whose terms and stores do not mix (la-gram's
`.agents/tasks/kernel-migration/design.md`, KM-DD-2).

The package is TypeScript, so each tool compiles it:

| Tool | Setting |
|---|---|
| Vitest | `test.server.deps.inline: ['@linked-archi/kernel']`, or Node is asked to load `.ts` |
| Vite | `optimizeDeps.exclude: ['@linked-archi/kernel']`, so its worker and asset URLs are not pre-bundled away |
| webpack | let `ts-loader` compile it in `node_modules`: `allowTsInNodeModules`, and an `exclude` that spares it |
| A Node command-line bundle | bundle the kernel, rather than leaving it an external import |

The bundled metamodels are in `assets/`, laid out as `https://meta.linked.archi/` is (KD-3):

- **In Node**, they are found beside the package.
- **In a browser**, the application copies `node_modules/@linked-archi/kernel/assets/` into its build, as
  `assets/`.

## Develop

Use Node 22 or later.

```sh
npm install          # once; commit the package-lock.json it writes
npm run typecheck
npm test             # unit tests, then the timing tests alone
npm run sync-assets  # refresh assets/ from meta.linked.archi (--check compares, --meta <checkout> uses a local one)
npm run pack:check   # what the package would contain
```

## Licence

Apache License, Version 2.0 ([LICENSE](LICENSE)); the metamodel files keep the licences they state ([NOTICE](NOTICE)).
