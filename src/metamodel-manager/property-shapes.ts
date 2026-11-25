/** Tool-neutral SHACL property descriptors and S01 presentation metadata (KReq 3). */
import { DataFactory } from 'n3';
import type { BlankNode, NamedNode, Term } from '@rdfjs/types';
import type { RdfStore } from '../rdf-engine/interfaces.js';
import { selectLocalizedLiteral } from '../rdf-engine/localized-text.js';
import { NAMESPACES } from '../rdf-engine/namespaces.js';
import { typeClosure, labelOf } from '../model-manager/model-queries.js';
import { IRI, nn } from '../model-manager/vocabulary.js';

const SH = NAMESPACES.sh;
const DECIMAL = NAMESPACES.xsd + 'decimal';
const INTEGER = NAMESPACES.xsd + 'integer';

export interface RdfValue {
  value: string;
  kind: 'literal' | 'iri';
  language?: string;
  datatype?: string;
}

/** Shape identities are meaningful in the store that loaded the metamodel assets. */
export type NodeShapeRef = NamedNode | BlankNode;

export interface PropertyShape {
  path: string;
  label: string;
  group: string;
  groupIri?: string;
  groupOrder?: number;
  order?: number;
  presentationIssues: string[];
  minCount: number;
  maxCount?: number;
  datatype?: string;
  classIri?: string;
  nodeShape?: string;
  /** All conjunctive `sh:node` constraints, including anonymous shapes. */
  nodeShapes?: readonly NodeShapeRef[];
  choices: RdfValue[];
  languages: string[];
  shapes: string[];
  unsupported: string[];
}

export interface NodeShapeProperties {
  fields: PropertyShape[];
  /** The classes required on the focus node itself by the explicit shapes. */
  classIris: string[];
  /** Shape features that prevent a complete predicate-based form. Validation can still run. */
  unsupported: string[];
}

export const valueOf = (term: Term): RdfValue => term.termType === 'NamedNode'
  ? { kind: 'iri', value: term.value }
  : {
    kind: 'literal',
    value: term.value,
    ...(term.termType === 'Literal' ? { language: term.language, datatype: term.datatype.value } : {}),
  };

export function termOf(value: RdfValue): Term {
  if (value.kind === 'iri') return DataFactory.namedNode(value.value) as Term;
  const datatype = value.datatype ? DataFactory.namedNode(value.datatype) : undefined;
  return DataFactory.literal(value.value, value.language || datatype) as Term;
}

function assetValues(store: RdfStore, subject: Term, predicate: string): Term[] {
  return store.getQuads(subject as NamedNode, nn(predicate))
    .filter(q => q.graph.termType !== 'DefaultGraph')
    .map(q => q.object);
}

function isShapeRef(term: Term): term is NodeShapeRef {
  return term.termType === 'NamedNode' || term.termType === 'BlankNode';
}

function shapeKey(term: Term): string {
  return `${term.termType}:${term.value}`;
}

function hasDifferentTerms(terms: readonly Term[]): boolean {
  return terms.some(term => !term.equals(terms[0]));
}

function allowsNamedResource(kind: Term): boolean {
  return kind.termType === 'NamedNode' && ['IRI', 'BlankNodeOrIRI', 'IRIOrLiteral'].some(name => kind.value === SH + name);
}

function shapeReader(store: RdfStore) {
  const values = (subject: Term, predicate: string) => assetValues(store, subject, predicate);
  function list(head: Term): { items: Term[]; complete: boolean } {
    const items: Term[] = [];
    const seen = new Set<string>();
    let complete = true;
    while (isShapeRef(head) && !seen.has(shapeKey(head))) {
      if (head.termType === 'NamedNode' && head.value === IRI.rdfNil) return { items, complete };
      seen.add(shapeKey(head));
      const first = values(head, IRI.rdfFirst);
      const rest = values(head, IRI.rdfRest);
      if (!first.length) break;
      items.push(first[0]);
      if (!rest.length) break;
      if (hasDifferentTerms(first) || hasDifferentTerms(rest)) complete = false;
      head = rest[0];
    }
    return { items, complete: false };
  }
  const truthy = (term: Term) => term.termType === 'Literal' && (term.value === 'true' || term.value === '1');
  const deactivated = (shape: Term) => values(shape, SH + 'deactivated').some(truthy);
  return { values, list, deactivated, truthy };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareOrder(a?: number, b?: number): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

export function comparePropertyShapes(a: PropertyShape, b: PropertyShape): number {
  return compareOrder(a.groupOrder, b.groupOrder)
    || compareText(a.groupIri ?? '', b.groupIri ?? '')
    || compareOrder(a.order, b.order)
    || compareText(a.path, b.path);
}

function single<T>(values: readonly T[]): T | undefined {
  const unique = new Set(values);
  return unique.size === 1 ? unique.values().next().value : undefined;
}

function numeric(term: Term): number | undefined {
  if (term.termType !== 'Literal') return undefined;
  if (term.datatype.value !== DECIMAL && term.datatype.value !== INTEGER) return undefined;
  const value = Number(term.value);
  return term.value.trim() && Number.isFinite(value) ? value : undefined;
}

/** Applicable predicate paths. Complex SHACL paths stay in the validator. */
export function propertyShapesForType(store: RdfStore, type: string, locale = 'en'): PropertyShape[] {
  if (!type) return [];
  const ancestors = new Set(typeClosure(store)(type));
  const roots = store.getQuads(null, nn(SH + 'targetClass'))
    .filter(q => q.graph.termType !== 'DefaultGraph' && ancestors.has(q.object.value))
    .map(q => q.subject as Term).filter(isShapeRef);
  const reader = shapeReader(store);
  for (const iri of ancestors) {
    const node = nn(iri);
    if (reader.values(node, IRI.rdfType).some(t => t.value === SH + 'NodeShape')) roots.push(node);
  }
  return collectPropertyShapes(store, roots, locale, reader);
}

/** Read a referenced node shape without adding a synthetic class target to the assets (KReq 3.4). */
export function propertyShapesForNodeShapes(store: RdfStore, roots: readonly NodeShapeRef[], locale = 'en'): NodeShapeProperties {
  const reader = shapeReader(store);
  const { values, list, deactivated, truthy } = reader;
  const unsupported = new Set<string>();
  const classIris = new Set<string>();
  const active = new Set<string>();
  const visited = new Set<string>();

  function inspect(shape: Term, property: boolean, focusNode: boolean) {
    if (!isShapeRef(shape)) {
      unsupported.add(property ? 'property' : 'node');
      return;
    }
    if (deactivated(shape)) return;
    const key = shapeKey(shape);
    if (active.has(key)) {
      unsupported.add('recursive-node-shape');
      return;
    }
    const visitKey = `${property}:${focusNode}:${key}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    active.add(key);
    if (!store.getQuads(shape as NamedNode).some(quad => quad.graph.termType !== 'DefaultGraph')) {
      unsupported.add('missing-node-shape');
    }
    const paths = values(shape, SH + 'path');
    if (property ? paths[0]?.termType !== 'NamedNode' || hasDifferentTerms(paths) : paths.length > 0) {
      unsupported.add('path');
    }
    if (!property) {
      for (const name of ['or', 'xone', 'not', 'datatype', 'in', 'hasValue']) {
        if (values(shape, SH + name).length) unsupported.add(name);
      }
      if (values(shape, SH + 'closed').some(truthy)) unsupported.add('closed');
      if (values(shape, SH + 'nodeKind').some(kind => !allowsNamedResource(kind))) unsupported.add('nodeKind');
      for (const term of values(shape, SH + 'class')) {
        if (term.termType !== 'NamedNode') unsupported.add('class');
        else if (focusNode) classIris.add(term.value);
      }
    }
    for (const nested of values(shape, SH + 'node')) inspect(nested, false, focusNode && !property);
    for (const head of values(shape, SH + 'and')) {
      const conjunction = list(head);
      if (!conjunction.complete || property) unsupported.add('and');
      for (const member of conjunction.items) inspect(member, false, focusNode && !property);
    }
    for (const nested of values(shape, SH + 'property')) {
      if (property) unsupported.add('property');
      inspect(nested, true, false);
    }
    active.delete(key);
  }
  for (const shape of roots) inspect(shape, false, true);
  return {
    fields: collectPropertyShapes(store, roots, locale, reader),
    classIris: [...classIris].sort(compareText),
    unsupported: [...unsupported].sort(compareText),
  };
}

function collectPropertyShapes(store: RdfStore, roots: readonly NodeShapeRef[], locale: string, reader: ReturnType<typeof shapeReader>): PropertyShape[] {
  const { values, list, deactivated } = reader;

  const propertiesByPath = new Map<string, Term[]>();
  const visited = new Set<string>();
  function walk(shape: Term) {
    const key = shapeKey(shape);
    if (!isShapeRef(shape) || visited.has(key) || deactivated(shape)) return;
    visited.add(key);
    for (const inherited of [...values(shape, SH + 'node'), ...values(shape, SH + 'and').flatMap(head => list(head).items)]) walk(inherited);
    for (const property of values(shape, SH + 'property')) {
      if (!isShapeRef(property) || deactivated(property)) continue;
      const path = values(property, SH + 'path')[0];
      if (path?.termType !== 'NamedNode') continue;
      const shapes = propertiesByPath.get(path.value) ?? [];
      if (!shapes.some(s => s.equals(property))) shapes.push(property);
      propertiesByPath.set(path.value, shapes);
    }
  }
  roots.forEach(walk);

  return [...propertiesByPath].map(([path, shapes]): PropertyShape => {
    const declared = (predicate: string) => shapes.flatMap(s => values(s, predicate));
    const presentationIssues: string[] = [];
    const consistent = <T>(values: T[], property: string): T | undefined => {
      const result = single(values);
      if (values.length && result === undefined) presentationIssues.push(property);
      return result;
    };
    const names = shapes.map(s => selectLocalizedLiteral(values(s, SH + 'name'), locale)?.value).filter(v => v !== undefined);
    const groupIri = consistent(declared(SH + 'group').map(t => t.termType === 'NamedNode' ? t.value : undefined), SH + 'group');
    const order = consistent(declared(SH + 'order').map(t => numeric(t)), SH + 'order');
    const groupOrder = groupIri
      ? consistent(values(nn(groupIri), SH + 'order').map(t => numeric(t)), SH + 'order')
      : undefined;
    const max = declared(SH + 'maxCount').map(t => Number(t.value));
    const choiceLists = declared(SH + 'in').map(list);
    const languageLists = declared(SH + 'languageIn').map(list);
    const intersection = (lists: Term[][]) => (lists[0] ?? []).filter(term => lists.every(items => items.some(t => t.equals(term))));
    const choices = intersection(choiceLists.map(({ items }) => items));
    const languages = intersection(languageLists.map(({ items }) => items));
    const nodeTargets = declared(SH + 'node');
    const nodeShapes = new Map(nodeTargets.filter(isShapeRef).map(shape => [shapeKey(shape), shape]));
    const unsupported = ['or', 'xone', 'not', 'qualifiedValueShape'].filter(name => declared(SH + name).length > 0);
    if (choiceLists.length && (!choices.length || choiceLists.some(({ complete }) => !complete)
      || choices.some(term => term.termType !== 'Literal' && term.termType !== 'NamedNode'))) unsupported.push('in');
    if (languageLists.length && (!languages.length || languageLists.some(({ complete }) => !complete)
      || languages.some(term => term.termType !== 'Literal'))) unsupported.push('languageIn');
    if (nodeTargets.some(term => !isShapeRef(term))) unsupported.push('node');
    if (nodeShapes.size && declared(SH + 'nodeKind').some(kind => !allowsNamedResource(kind))) unsupported.push('nodeKind');
    return {
      path,
      label: consistent(names, SH + 'name') ?? labelOf(store, path, locale),
      group: groupIri ? selectLocalizedLiteral(values(nn(groupIri), IRI.rdfsLabel), locale)?.value ?? labelOf(store, groupIri, locale) : '',
      groupIri,
      groupOrder,
      order,
      presentationIssues,
      minCount: Math.max(0, ...declared(SH + 'minCount').map(t => Number(t.value))),
      maxCount: max.length ? Math.min(...max) : undefined,
      datatype: single(declared(SH + 'datatype').map(t => t.value)),
      classIri: single(declared(SH + 'class').map(t => t.value)),
      nodeShape: single(nodeTargets.map(t => t.value)),
      ...(nodeShapes.size ? { nodeShapes: [...nodeShapes.values()] } : {}),
      choices: choices.map(valueOf),
      languages: languages.map(t => t.value),
      shapes: shapes.map(s => s.value),
      unsupported,
    };
  }).sort(comparePropertyShapes);
}
