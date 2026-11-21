# .agents

What the people and the agents working on the kernel write down besides the code.

| Path | Holds |
|---|---|
| `conventions.md` | principles and code conventions; Kiro's steering |
| `specs/kernel/requirements.md` | what the kernel guarantees its users, numbered (KReq n.m) |
| `specs/kernel/design.md` | how it is packaged and why, with numbered kernel decisions (KD-n) |
| `specs/kernel/plan.md` | K01, K02 and the hand-over to la-gram's migration (L01) |
| `specs/kernel/tasks.md` | the checklist per ticket, findings queued for K02, the change log |
| `tasks/import-from-la-gram/` | how the code was copied, the copy manifest, and how to import its Git history |

The behaviour these modules implement is specified in la-gram's own specification,
`la-gram/.agents/specs/la-gram/`, which their comments cite as Req n.m. Platform-wide decisions (PD-n) are in
`linked-archi-platform/docs/decisions.md`.
