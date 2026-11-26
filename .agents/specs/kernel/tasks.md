# Tasks: linked-archi-kernel

`(KReq n.m)` points at `requirements.md`; `(Req n.m)` at la-gram's requirements.

---

## Drawing order — 2026-11-26

For la-gram's release after 0.4.0 (la-gram's `.agents/tasks/drawing-order/`).

- [x] Sync core-vis 0.10 and core-vis-shapes 0.6.0 from meta: `arch-vis:zOrder`, an integer on a node. The asset check
  found only those two files differ; the catalogue is unchanged (KReq 3.3).
- [x] `NodeInfo.zOrder`, read with the node; `setNodeZOrder`, by node IRI, an `xsd:integer`, none for 0; copied by
  `copyPlacements` (*Duplicate view*, paste); one value in a merge, with the bounds in the built-in limits
  (KReq 4.7) — *view-manager.test, single-valued.test*
- [x] `drawing-order.ts`: `compareDrawingOrder`, `sortByDrawingOrder`, `reorder` — front, back, one step forward or
  backward — exported from `modelManager` (KReq 4.7) — *drawing-order.test*, with property tests that a step changes
  places only with the node it passes and that front and back keep each group's order
- [x] Typecheck and the unit tests: 52 files, 863 tests
- [ ] Package it with the next kernel version, and install it in la-gram and the workspace

## K02b shared package candidate — 2026-11-26

- [x] Replace the provisional wildcard with 78 explicit package entries plus the bundled asset pattern.
  The map covers the current application and Studio imports and the supported barrels. A clean install
  resolved the entries and all 272 asset files. The 14 retained la-gram tests still use application code.
- [x] Export `@linked-archi/kernel/conformance` and run the bundled shop fixture through normal model open,
  save and validation in the kernel and both applications. The runner verifies model and metamodel IRIs,
  canonical TriG and three pinned SHACL results. Each repository's existing unit-test job includes the test.
- [x] Build `0.1.5-k02b.0` from kernel `7f17a3a` plus `package.json`, `README.md`, `src/conformance.ts`
  and `src/__tests__/conformance.test.ts` from this task. In the isolated source tree, set the version using
  `npm version 0.1.5-k02b.0 --no-git-tag-version --ignore-scripts` and pack with `npm pack --ignore-scripts`
  (Node 26.13.1 and npm 11.20.0). The archive has 363 files and SHA-256
  `7781026305766c8b8f0b3cd2e20bba6171b625fb3bdc472e255cc57a5b387b41`.
  Repacking the same source with those tool versions produced identical bytes.
  The bundled ArchiMate 3.2 ontology matches meta `9a8dd0b` (SHA-256
  `5ed7f2856c30262cb82e7d50e87f4d6797fd7ec932f509dec291881c437cc051`).
  The in-progress drawing-order work is qualified separately.
- [x] Install that archive in both consumers. Each resolves one copy of n3 and Oxigraph. The isolated
  candidate passed typecheck and 856 kernel tests, including timing tests. la-gram's typecheck, web,
  Electron and CLI builds, and la-gram-git package and model checks passed. Clean installs with both
  consumer lockfiles passed. The kernel CI steps passed locally on Node 22.23.5 and npm 10.9.9
  with 853 unit tests and a 363-file pack dry-run.
- [x] The matched browser builds passed all 23 workspace interoperability checks, including declared
  ArchiMate 3.2 and the Studio extension. The 3.2 check compares both built ontology files to the installed
  kernel asset. la-gram `c0d399f` passed 2,069 tests and all 97 browser checks, including two Electron checks.
  The workspace passed 76 tests and 15 strict-CSP host checks.
- [ ] Review the candidate and choose the publication registry. Publish the approved version and run both
  consumers on the published artifact. Kotlin validator parity and wider Studio engine checks follow.

The local workspace already supplies its asset base, validation worker, software identity and storage scope.
la-gram's compatibility defaults still provide the asset cache version, provenance identity and the same
channel-scoped IndexedDB history. Move those values to its call sites before removing the fallback names.

## Nested SHACL forms and owned resources — 2026-11-26

- [x] Read conjunctive named and anonymous `sh:node` targets directly. Keep the singular descriptor field
  for existing consumers. Report unsupported paths and recursive or malformed forms (KReq 3.4).
- [x] Mint named parts and verify explicit ownership, model membership and competing references before edits.
  Exact removals preserve shared parts, branches and unrecognised predicates, types and RDF terms (KReq 4.6).
- [x] Typecheck and run all 855 kernel tests on the draft package source. Compare archive contents with
  the reviewed 0.1.4 package. All 272 assets and all fixtures match. The draft `0.1.5-w04.0` SHA-256 is
  `def9927ba0103fb5a1963721b189fd041364fd4fb72a1390123b48d06cf16e16`.
- [x] Install the same archive in the workspace and an isolated la-gram build. The browser harness verifies
  exact change-set replay, undo, bidirectional RDF and unlinking a shared resource. All 93 la-gram web tests
  passed. The browser-only build skipped two Electron smoke tests.
- [x] The workspace interoperability suite generated a pinned ArchiMate 4.0 extension through Studio and
  both browsers passed the edited RDF handoff on the draft archive (2026-11-26).
- [ ] Freeze and publish the shared API through K02b. Qualify the final release candidate in both apps.

## SHACL presentation in the draft 0.1.4 package — 2026-11-25

- [x] Remove the field-presence calculator and its weight vocabulary. Keep tool-neutral SHACL property
  descriptors, language selection and validation. The descriptor tests cover section order and conflicting orders.
- [x] Sync the restored core ontology and shapes and the edited default element shapes. The asset check found
  all 272 mapped files match the meta checkout.
- [x] Typecheck and 841 tests passed across 52 files. Both apps install the same draft archive with SHA-256
  `69ec56c0a6fb4b988a5dae789f1f9b041ff3a2b6f08d213f52cbdaf79c136a88`.
  The final repack trims one trailing blank line from the browser-tested payload.
- [x] Recheck against the reviewed meta revision `d46b2c1`. All 272 mapped files match, and the two installed
  consumer archives are byte-identical.
- [x] Repack from kernel `b96d741` and compare to the pinned file in both apps. The SHA-256 above matches.
  A fresh temporary project installed the archive and Vitest 4.1.12 on Node 26.13.1. The smoke test used the
  package root, loaded the core and ArchiMate 4.0 assets offline, and read the authored SHACL field sections.
  `npm ls n3 oxigraph --all` showed one copy of each. Source typecheck and all 841 tests passed again.

## RDF labels in the draft 0.1.3 package

- [x] Remove the dedicated terminology reader and vocabulary constants. Refresh the three matching semantic
  assets from the meta working tree.
- [x] Use a shared language selector for authored model, ontology, taxonomy and property-shape labels. The palette
  accepts a preferred language. The workspace supplies its locale and la-gram uses the existing English preference.
- [x] Typecheck and 841 tests passed. A non-ArchiMate metamodel test checks regional and base language selection
  for ontology types and relationships, and taxonomy axes and groups.
- [x] Both apps installed the same local archive (SHA-256
  `f55c045892169290977d990fcd196efdbdd2d2a55f4bc60e02d2957d75aecd98`). Review the working-tree diff
  before committing or publishing the changes.

## S01 presentation contract — 2026-11-25

- [x] Sync the four source assets from linked-archi-meta commit `0a9d774` (core 0.8.0, core shapes 0.5.0 and
  ArchiMate 4.0).
- [x] Read sections and field order independently. Preserve inherited presentation metadata and disclose
  conflicts. Resolve localised element terms from the loaded manifests and calculate optional completeness
  by property path. The untyped resource case returns no type-specific descriptors.
- [x] Typecheck and 52 files / 840 tests passed, including the timing project. Earlier timing overruns were
  reproduced on the prior commit under the same machine load. No timing criteria changed.
- [x] Pack 0.1.2. Both consumers verified its matching lockfile integrity and SHA-256
  `fa5e5d9a682061fc32e782892b7afeb9b2d36773cd38f3eea48a97f1c15d0a96`.

The default interoperability fixture documents the qualified Payments → Gift wrapping relation. Its three
informational findings stay pinned. The source package keeps neutral metadata and RDF operations. The
workspace determines how it displays them.

## Workspace integration verification — 2026-11-24

- [x] Owner step 3: removed the copy-transition section from conventions; README/design/plan describe the installed
  package and retained application tests. la-gram's migration task owns its API usage inventory. Remaining K01
  history and K02 publication work are not marked complete.


The owner requested checks before the migration commits, then documentation, then moving application-specific
`src/workspace/` code out of this package. This records executable evidence; it does not close K01 history import,
K02 API publication, or the PD-17 two-tool gate.

- [x] Re-read platform PD-16/PD-17 and workspace WD-15: any chosen metamodel; fixed screens; Studio authors extensions.
- [x] `npm run typecheck` passed on the `b9c940c` code checkpoint.
- [x] `npm test` passed: **51 files, 844 tests** (including seven editor/fixture checks).
- [x] Both consumers install the same `vendor/linked-archi-kernel-0.1.0.tgz`; their lockfiles pin its integrity.
- [x] Workspace browser handoff opens, edits, saves, imports into la-gram, renames on its canvas, imports back,
  and compares all RDF quads. The strict CSP workspace reports no errors.
- [x] Owner step 4: `src/workspace/` removed. Neutral `property-shapes` and `resource-edits` remain here;
  session/recovery/history and seven integration tests moved to the workspace. Fixtures renamed `interoperability`.
  Package 0.1.1 passes typecheck and **52 files / 839 tests**; the missing seven now run in the consumer.
  Source declarations include their ambient build types; asset factory accepts optional bundled URL options.
  Both consumers pass typecheck, units, builds, host/modeller browser suites and the bidirectional handoff;
  la-gram-git passes documentation/smoke checks, including an isolated installed package.
- [ ] E1/A remains open for the Studio-generated extension and remaining inventory, form and performance criteria.
  The local ArchiMate 3.2 handoff is covered by the browser evidence.

## K01 Repository, copy, build, tests

**2026-11-26.** K01 source history and clean CI are verified. The source package at `7f17a3a` still declares
`0.1.4`. Its package and the staged `0.1.5-w04.0` consumer preview were checked separately.

- **First run.** `npm test` passed on 2026-11-21: 49 test files, 47 unit and 2 timing, none failed. It ran before the
  sync below, so it no longer counts.
- **The sync.** la-gram's changes of 2026-11-21 had reached only some of the copied files. Six files and the new
  `src/storage-scope.ts` were copied from la-gram's `pre-release` branch.
- **Oxigraph** is pinned at 0.5.11, as la-gram's lock has it. The install had taken 0.5.13.

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
- [x] `npm ls oxigraph n3` shows 0.5.11 and 2.13.12, one copy each. The lockfile is committed in `b96d741`.
- [x] `npm run typecheck` passes on `b96d741`.
- [x] `npm test` passes on `b96d741` (52 files, 841 tests).
- [x] Verified all 98 inherited commits against the filtered la-gram history, with all 429 entries at its tip
  matching by path, mode and blob. The first kernel commit and the follow-up sync match the expected
  exceptions recorded in the [history audit](../../tasks/import-from-la-gram/README.md).
- [x] `npm pack` and the empty-project Vitest check pass on `b96d741`, with the exact consumer archive.
- [x] The checks on GitHub Actions (`.github/workflows/kernel.yml`): typecheck, the unit tests and `pack:check` pass on `main` at `894c295` (2026-11-25).
- [x] GitHub Actions on `7f17a3a27bc6a573116c91e23da7e0d904ec1dde` passed locked install, typecheck,
  852 unit tests across 51 files and `pack:check` (362 files) on Node 22.23.5 and npm 10.9.9.
  A clean macOS ARM64 rehearsal with the same versions passed the same four steps and produced the
  same package SHA-1 `179b1500c7fdf89916c1beee361d8901407c9e72`.
  [GitHub Actions check](https://github.com/linked-archi/kernel/actions/runs/45754850667/job/139690964871)
- [x] Repack `7f17a3a` from a fresh source tree and install it in an empty Vitest project. Repeat with the
  workspace's W04 preview in a separate project. Both consumers loaded core, the ArchiMate 4.0 metamodel
  and its authored field sections offline with one `n3@2.13.12` and `oxigraph@0.5.11` each. The archive
  matching CI has SHA-256 `6a8f8a892a5226918ee1701b729a70c9b53d230821f406d3b143ab7fb1b50068`.
  npm 10.9.9 installed the kernel alone and hit `edgesOut` while resolving the Vitest harness. The smoke
  test against those same package bytes passed with Node 22.23.5, npm 11.20.0 and Vitest 4.1.12.
- [x] Audit the asset difference between `7f17a3a` and the W04 preview. All 362 package paths match.
  Three files have changed bytes: `README.md`, `package.json`, and `assets/archimate3/archimate3.2-onto.ttl`.
  The RDF diff consists of a changed `dct:modified` date plus 71 removed and 60 added `arch:prefVisNotation`
  statements. The K02b candidate above uses the committed asset and passes the ArchiMate 3.2 browser case.

## Queued for K02

- [x] Support a caller-supplied browser asset base, validation worker, provenance agent and IndexedDB name.
  Qualify these seams with the local workspace and the embedded strict-CSP host (K02a).
- [ ] Move la-gram's legacy asset version, software agent and storage-scope values to explicit caller settings
  before removing the build flags. Existing apps use the fallback names for provenance and draft history.
- [x] Audit the 14 retained la-gram files. Each depends on the application, canvas or CLI and continues
  to check the packed kernel. The underlying merge and diff fixtures run in the kernel.
- [x] Supply the shared canonical model test and explicit API export map to both apps in the K02b candidate
  (KReq 1.4, KD-5). The candidate's test covers current workspace and modeller I/O.
- [ ] Review the stable version and registry. Qualify the approved release artifact in both apps.
- [ ] Extend shared conformance to the Kotlin validator and qualify further Studio engine calls after K02b.

## Known limitations

- **Qualification:** current consumer evidence is recorded above; historical K01 entries are retained below.
- **Legacy defaults:** provenance and checkpoint names can now come from the caller; build flag names and defaults
  still preserve la-gram compatibility until K02.
- **No compiled build:** consumers need a TypeScript-aware bundler or runner (KD-2).

## Change log

- **2026-11-26. A node's drawing order (core-vis 0.10; linked-archi-meta's DD-45).**
  - **Assets:** `core-vis-onto.ttl` and `core-vis-shapes.ttl`, refreshed from meta: `arch-vis:zOrder`, an integer on a
    node, its drawing order among the nodes in the same place; absent, 0; the same, by IRI.
  - **`view-manager.ts`:** `NodeInfo.zOrder`; `setNodeZOrder`. **`placement-copy.ts`:** a copy keeps it.
    **`single-valued.ts`:** one value in a merge, as a node's bounds.
  - **`drawing-order.ts`**, new: the order, and the zOrders that bring nodes to the front or the back, or one step
    forward or backward. A diagram's drawing order was nowhere in its data, so overlapping nodes could swap places
    after a save and a load. *drawing-order.test, view-manager.test, single-valued.test*
  - **la-gram and the workspace** have it with the next kernel archive; la-gram draws in that order and offers the
    four after its 0.4.0.
- **2026-11-25. On GitHub, with la-gram's test timeout.**
  - **Repository:** <https://github.com/linked-archi/kernel>, public, its history starting with la-gram's history
    of its files (la-gram's `.agents/tasks/github-move/`). `.github/workflows/kernel.yml` checks types, the unit
    tests and the package on each pull request and push to `main`; `.gitlab-ci.yml`, never run, is gone.
  - **Test timeout:** `vitest.config.ts` has la-gram's `testTimeout` of 20 s again, lost when its configuration was
    adapted. The first run on GitHub failed one property test at Vitest's 5 s
    (`model-merge.property.test.ts`: 6.9 s on the runner, 0.7 s in a local full run). No test changed.
- **2026-11-25. ArchiMate 3.2's pictures are ones meta.linked.archi serves.**
  - **Asset:** `archimate3.2-onto.ttl`, refreshed from meta. Its classes named pictures under
    `https://meta.linked.archi/archimate/v3/img/`, which meta.linked.archi answers 404 for. An element type's is now
    the one its notation gives, under `archimate3/icons/`, so the two agree; the relationship types name none, as
    ArchiMate 4's do. The palette's 3.2 relationships, whose notation gives no picture, fell back to those IRIs; they
    now have no `iconUrl`. No code changed; the tests pass.
  - **la-gram** has it with the next vendored kernel tarball.
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
