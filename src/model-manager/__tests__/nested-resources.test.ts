import { DataFactory } from 'n3';
import type { NamedNode, Quad } from '@rdfjs/types';
import { describe, expect, it } from 'vitest';
import { ObservableRdfStore } from '../../rdf-engine/observable-store.js';
import { OxigraphRdfStore } from '../../rdf-engine/rdf-store.js';
import {
  collectNestedResourceQuads, createNestedResource, nestedResourceAccess, removeNestedResource,
  replaceNestedResourceValues, type NestedResourceLink,
} from '../nested-resources.js';
import { NAMESPACES } from '../../rdf-engine/namespaces.js';
import { IRI, T, dateTimeLiteral, langLiteral, nn, triple, tripleTerm } from '../vocabulary.js';

const MODEL_GRAPH = DataFactory.defaultGraph() as unknown as NamedNode;
const model = 'https://example.org/architecture/model';
const owner = 'https://example.org/architecture/element/123';
const other = 'https://example.org/architecture/element/456';
const details = 'https://example.org/metamodel#details';
const detailType = 'https://example.org/metamodel#Contact';
const message = 'https://example.org/metamodel#message';
const secret = 'https://example.org/metamodel#extra';
const knownLeaf = { paths: [message], classIris: [detailType] };

async function setup(parentIri = owner) {
  const store = new ObservableRdfStore(await OxigraphRdfStore.create());
  store.addQuads([
    triple(nn(model), T.rdfType, T.Model),
    triple(nn(parentIri), T.inModel, nn(model)),
    triple(nn(other), T.inModel, nn(model)),
  ]);
  return store;
}

function create(store: ObservableRdfStore, parentIri = owner): NestedResourceLink {
  return { parentIri, path: details, childIri: createNestedResource(store, parentIri, details, [detailType, detailType]) };
}

function statements(store: ObservableRdfStore, subject: string): Quad[] {
  return store.getQuads(nn(subject), null, null, MODEL_GRAPH);
}

describe('nested model resource operations (KReq 3–5)', () => {
  it.each([
    [owner, `${owner}/part/`],
    [`${model}#element-123`, `${model}#element-123-part-`],
  ])('mints an explicitly owned, named part under %s and can undo and redo it', async (parentIri, prefix) => {
    const store = await setup(parentIri);
    const command = store.record(() => create(store, parentIri));
    const link = command.result;
    expect(link.childIri.startsWith(prefix)).toBe(true);
    expect(command.added).toHaveLength(4);
    expect(command.added.every(q => q.graph.termType === 'DefaultGraph')).toBe(true);
    expect(statements(store, link.childIri).map(q => [q.predicate.value, q.object.value])).toEqual(expect.arrayContaining([
      [IRI.dctermsIsPartOf, parentIri], [IRI.inModel, model], [IRI.rdfType, detailType],
    ]));
    expect(nestedResourceAccess(store, link)).toBe('owned');
    store.applyDiff(command, true);
    expect(nestedResourceAccess(store, link)).toBe('missing');
    expect(statements(store, link.childIri)).toEqual([]);
    store.applyDiff(command);
    expect(nestedResourceAccess(store, link)).toBe('owned');
  });

  it('edits an exclusive part and can prune a known leaf with its standard provenance', async () => {
    const store = await setup();
    const link = create(store);
    replaceNestedResourceValues(store, link, message, [langLiteral('Original', 'fr')]);
    const edit = store.record(() => replaceNestedResourceValues(store, link, message, [langLiteral('Edited', 'de')]));
    expect(edit.removed.map(q => q.object.value)).toEqual(['Original']);
    expect(edit.added[0].object).toEqual(langLiteral('Edited', 'de'));
    const s = nn(link.childIri);
    store.addQuads([
      triple(s, T.dctermsCreated, dateTimeLiteral(new Date('2026-11-25T18:00:00Z'))),
      triple(s, T.dctermsModified, dateTimeLiteral(new Date('2026-11-25T19:00:00Z'))),
      triple(s, nn(NAMESPACES.prov + 'wasGeneratedBy'), nn('urn:test:activity')),
      triple(s, nn(NAMESPACES.prov + 'generatedAtTime'), dateTimeLiteral(new Date('2026-11-25T19:00:00Z'))),
    ]);

    const toRemove = collectNestedResourceQuads(store, link, knownLeaf);
    expect(toRemove).toHaveLength(9);
    const removed = store.record(() => removeNestedResource(store, link, knownLeaf));
    expect(removed.removed).toEqual(toRemove);
    expect(statements(store, link.childIri)).toEqual([]);
    store.applyDiff(removed, true);
    expect(nestedResourceAccess(store, link)).toBe('owned');
    expect(collectNestedResourceQuads(store, link, knownLeaf)).toHaveLength(9);
  });

  it('recognizes shared resources, even when initially minted with an ownership statement', async () => {
    const store = await setup();
    const link = create(store);
    replaceNestedResourceValues(store, link, message, [langLiteral('Shared')]);
    store.addQuads([triple(nn(other), nn(details), nn(link.childIri))]);

    const before = statements(store, link.childIri);
    expect(nestedResourceAccess(store, link)).toBe('reference');
    expect(() => replaceNestedResourceValues(store, link, message, [])).toThrow(/read-only reference/);
    removeNestedResource(store, link, knownLeaf);
    expect(statements(store, link.childIri)).toEqual(before);
    expect(nestedResourceAccess(store, { ...link, parentIri: other })).toBe('reference');
    expect(nestedResourceAccess(store, link)).toBe('missing');
  });

  it('preserves an external or imported reference even if its IRI resembles an owned part', async () => {
    const store = await setup();
    const childIri = `${owner}/part/63077d07-62ae-4fcb-9b03-391ea5b57aca`;
    const link = { parentIri: owner, path: details, childIri };
    const data = [triple(nn(childIri), nn(message), langLiteral('Imported'))];
    store.addQuads([...data, triple(nn(owner), nn(details), nn(childIri))]);
    expect(nestedResourceAccess(store, link)).toBe('reference');
    expect(collectNestedResourceQuads(store, link, knownLeaf)).toHaveLength(1);
    removeNestedResource(store, link, knownLeaf);
    expect(statements(store, childIri)).toEqual(data);
  });

  it('preserves a branch while allowing scalar edits when a verified descendant names its owner', async () => {
    const store = await setup();
    const link = create(store);
    const descendant = create(store, link.childIri);
    expect(nestedResourceAccess(store, link)).toBe('owned');
    expect(nestedResourceAccess(store, descendant)).toBe('owned');
    replaceNestedResourceValues(store, link, message, [langLiteral('Parent')]);
    replaceNestedResourceValues(store, descendant, message, [langLiteral('Child')]);
    expect(() => replaceNestedResourceValues(store, link, details, [])).toThrow(/nested resource operation/);
    const parentBefore = statements(store, link.childIri);
    const descendantBefore = statements(store, descendant.childIri);
    removeNestedResource(store, link, { ...knownLeaf, paths: [details, message] });
    expect(statements(store, link.childIri)).toEqual(parentBefore);
    expect(statements(store, descendant.childIri)).toEqual(descendantBefore);
  });

  it.each(['quoted', 'named graph', 'cycle'] as const)('preserves parts with an additional %s reference', async kind => {
    const store = await setup();
    const link = create(store);
    const item = nn(link.childIri);
    const example = kind === 'quoted'
      ? triple(nn(other), nn(secret), tripleTerm(nn(other), nn(details), item))
      : kind === 'named graph'
        ? DataFactory.quad(nn(other) as never, nn(details) as never, item as never, DataFactory.namedNode('urn:test:graph')) as unknown as Quad
        : triple(item, nn(details), item);
    store.addQuads([example]);
    expect(nestedResourceAccess(store, link)).toBe('reference');
    expect(collectNestedResourceQuads(store, link, { ...knownLeaf, paths: [details] })).toHaveLength(1);
    removeNestedResource(store, link, { ...knownLeaf, paths: [details] });
    expect(store.getQuads().some(q => q.equals(example))).toBe(true);
    expect(statements(store, link.childIri)).toContainEqual(triple(item, T.dctermsIsPartOf, nn(owner)));
  });

  it('does not erase fields outside the editor or let value replacement modify ownership', async () => {
    const store = await setup();
    const link = create(store);
    const item = nn(link.childIri);
    store.addQuads([triple(item, nn(secret), langLiteral('Unmodelled property'))]);
    expect(() => replaceNestedResourceValues(store, link, IRI.dctermsIsPartOf, [nn(other)])).toThrow(/cannot be edited/);
    expect(() => replaceNestedResourceValues(store, link, message, [DataFactory.blankNode() as never])).toThrow(/unsupported RDF term/);
    const before = statements(store, link.childIri);
    removeNestedResource(store, link, knownLeaf);
    expect(statements(store, link.childIri)).toEqual(before);
  });

  it('keeps an owned part with an RDF type outside the applicable shape', async () => {
    const store = await setup();
    const link = create(store);
    const extraType = triple(nn(link.childIri), T.rdfType, nn('urn:other:AdditionalType'));
    store.addQuads([extraType]);
    expect(collectNestedResourceQuads(store, link, knownLeaf)).toHaveLength(1);
    removeNestedResource(store, link, knownLeaf);
    expect(statements(store, link.childIri)).toContainEqual(extraType);
  });
});
