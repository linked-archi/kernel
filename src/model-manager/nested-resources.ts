/** Named parts addressed through one model property (KReq 3–5). */
import { DataFactory } from 'n3';
import type { NamedNode, Quad, Term } from '@rdfjs/types';
import type { RdfStore } from '../rdf-engine/interfaces.js';
import { partIri, uuid } from '../rdf-engine/iri.js';
import { NAMESPACES } from '../rdf-engine/namespaces.js';
import { isQualifiedPredicate } from './cascade.js';
import { replacePropertyValues } from './resource-edits.js';
import { IRI, T, nn, triple } from './vocabulary.js';

export interface NestedResourceLink {
  readonly parentIri: string;
  readonly path: string;
  readonly childIri: string;
}

export type NestedResourceAccess = 'missing' | 'owned' | 'reference';
export interface NestedResourceRemoval {
  readonly paths?: readonly string[];
  readonly classIris?: readonly string[];
}

const MODEL_GRAPH = DataFactory.defaultGraph() as unknown as NamedNode;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROPERTY_STAMPS = new Set([IRI.dctermsCreated, IRI.dctermsModified, NAMESPACES.prov + 'wasGeneratedBy',
  NAMESPACES.prov + 'generatedAtTime']);
const STRUCTURAL_PATHS = new Set<string>([
  IRI.rdfType, IRI.inModel, IRI.inView, IRI.dctermsIsPartOf, IRI.source, IRI.target, IRI.reifies,
  IRI.modelConformsToMetamodel, IRI.viewConformsToViewpoint, IRI.legacyConformsToMetamodel,
  IRI.legacyPartOfModel, IRI.legacyRelSource, IRI.legacyRelTarget, IRI.legacyRelPredicate,
  IRI.rdfFirst, IRI.rdfRest, IRI.archElement, IRI.archRelationship, IRI.visView,
  IRI.visSource, IRI.visTarget,
]);

export function isNestedResourceProperty(store: RdfStore, path: string): boolean {
  return !!path && !STRUCTURAL_PATHS.has(path) && !PROPERTY_STAMPS.has(path) && !path.startsWith(NAMESPACES.prov)
    && !isQualifiedPredicate(store, path) && !store.getQuads(null, T.unqualifiedForm, nn(path)).length;
}

function memberOf(store: RdfStore, iri: string): string | undefined {
  const links = store.getQuads(nn(iri), T.inModel, null, MODEL_GRAPH);
  if (links.length === 1 && links[0].object.termType === 'NamedNode') return links[0].object.value;
  return undefined;
}

function parentModel(store: RdfStore, parentIri: string): string | undefined {
  const parent = nn(parentIri);
  return store.getQuads(parent, T.rdfType, T.Model, MODEL_GRAPH).length ? parentIri : memberOf(store, parentIri);
}

function ownsPart(store: RdfStore, parentIri: string, childIri: string): boolean {
  const key = childIri.slice(-36);
  if (!UUID.test(key) || childIri !== partIri(parentIri, 'part', key)) return false;
  const ownership = store.getQuads(nn(childIri), T.dctermsIsPartOf, null, MODEL_GRAPH);
  if (ownership.length !== 1 || !ownership[0].object.equals(nn(parentIri))) return false;
  const model = parentModel(store, parentIri);
  return model !== undefined && memberOf(store, childIri) === model;
}

function mentions(term: Term, resource: NamedNode): boolean {
  if (term.termType === 'Quad') {
    return mentions(term.subject, resource) || mentions(term.predicate, resource) || mentions(term.object, resource);
  }
  return term.equals(resource);
}

function hasOtherReferences(store: RdfStore, link: NestedResourceLink, assertion: Quad): boolean {
  const child = nn(link.childIri);
  if (store.getQuads(child).some(q => q.graph.termType !== 'DefaultGraph')) return true;
  if (store.getQuads(null, child).length || store.getQuads(null, null, null, child).length) return true;
  for (const q of store.getQuads(null, null, child)) {
    if (q.equals(assertion)) continue;
    // The ownership backlink of a verified descendant does not make its parent a shared reference.
    if (q.graph.termType === 'DefaultGraph' && q.predicate.equals(T.dctermsIsPartOf) && q.subject.termType === 'NamedNode'
      && ownsPart(store, link.childIri, q.subject.value)
      && store.getQuads(child, null, q.subject, MODEL_GRAPH).some(edge => isNestedResourceProperty(store, edge.predicate.value))) continue;
    return true;
  }
  // A reifier or another quoted RDF triple can refer to a part without a direct incoming assertion.
  return store.getQuads().some(q => (q.subject.termType === 'Quad' && mentions(q.subject, child))
    || (q.object.termType === 'Quad' && mentions(q.object, child)));
}

/** Ownership is persisted as data. A name or a sh:node constraint on its own establishes no ownership. */
export function nestedResourceAccess(store: RdfStore, link: NestedResourceLink): NestedResourceAccess {
  if (!isNestedResourceProperty(store, link.path) || !parentModel(store, link.parentIri)) return 'missing';
  const [assertion] = store.getQuads(nn(link.parentIri), nn(link.path), nn(link.childIri), MODEL_GRAPH);
  if (!assertion) return 'missing';
  return ownsPart(store, link.parentIri, link.childIri) && !hasOtherReferences(store, link, assertion)
    ? 'owned' : 'reference';
}

/** Mint a part under its parent. The calling form supplies classes explicitly required by its shapes. */
export function createNestedResource(store: RdfStore, parentIri: string, path: string, classIris: readonly string[] = []): string {
  const model = parentModel(store, parentIri);
  if (!model || !isNestedResourceProperty(store, path)) throw new Error('The nested property must belong to a resource in the model.');
  const childIri = partIri(parentIri, 'part', uuid());
  const child = nn(childIri);
  const parent = nn(parentIri);
  const added = [triple(parent, nn(path), child), triple(child, T.dctermsIsPartOf, parent), triple(child, T.inModel, nn(model)),
    ...[...new Set(classIris)].map(type => triple(child, T.rdfType, nn(type)))];
  store.check?.(added);
  store.addQuads(added);
  return childIri;
}

/** Shared values are edited through their own resource, with no writes through nested references. */
export function replaceNestedResourceValues(store: RdfStore, link: NestedResourceLink, path: string, values: readonly Term[]): void {
  if (nestedResourceAccess(store, link) !== 'owned') throw new Error('This nested resource is a read-only reference.');
  if (!isNestedResourceProperty(store, path)) throw new Error('This nested property cannot be edited.');
  const subject = nn(link.childIri);
  const current = store.getQuads(subject, nn(path), null, MODEL_GRAPH).map(q => q.object);
  if ([...current, ...values].some(term => term.termType !== 'Literal' && term.termType !== 'NamedNode')) {
    throw new Error('This nested property contains an unsupported RDF term.');
  }
  if ([...current, ...values].some(term => term.termType === 'NamedNode' && ownsPart(store, link.childIri, term.value))) {
    throw new Error('Use a nested resource operation to change an owned part.');
  }
  store.check?.(values.map(value => triple(subject, nn(path), value)));
  replacePropertyValues(store, link.childIri, path, values);
}

/** The precise removal set. Keep a subtree or any unrecognised data intact when unlinking its owner. */
export function collectNestedResourceQuads(store: RdfStore, link: NestedResourceLink, removable: NestedResourceRemoval = {}): Quad[] {
  const access = nestedResourceAccess(store, link);
  if (access === 'missing') return [];
  const child = nn(link.childIri);
  const assertion = store.getQuads(nn(link.parentIri), nn(link.path), child, MODEL_GRAPH);
  if (access !== 'owned' || store.getQuads(null, T.dctermsIsPartOf, child, MODEL_GRAPH).length) return assertion;
  const paths = new Set(removable.paths?.filter(path => isNestedResourceProperty(store, path)));
  const classIris = new Set(removable.classIris);
  const statements = store.getQuads(child, null, null, MODEL_GRAPH);
  const prunable = statements.every(q => {
    if (q.object.termType !== 'Literal' && q.object.termType !== 'NamedNode') return false;
    const predicate = q.predicate.value;
    if (predicate === IRI.rdfType) return q.object.termType === 'NamedNode' && classIris.has(q.object.value);
    return predicate === IRI.dctermsIsPartOf || predicate === IRI.inModel
      || PROPERTY_STAMPS.has(predicate) || paths.has(predicate);
  });
  return prunable ? [...assertion, ...statements] : assertion;
}

export function removeNestedResource(store: RdfStore, link: NestedResourceLink, removable?: NestedResourceRemoval): void {
  store.removeQuads(collectNestedResourceQuads(store, link, removable));
}
