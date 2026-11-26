# Import from la-gram (K01)

The kernel retains the Git history of the model logic copied from la-gram (PD-14). The history was
imported during the move to GitHub on 2026-11-25. The [copy manifest](copy-manifest.json) records
the initial working-tree copy, the adapted writer test, the 14 tests that stayed in la-gram and
the files synced again on 2026-11-23. The manifest counts the 413 copied source and data files
together with `LICENSE`.

## Verified ancestry

On 2026-11-26, all 98 inherited kernel commits were checked against the la-gram history ending at
`3ef817d`. Each had a unique la-gram source commit with matching author and committer timestamps,
subject, and filtered Git tree. The 429 entries at the inherited tip `111ce17` match by path,
mode and object ID. The first kernel commit `3d7014e` has that tip as its parent. The kernel clone
has complete history and no replacement refs.

The 22 path differences introduced by the first kernel commit within the filtered paths match
the recorded changes. The adapted writer test has a different blob. Fourteen application tests
stayed in la-gram. Of the seven paths synced later, six have different blobs and
`src/storage-scope.ts` is absent. All seven blobs in kernel `b9c940c` match la-gram `31994cf`.
The [GitHub move task](../../../../../modellers/la-gram/.agents/tasks/github-move/design.md)
records the original graft.

## Verify the inherited tip

Run from the directory containing both checkouts, in Bash or Zsh. An empty diff confirms the
filtered source and inherited tree match. The parent and commit count should be `111ce17` (full
object ID by default) and 98 respectively.

```sh
modeller_repo=tools/modellers/la-gram
kernel_repo=tools/platform/linked-archi-kernel
kernel_paths=(
  src/rdf-engine/ src/metamodel-manager/ src/model-manager/
  src/import-export/model-io.ts src/import-export/__tests__/model-io.test.ts
  src/types/build-flags.d.ts src/storage-scope.ts src/__tests__/sync-assets.test.ts
  src/__tests__/fixtures/merge/ src/__tests__/fixtures/diff/
  scripts/sync-assets.mjs scripts/bench-model.mjs assets/ LICENSE
)
diff <(git -C "$modeller_repo" ls-tree -r 3ef817d -- "${kernel_paths[@]}") \
     <(git -C "$kernel_repo" ls-tree -r 111ce17)
git -C "$kernel_repo" rev-parse 3d7014e^
git -C "$kernel_repo" rev-list --count 111ce17
git -C "$kernel_repo" replace --list
```

## Checklist

- [x] Copy the files and record the manifest (2026-11-20).
- [x] Filter and graft the history, retain the kernel's commits and publish the resulting branch (2026-11-25).
- [x] Verify every inherited snapshot, the first kernel commit and the follow-up sync (2026-11-26).
