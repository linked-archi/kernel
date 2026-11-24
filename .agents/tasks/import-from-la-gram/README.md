# Import from la-gram (K01)

**Goal.** The kernel starts as la-gram's model logic, with its Git history (platform decision PD-14).

**Status, 2026-11-20.**

- **The files are copied:** 413 of them, byte for byte, from la-gram's working tree on branch `basic-interaction`. Seven were synced again from `pre-release` on 2026-11-23 (`copy-manifest.json`, `syncs`).
  `copy-manifest.json` lists what was adapted (one test) and the 14 tests that stayed in la-gram (KD-4).
- **The history is not imported yet:** Git does not run on the machine until Apple's command-line developer tools
  are installed (`xcode-select --install`).

## Import the history

The copy keeps la-gram's paths (KD-1). So a clone of la-gram, filtered to these paths, has the same files with their
history. This repository's own files then go on top as one commit.

1. **In la-gram**, commit what is in progress, so the history holds what was copied. The kernel was synced on
   2026-11-23 from `pre-release`, which then held la-gram's latest work: take history from that branch, or from
   whatever it is merged into. Choose the branch to take
   history from: `pre-release`, or the branch it is merged into.

2. **Filter a fresh clone** to the kernel's paths. Install `git-filter-repo` first, with `brew install git-filter-repo`.

   ```sh
   git clone --no-local linked.archi/tools/modellers/la-gram /tmp/la-kernel-history
   cd /tmp/la-kernel-history
   git checkout pre-release
   git filter-repo --force \
     --path src/rdf-engine/ --path src/metamodel-manager/ --path src/model-manager/ \
     --path src/import-export/model-io.ts --path src/import-export/__tests__/model-io.test.ts \
     --path src/types/build-flags.d.ts --path src/storage-scope.ts --path src/__tests__/sync-assets.test.ts \
     --path src/__tests__/fixtures/merge/ --path src/__tests__/fixtures/diff/ \
     --path scripts/sync-assets.mjs --path scripts/bench-model.mjs \
     --path assets/ --path LICENSE
   ```

3. **Take out the tests that stay in la-gram:**

   ```sh
   git rm -q \
     src/metamodel-manager/__tests__/basic-metamodel.test.ts \
  src/metamodel-manager/__tests__/catalogue.test.ts \
  src/metamodel-manager/__tests__/palette-snapshot.test.ts \
  src/model-manager/__tests__/folders.test.ts \
  src/model-manager/__tests__/iri-conformance.test.ts \
  src/model-manager/__tests__/model-contents-index.test.ts \
  src/model-manager/__tests__/property-catalog.test.ts \
  src/model-manager/__tests__/provenance.test.ts \
  src/model-manager/__tests__/questions.test.ts \
  src/model-manager/__tests__/rdf-scope.test.ts \
  src/model-manager/__tests__/relationship-lookup-memo.test.ts \
  src/model-manager/__tests__/relationship-ranking.test.ts \
  src/model-manager/__tests__/relationship-validity.test.ts \
  src/rdf-engine/__tests__/validation-engine.test.ts
   git commit -m "Leave la-gram's application-level tests in la-gram (KD-4)"
   ```

4. **Lay this repository's files over it**, and commit the kernel's own files and the one adapted test:

   ```sh
   rsync -a --delete --exclude .git --exclude node_modules linked.archi/tools/platform/linked-archi-kernel/ /tmp/la-kernel-history/
   git add -A
   git status --short   # expect only the kernel's own files and src/rdf-engine/__tests__/turtle-writer.test.ts
   git commit -m "Kernel repository (K01): package, specifications, CI; turtle-writer test checks the kernel's n3 pin"
   ```

   `--delete` drops anything the filter kept that the kernel did not copy. On 2026-11-20 there was nothing of the
   kind; a deletion listed here is worth a look. If `git status` lists other copied files as changed, la-gram changed
   after 2026-11-20. Review them, and keep
   la-gram's committed version unless the change belongs to the kernel.

5. **Move the history into this repository** and check that nothing differs:

   ```sh
   mv /tmp/la-kernel-history/.git linked.archi/tools/platform/linked-archi-kernel/.git
   cd linked.archi/tools/platform/linked-archi-kernel && git status   # expect: nothing to commit, working tree clean
   ```

## Checklist

- [x] Copy the files and write the manifest (2026-11-20)
- [ ] la-gram's work in progress committed
- [ ] History filtered, stayed tests removed, kernel files committed
- [ ] `.git` moved here; `git status` clean
- [ ] Remote created (GitLab), pushed
