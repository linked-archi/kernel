# Tasks: linked-archi-kernel

`(KReq n.m)` points at `requirements.md`; `(Req n.m)` at la-gram's requirements.

---

## Workspace integration verification — 2026-11-24

- [x] Owner step 3: removed the copy-transition section from conventions; README/design/plan describe the installed
  package and retained application tests. la-gram's migration task owns its API usage inventory. Remaining K01
  history and K02 publication work are not marked complete.


The owner requested checks before the migration commits, then documentation, then moving application-specific
`src/workspace/` code out of this package. This records executable evidence; it does not close K01 history import,
K02 API publication, or the PD-17 two-tool gate.

- [x] Re-read platform PD-16/PD-17 and workspace WD-15: any chosen metamodel; fixed screens; Studio authors extensions.
- [x] `npm run typecheck` passed on the `0cee219` code checkpoint.
- [x] `npm test` passed: **51 files, 844 tests** (including seven editor/fixture checks).
- [x] Both consumers install the same `vendor/linked-archi-kernel-0.1.0.tgz`; their lockfiles pin its integrity.
- [x] Workspace browser handoff opens, edits, saves, imports into la-gram, renames on its canvas, imports back,
  and compares all RDF quads. The strict CSP workspace reports no errors.
- [ ] Follow-up requested by owner: retain tool-neutral model/SHACL parts under neutral names and move the
  application session from `src/workspace/` to the workspace repository (step 4).
- [ ] E1/A remains open: complete the ArchiMate 3.2 and Studio-generated extension matrix, plus remaining inventory,
  forms and performance criteria. No gate is inferred from the mocks.

## K01 Repository, copy, build, tests

**2026-11-23: synced with la-gram again; checks to run again.**

- **First run.** `npm test` passed on 2026-11-21: 49 test files, 47 unit and 2 timing, none failed. It ran before the
  sync below, so it no longer counts.
- **The sync.** la-gram's changes of 2026-11-21 had reached only some of the copied files. Six files and the new
  `src/storage-scope.ts` were copied from la-gram's `pre-release` branch.
- **Oxigraph** is pinned at 0.5.11, as la-gram's lock has it. The install had taken 0.5.13.

Next:

1. `npm install`, which replaces Oxigraph 0.5.13 in `node_modules`;
2. `npm run typecheck`, `npm test`, `npm pack`;
3. the tarball in an empty project (below);
4. commit `package-lock.json`;
5. import the history (`.agents/tasks/import-from-la-gram/`).

- [x] Repository and `.agents` (conventions, requirements, design, plan, tasks), `.kiro` links, README, `AGENTS.md`, `CLAUDE.md` (2026-11-20)
- [x] Licence: Apache-2.0 (PD-04), `LICENSE` copied from la-gram, `NOTICE` (2026-11-20)
- [x] Copied from la-gram's `basic-interaction` working tree: 413 files, byte for byte except one test; manifest in `.agents/tasks/import-from-la-gram/copy-manifest.json` (2026-11-20)
- [x] `turtle-writer.test.ts` adapted: checks the kernel's n3 pin, no longer la-gram-git's (2026-11-20)
- [x] Static checks: every relative import and every `new URL('../…')` path in `src/` resolves inside the repository; every file the bundled-asset registry names is in `assets/` (2026-11-20)
- [x] `package.json` (source package, exports, n3 pinned at 2.13.12), `tsconfig.json` (la-gram's options), `vitest.config.ts` (unit, then timing), `src/index.ts`, CI *(written)*
- [x] Where bundled metamodels ship: in the kernel (KD-3) (2026-11-20)
- [x] Synced with la-gram's `pre-release` (2026-11-23): `model-diff.ts`, `model-diff-text.ts`, `provenance.ts`, `version-history.ts`, `build-flags.d.ts`, `model-diff.test.ts`, and `src/storage-scope.ts`, which `version-history.ts` now imports. Every copied file now matches la-gram's, except the one adapted test
- [x] Oxigraph pinned at `0.5.11` in `package.json` and `package-lock.json`, as la-gram's lock has it (2026-11-23)
- [x] `npm install` (2026-11-20)
- [ ] `npm install` again, for Oxigraph 0.5.11; `npm ls oxigraph n3` shows 0.5.11 and 2.13.12, one copy each; commit `package-lock.json`
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes: 49 test files, unit then timing. It passed on 2026-11-21, before the sync; run it again
- [ ] History imported, matching the copy file for file (`.agents/tasks/import-from-la-gram/`)
- [ ] `npm pack` after the sync; the tarball installs in an empty project and `import { rdfEngine } from '@linked-archi/kernel'` runs under Vitest there, with `server.deps.inline: ['@linked-archi/kernel']`

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
- [ ] **Checkpoint storage is named for la-gram.** Recorded 2026-11-23. `version-history.ts` keeps checkpoints in an
  IndexedDB database named `la-gram-history`, through `storage-scope.ts` and la-gram's release channel. In the
  workspace, that would share a store with la-gram on the same origin. The name, or the store, must come from the
  caller. `storage-scope.ts` then goes back to being la-gram's alone, and L01 does not delete la-gram's copy.
- [ ] **The 14 tests that stayed in la-gram:** rewrite any that test kernel behaviour on the kernel's API.
- [ ] **The conformance suite**, seeded from `src/__tests__/fixtures/merge` and `diff` (KReq 1.4, PD-08).
- [ ] **The public API**, from the calls W03, W04 and L01 list; narrow the exports (KD-5).
- [ ] **Publication** to the GitLab package registry.

## Known limitations

- **Unverified:** see K01.
- **The kernel still speaks as la-gram** in provenance and in its build-flag names, until K02.
- **No compiled build:** consumers need a TypeScript-aware bundler or runner (KD-2).

## Change log

- **2026-11-23. Synced with la-gram; Oxigraph pinned.**
  - **What had drifted.** la-gram's work of 2026-11-21 (the edit record in the model diff, the Git account in
    provenance, the alpha/release storage channel) had reached eight of the copied files but not six others.
  - **Copied** from la-gram's `pre-release` branch: those six, and `src/storage-scope.ts`, which `version-history.ts`
    now imports. The copy manifest records it under `syncs`.
  - **Oxigraph** is pinned at 0.5.11, matching la-gram. The checks have to run again.
  - **Queued for K02:** the checkpoint storage name.
- **2026-11-23. ArchiMate's relationship hints name ArchiMate's classes (linked-archi-meta's DD-40).**
  - **Assets:** `archimate4-onto.ttl` and `archimate3.2-onto.ttl`, refreshed from meta: the hints of 4.0's
    Composition, Aggregation, Association and Specialization, and of every one of 3.2's relationships, name
    ArchiMate's own classes, where they named `arch:Element`. The relationship tables still decide what is offered.
  - **Comments** in `class-hierarchy.ts` and `relationship-manager.ts` no longer give ArchiMate as the example of a
    type a table governs whatever its hints name. Both files are la-gram's, file for file. No test changed.
- **2026-11-22. A language's relationship types for its own elements (la-gram Req 4.2, 4.21; linked-archi-meta's
  DD-40).**
  - **`relationship-manager.ts`:** `getValidRelationships` never offers a relationship class marked
    `arch:isAbstractClass true` (EDGY's Enterprise Relationship), the mark read from every graph. A type no shape
    covers whose hints name only core classes, or none, is offered only between elements of its own metamodel,
    which the new **`own-metamodel.ts`** works out: the documents a loaded manifest names as its concepts beside the
    one that declares the type, and what they import; else that document and its imports; else the type's
    namespace. So between elements of two languages the core's types are offered, where C4's Uses and EDGY's
    Enterprise Relationship were, while an extension's type that names `arch:ModelConcept` at one end still relates
    any concept there. Its reasons say so. **Comments** in `class-hierarchy.ts`, `interfaces.ts`, `catalogue.ts`
    and `bundled-assets.ts` no longer call Basic's Connection a relationship between any elements, and
    `relationship-table.ts` says that C4's and Backstage's relationship shapes, which meta now writes in the form
    ArchiMate's take, are read as relationship tables too.
  - **The assets:** `assets/basic/basic-onto.ttl` (Connection names Basic's three element types),
    `basic-tax.ttl` (an order of proposal: Aggregation, Connection, Association) and `basic-metamodel.ttl`, which
    names it; `assets/core/core-onto.ttl` and `core-notation.ttl`, whose notes cite DD-40, into which meta folded
    DD-43. All byte for byte linked-archi-meta's.
  - **Tests:** `cross-language-relationships.test.ts` (new: an abstract type, a type with core-only hints or none,
    the core's types between two languages and for a line drawn between them before, an extension's type, a
    metamodel's documents through its manifest and without one); `relationship-manager.test.ts` (a type with no
    hints relates its own namespace's elements).
  - Made in la-gram as well, file for file: the files above are identical in both. Checked: `npm run typecheck`,
    `npm test` (50 files, 835 tests); `node scripts/sync-assets.mjs --meta ../../../linked-archi-meta --check`
    (272 unchanged).
- **2026-11-22. Questions about dependencies, across languages (la-gram Req 16.4; linked-archi-meta's DD-44).**
  - **The assets:** `assets/core/core-questions.ttl`, with `archq:what-depends-on-it` and
    `archq:what-it-depends-on`, which follow every predicate declared a subproperty of `arch:dependsOn`, and of
    `arch:dependencyOf` read the other way, two steps out; `assets/archimate4/archimate4-onto.ttl` and
    `assets/archimate3/archimate3.2-onto.ttl`, whose `serves` is a subproperty of `arch:dependencyOf`; and
    `assets/arch-decision/arch-decision-onto.ttl` (0.0.10), whose `dependsOn` is one of `arch:dependsOn`. All
    byte for byte linked-archi-meta's. No code changed: nothing in the kernel reads `rdfs:subPropertyOf`.
  - **Tests:** `questions-bench.test.ts` counts the two (40 questions with ArchiMate 4.0, 39 with 3.2), and each
    answers 350 000 triples within its limit.
  - Made in la-gram as well, file for file, where `questions.test.ts` also asks both questions of meta's example
    model. Checked: `npm run typecheck`, `npm test` (49 files, 827 tests);
    `node scripts/sync-assets.mjs --meta ../../../linked-archi-meta --check` (272 unchanged).

- **2026-11-22. Depends On, the core's dependency type (la-gram Req 4.21; linked-archi-meta's DD-40, core 0.7.0).**
  - **The assets:** `assets/core/core-onto.ttl` (0.7.0) and `assets/core/core-notation.ttl`, byte for byte
    linked-archi-meta's: `arch:DependsOn`, `arch:dependsOn`, its inverse `arch:dependencyOf` and
    `arch:qualifiedDependsOn`, from a concept to one it needs; the notation draws it dashed, with an open arrowhead
    at the concept depended on, and nesting does not draw it.
  - **`relationship-manager.ts`:** `CORE_ORDER` offers it second, after Association and before Has Part and
    Refines, where no loaded language relates the two. **Comments** in `bundled-assets.ts`, `notation-resolver.ts`
    and `interfaces.ts` name it.
  - **Tests:** `palette-generator.test.ts` (one of the core's types, its dashed line, no nesting),
    `model-session.test.ts` (a bare `arch:dependencyOf` adopted as a Depends On from the dependent, its
    `arch:dependsOn` stated).
  - Made in la-gram as well, file for file: the files above are identical in both. Checked: `npm run typecheck`,
    `npm test` (49 files, 827 tests); `node scripts/sync-assets.mjs --meta ../../../linked-archi-meta --check`
    (272 unchanged).

- **2026-11-22. The core notation describes the core's three relationship types (la-gram Req 2.25, 3.23, 4.21;
  VC-DD-5; linked-archi-meta's DD-42).**
  - **The asset:** `assets/core/core-notation.ttl`, still 0.1.0, byte for byte linked-archi-meta's. Beside Refines'
    descriptor, one for `arch:Association` (a solid line, nothing at either end, not drawn by nesting) and one for
    `arch:HasPart` (a solid line, an open arrowhead at the part, `arch-vis:nestedEnd arch-vis:TargetEnd`: the part
    inside the whole). The lines are those a relationship type with no notation was drawn with already.
  - **Comments** in `bundled-assets.ts`, `notation-resolver.ts` and `palette-generator.ts` name the three; no code
    changed.
  - **Tests:** `palette-generator.test.ts` — each of the three from the core set, Has Part's and Refines' nested
    ends, Association's none; Has Part's nesting where the language has no notation.
  - Made in la-gram as well, file for file: the files above are identical in both. Checked: `npm run typecheck`,
    `npm test` (49 files, 826 tests); `node scripts/sync-assets.mjs --meta ../../../linked-archi-meta --check`
    (272 unchanged).

- **2026-11-21. A view as a model concept, and the core's own notation (la-gram Req 3.23, DD-42; VC-DD-1, VC-DD-5,
  VC-DD-6, VC-DD-7).** A reference to a view is the view's placement, as an element's box is the element's.
  - **`view-manager.ts`:** a reference node's concept is the view it opens. A link may end on one, its end the view
    (`conceptOf`); a view's IRI keys its references in a view, as an element's IRI keys its boxes (`nodeIrisFor`,
    so `getNode`, `removeElementFromView` and `addRelationshipToView` take it); `placedIn` and `viewsContaining`
    count them. `collectViewQuads` takes the relationships the view is an end of, as an element's go with it, and
    a concept's `arch:refinedInto` it. `setReferenceViewQuads` takes the lines of the old view's relationships at
    the node, and keeps lines standing for no relationship. New: `viewsRefining(concept)`, the views with
    `V arch:refines concept` or `concept arch:refinedInto V`, by name. **`interfaces.ts`:** `viewsRefining`,
    optional. **`vocabulary.ts`:** `refines`, `refinedInto`.
  - **The core notation:** `assets/core/core-notation.ttl` (`https://meta.linked.archi/core-notation#`, 0.1.0),
    byte for byte linked-archi-meta's, bundled with the core (`coreNotation`, `bundled-assets.ts`). Its one set
    draws `arch:Refines` and lets nesting draw it, the refining view inside. **`notation-resolver.ts`:**
    `coreNotationSetIris`, its sets; **`palette-generator.ts`** consults them after every loaded metamodel's
    default set; **`notation.ts`:** never the set a palette is styled by (`CORE_NOTATION_NS`).
  - **Tests:** `view-manager.test.ts` (a view's placement, its relationships deleted with it and back, the old
    view's lines on re-pointing, `viewsRefining`), `palette-generator.test.ts` (Refines and its nesting, never the
    active set), `bundled-assets.test.ts`, `clipboard.test.ts` (a relationship with a view, copied and pasted).
  - Made in la-gram as well, file for file: the files above are identical in both. Checked: `npm run typecheck`,
    `npm test` (49 files, 826 tests); `node scripts/sync-assets.mjs --meta ../../../linked-archi-meta --check`
    (272 unchanged). Until linked-archi-meta publishes the core notation, an online sync cannot fetch it.

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
  - **Then:** `addFigure` writes a figure's text when it is given at all, an empty one too: a reference whose text
    was emptied keeps it, and draws nothing, where one with none of its own shows its view's name. Copied with its
    view, it stays so. Checked again: 49 files, 812 tests.

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
