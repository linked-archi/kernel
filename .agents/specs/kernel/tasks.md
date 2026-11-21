# Tasks: linked-archi-kernel

`(KReq n.m)` points at `requirements.md`; `(Req n.m)` at la-gram's requirements.

---

## K01 Repository, copy, build, tests

**2026-11-20: copied and written, not yet verified.** Node and Git are not reachable from the assistant's
sandbox, so nothing has been installed, type-checked or run, and the history is not imported. Next:

1. `npm install`, `npm run typecheck`, `npm test`;
2. commit `package-lock.json`;
3. import the history (`.agents/tasks/import-from-la-gram/`).

- [x] Repository and `.agents` (conventions, requirements, design, plan, tasks), `.kiro` links, README, `AGENTS.md`, `CLAUDE.md` (2026-11-20)
- [x] Licence: Apache-2.0 (PD-04), `LICENSE` copied from la-gram, `NOTICE` (2026-11-20)
- [x] Copied from la-gram's `basic-interaction` working tree: 413 files, byte for byte except one test; manifest in `.agents/tasks/import-from-la-gram/copy-manifest.json` (2026-11-20)
- [x] `turtle-writer.test.ts` adapted: checks the kernel's n3 pin, no longer la-gram-git's (2026-11-20)
- [x] Static checks: every relative import and every `new URL('../…')` path in `src/` resolves inside the repository; every file the bundled-asset registry names is in `assets/` (2026-11-20)
- [x] `package.json` (source package, exports, n3 pinned at 2.13.12), `tsconfig.json` (la-gram's options), `vitest.config.ts` (unit, then timing), `src/index.ts`, CI *(written)*
- [x] Where bundled metamodels ship: in the kernel (KD-3) (2026-11-20)
- [ ] `npm install`; commit `package-lock.json`
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes: 49 test files, unit then timing
- [ ] History imported, matching the copy file for file (`.agents/tasks/import-from-la-gram/`)
- [ ] `npm pack`; the tarball installs in an empty project and `import { rdfEngine } from '@linked-archi/kernel'` runs under Vitest there

## Queued for K02

Findings from K01, recorded 2026-11-20, not started:

- [ ] **The browser asset base is a setting.** `assetUrl()` resolves `assets/…` against `document.baseURI`. In a
  workspace embedded in a host page, that base is the host's page, not where the workspace serves its assets
  (workspace WD-7). Needed by W02.
- [ ] **How the validation worker is created.** It is created as `new Worker(new URL('./validation.worker.ts',
  import.meta.url))`. In development, Vite needs `{ type: 'module' }` for a worker that imports modules. Check
  with W02's first run; let the caller create the worker if bundlers disagree.
- [ ] **Provenance names la-gram as the software agent.** `model-manager/provenance.ts` writes `LA_GRAM_HOME`,
  `modellerIri()` and `__LA_GRAM_BUILD__`. Edits made in the workspace would be recorded as la-gram's. The agent
  must come from the caller (KReq 8.3).
- [ ] **Kernel-neutral build flags**, in place of `__LA_GRAM_ASSETS_VERSION__` and `__LA_GRAM_BUILD__`.
- [ ] **The 14 tests that stayed in la-gram:** rewrite any that test kernel behaviour on the kernel's API.
- [ ] **The conformance suite**, seeded from `src/__tests__/fixtures/merge` and `diff` (KReq 1.4, PD-08).
- [ ] **The public API**, from the calls W03, W04 and L01 list; narrow the exports (KD-5).
- [ ] **Publication** to the GitLab package registry.

## Known limitations

- **Unverified:** see K01.
- **The kernel still speaks as la-gram** in provenance and in its build-flag names, until K02.
- **No compiled build:** consumers need a TypeScript-aware bundler or runner (KD-2).

## Change log

- **2026-11-21. Finding and re-pointing references to other views (la-gram Req 3.23, VR-DD-2, VR-DD-4).**
  - **`interfaces.ts`:** `ViewReferenceInfo`, a reference and the view it is drawn in; `ViewManager.referencesTo`,
    `setReferenceView` and `setReferenceViewQuads`, optional as the other figure methods are.
  - **`view-manager.ts`:** `referencesTo(view)` lists the references that open a view, in every view, each with its
    holder. `setReferenceView(holder, node, view)` points one at another of the model's views and moves the
    presence by the rule `addFigure` and `collectNodeQuads` follow: the view it opened leaves the holder with its
    last reference there, and the new one is presented there unless it is the holder. Its text of its own stays.
    `setReferenceViewQuads` reads what it removes and adds before anything changes, so the change is one recorded
    step to undo. Nothing changes for a node that is no reference of the holder, or a view the model lacks.
  - Made in la-gram as well, file for file (its VR-DD-6): `interfaces.ts`, `view-manager.ts` and
    `view-manager.test.ts` are identical in both. Checked: `npm run typecheck`, `npm test` (49 files, 811 tests).

- **2026-11-21. References to other views (core-vis 0.9; la-gram Req 3.23, DD-42).**
  - **Vocabulary:** `ViewReferenceNode` and `referencesView`. **Figures:** `FigureKind` gains `reference`, its view
    `FigureInfo.view`.
  - **`view-manager.ts`:** a reference is read and written as a figure; its view's `arch:inView` is written with
    its first reference in a view and taken with its last; deleting a view deletes the references to it, in the
    same undo twin (`collectViewQuads`). **`placement-copy.ts`:** one pasted into a model without its view is a
    note. **`iri-conformance.ts`, `model-diff.ts`:** the class is a node type and a shape type.
  - Made in la-gram as well, file for file, as the copy rule asks: the five files and `view-manager.test.ts`
    are identical in both; `model-diff.ts` differs as before, by la-gram's later provenance work.

- **2026-11-20. Repository started (K01).**
  - **Copied** from la-gram (branch `basic-interaction`), at the same paths: `rdf-engine`, `metamodel-manager`,
    `model-manager` and `import-export/model-io.ts`, with 49 test files; the merge and diff fixtures; the asset sync
    and its test; the benchmark model generator; `assets/`. 14 tests stayed in la-gram because they need its
    application.
  - **Adapted:** `turtle-writer.test.ts` checks the kernel's n3 pin only.
  - **Written:** the package, CI and specifications.
  - **Decisions:** KD-1 to KD-5.
