# linked-archi-kernel

`@linked-archi/kernel`: the model logic shared by [la-gram](https://github.com/linked-archi/la-gram) and the
Linked.Archi workspace. Its repository: <https://github.com/linked-archi/kernel>. It covers:

- loading Linked.Archi metamodels and selecting language-tagged labels from ontologies and taxonomies;
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

The kernel's clean CI and packed installs are recorded in the task log. The workspace browser suite verifies
complete RDF handoffs with la-gram on ArchiMate 4.0, declared ArchiMate 3.2 and a Studio-generated extension.

- **Source:** model modules and assets are maintained here; la-gram holds no independent implementation.
- **App-dependent tests:** 14 integration tests and their Basic fixture remain in la-gram's `src/__tests__/kernel/`.
- **History:** the [K01 ancestry check](.agents/tasks/import-from-la-gram/README.md) verifies the 98 inherited
  la-gram commits and the first kernel commit.
- **Public API:** the package export map lists the supported consumer module paths. Application sessions live in
  their consumers. Shared SHACL descriptors and RDF edits are available through the kernel.
- **Acceptance:** the full E1/A matrix also includes workspace inventory and accessibility. Shared versioned
  persistence and live collaboration have their own acceptance checks.

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
import { diffModels } from '@linked-archi/kernel/model-manager/model-diff.js';
```

Until K02 publishes a version, a consumer installs the tarball `npm pack` makes here:

```json
"@linked-archi/kernel": "file:vendor/linked-archi-kernel-0.1.4.tgz"
```

**Do not link the folder** (`file:../linked-archi-kernel`). The link brings this repository's own `node_modules/`,
so the consumer gets two copies of n3 and Oxigraph, whose terms and stores do not mix (la-gram's
`.agents/tasks/kernel-migration/design.md`, KM-DD-2).

The package is TypeScript, so each tool compiles it:

| Tool | Setting |
|---|---|
| Vitest | `test.server.deps.inline: ['@linked-archi/kernel']`, or Node is asked to load `.ts` |
| Vite | `optimizeDeps.exclude: ['@linked-archi/kernel', 'oxigraph']`, so the worker and asset URLs are not pre-bundled away, **and** `optimizeDeps.include: ['@linked-archi/kernel > n3', '@linked-archi/kernel > rdf-validate-shacl', '@linked-archi/kernel > rdf-validate-shacl > rdf-literal', '@linked-archi/kernel > rdf-validate-shacl > debug']`. Without the include, the dev server sends the CommonJS libraries the kernel uses unconverted, and the page fails with *does not provide an export named 'fromRdf'*. Production builds are not affected |
| webpack | let `ts-loader` compile it in `node_modules`: `allowTsInNodeModules`, and an `exclude` that spares it |
| A Node command-line bundle | bundle the kernel, rather than leaving it an external import |

The bundled metamodels are in `assets/`, laid out as `https://meta.linked.archi/` is (KD-3):

- **In Node**, they are found beside the package.
- **In a browser**, the application copies `node_modules/@linked-archi/kernel/assets/` into its build, as
  `assets/`.

The `@linked-archi/kernel/conformance` entry tests a consumer's real open, save and validation path against
the bundled ArchiMate 4.0 fixture. Pass `runShopConformance` a file reader and an adapter that returns the
opened model IRI, metamodel IRIs, canonical TriG and validation findings. `conformanceFindings` projects the
validator's RDF terms to the comparison format. The kernel and both applications use it in their unit suites.

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
