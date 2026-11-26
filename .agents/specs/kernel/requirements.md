# Requirements: linked-archi-kernel

## Introduction

The kernel is the model logic la-gram and the Linked.Archi workspace share. These requirements say what it
guarantees the tools that use it. What each module does in detail is specified by la-gram's requirements, which the
code cites (Req n.m in `la-gram/.agents/specs/la-gram/requirements.md`). Numbers here are KReq n.m and are stable.

---

### Requirement 1: One behaviour for every user

**User story:** As an architect, I want a model saved by the workspace to be the model la-gram would have saved, so
that I can open and edit it in either tool and lose nothing.

1. For the same model and the same edits, the kernel mints the same IRIs and writes the same triples, whichever tool
   calls it.
2. Saved Turtle is la-gram's canonical form: the same order, prefixes and layout every time, on any machine.
3. Validation gives the same findings for the same model and metamodels.
4. A conformance suite holds models with their expected IRIs, canonical Turtle and findings. It is run by the
   kernel, by la-gram and by the platform's validator (K02).
5. Triples the kernel does not interpret are kept as they are, and saved again unchanged.

### Requirement 2: Where it runs

1. In Node 22 or later and in current browsers, with no DOM required.
2. Where a filesystem or a worker is missing, the kernel uses what is there instead. It never reports success for
   work it did not do.
3. It defines nothing on the global object and starts nothing that runs without being asked.

### Requirement 3: Metamodels

1. Linked.Archi metamodels load:
   - by IRI;
   - from files a user gives;
   - from the bundled copies, with no network.
2. The bundled metamodels ship in the package, in `assets/`, laid out as `https://meta.linked.archi/` (KD-3).
3. The bundled copies are byte-identical to their published source and are refreshed with `npm run sync-assets`.

4. SHACL property descriptors retain declared groups, order, names and constraints without choosing a screen layout.
   Named and anonymous node shape references can be read directly, including conjunctive targets and diagnostics
   for recursive or unsupported forms.

### Requirement 4: Model operations

1. Elements, relationships, views and their geometry are created, renamed, retyped and deleted as la-gram's
   Req 3–4 and Req 12 specify.
2. A relationship is written as la-gram writes it:
   - the qualified resource, with its ends;
   - the plain triple, which the resource `rdf:reifies`;
   - its membership in the model.
3. Every removal that can be undone has a twin that returns exactly the quads it removes.
4. Generic property and type edits preserve other predicates, additional types and contexts. Application identity,
   command history and recovery policy remain in the consumer.
5. Model data has no blank nodes.
6. Creating a nested part records its parent, property, ownership and membership with a minted IRI. Editing
   requires exclusive ownership. Removing a shared, unknown or non-leaf part preserves its RDF and removes
   the chosen link. Safe leaf removal uses an exact quad set for undo.
7. A node's drawing order is its `arch-vis:zOrder` (core-vis 0.10; linked-archi-meta's DD-45): read with the node,
   written as an `xsd:integer`, none for 0, copied with the node, one value in a merge. Among the nodes drawn in the
   same place the higher is drawn above, the same in IRI order. Bringing nodes to the front or the back, or one step
   forward or backward, changes only the order between the nodes moved and those beside them: a step passes the next
   node a node overlaps, and no other two nodes that overlap change places.

### Requirement 5: Change, diff and merge

1. A change is an inverse-diffable step, from which undo and change sets (platform decision PD-08) are built.
2. Two versions of a model differ by element: each concept added, removed or changed.
3. A three-way merge combines two edits of one base. It reports conflicts by element, in la-gram's kinds:
   - a value;
   - an end;
   - a position or route;
   - deleted on one side and changed on the other;
   - placed twice.

### Requirement 6: Validation

1. SHACL validation runs against the loaded metamodels' shapes and the core shapes, including SPARQL-based
   constraints.
2. Where workers exist, validation runs in one, so editing never waits for it.

### Requirement 7: Files

1. Models are read and written in Turtle, TriG, JSON-LD, N-Quads, N-Triples and RDF/XML.
2. Formats that carry graphs get the `{ns}graph/model`, `semantic` and `views` partition (DD-15, platform decision
   PD-06).
3. Opening a file migrates retired vocabulary, as la-gram's file reference says.

### Requirement 8: The package

1. Published as `@linked-archi/kernel` under Apache-2.0, with semantic versions. A breaking change to the public API
   takes a major version once 1.0 is reached.
2. Until K02, the public API is provisional (KD-5).
3. The kernel speaks for no tool: the tool's identity in provenance, its build flags and its asset location come from
   the caller (K02).
