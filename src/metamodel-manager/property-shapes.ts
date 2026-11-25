/** Tool-neutral SHACL property descriptors and S01 presentation metadata (KReq 3). */
import { DataFactory } from 'n3';
import type { Literal, NamedNode, Term } from '@rdfjs/types';
import type { RdfStore } from '../rdf-engine/interfaces.js';
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

export interface PropertyShape {
  path: string;
  label: string;
  group: string;
  groupIri?: string;
  groupOrder?: number;
  order?: number;
  completenessWeight?: number;
  presentationIssues: string[];
  minCount: number;
  maxCount?: number;
  datatype?: string;
  classIri?: string;
  nodeShape?: string;
  choices: RdfValue[];
  languages: string[];
  shapes: string[];
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

function localizedText(values: Term[], locale: string): string | undefined {
  const literals = values.filter((v): v is Literal => v.termType === 'Literal' && !!v.value.trim());
  const language = locale.toLowerCase();
  const preferred = [language, language.split('-')[0], 'en', ''];
  const rank = (literal: Literal) => {
    const i = preferred.indexOf(literal.language.toLowerCase());
    return i === -1 ? preferred.length : i;
  };
  return literals.sort((a, b) => rank(a) - rank(b) || compareText(a.language, b.language) || compareText(a.value, b.value))[0]?.value;
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

/** The common terminology for the declared metamodels. An absent or mixed term leaves the fallback to the caller. */
export function metamodelElementTerms(store: RdfStore, iris: readonly string[], locale = 'en') {
  const common = (predicate: string) => {
    const labels = new Set(iris.map(iri => localizedText(
      assetValues(store, nn(iri), predicate).filter(term => term.termType === 'Literal' && term.language),
      locale,
    )));
    return labels.size === 1 ? labels.values().next().value : undefined;
  };
  return { singular: common(IRI.elementTerm), plural: common(IRI.elementTermPlural) };
}

function single<T>(values: readonly T[]): T | undefined {
  const unique = new Set(values);
  return unique.size === 1 ? unique.values().next().value : undefined;
}

function numeric(term: Term, decimalOnly = false): number | undefined {
  if (term.termType !== 'Literal') return undefined;
  if (term.datatype.value !== DECIMAL && (decimalOnly || term.datatype.value !== INTEGER)) return undefined;
  const value = Number(term.value);
  return term.value.trim() && Number.isFinite(value) ? value : undefined;
}

/** Applicable predicate paths. Complex SHACL paths stay in the validator. */
export function propertyShapesForType(store: RdfStore, type: string, locale = 'en'): PropertyShape[] {
  if (!type) return [];
  const values = (subject: Term, predicate: string) => assetValues(store, subject, predicate);
  const first = (subject: Term, predicate: string) => values(subject, predicate)[0];
  const list = (head: Term | undefined): Term[] => {
    const result: Term[] = [];
    const seen = new Set<string>();
    while (head && head.value !== IRI.rdfNil && !seen.has(head.value)) {
      seen.add(head.value);
      const value = first(head, IRI.rdfFirst);
      if (!value) break;
      result.push(value);
      head = first(head, IRI.rdfRest);
    }
    return result;
  };
  const ancestors = new Set(typeClosure(store)(type));
  const roots = store.getQuads(null, nn(SH + 'targetClass'))
    .filter(q => q.graph.termType !== 'DefaultGraph' && ancestors.has(q.object.value))
    .map(q => q.subject as Term);
  for (const iri of ancestors) {
    const node = nn(iri);
    if (values(node, IRI.rdfType).some(t => t.value === SH + 'NodeShape')) roots.push(node);
  }

  const propertiesByPath = new Map<string, Term[]>();
  const visited = new Set<string>();
  const deactivated = (shape: Term) => values(shape, SH + 'deactivated')
    .some(t => t.termType === 'Literal' && (t.value === 'true' || t.value === '1'));
  function walk(shape: Term) {
    if (visited.has(shape.value) || deactivated(shape)) return;
    visited.add(shape.value);
    for (const inherited of [...values(shape, SH + 'node'), ...values(shape, SH + 'and').flatMap(list)]) walk(inherited);
    for (const property of values(shape, SH + 'property')) {
      const path = first(property, SH + 'path');
      if (path?.termType !== 'NamedNode' || deactivated(property)) continue;
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
    const names = shapes.map(s => localizedText(values(s, SH + 'name'), locale)).filter(v => v !== undefined);
    const groupIri = consistent(declared(SH + 'group').map(t => t.termType === 'NamedNode' ? t.value : undefined), SH + 'group');
    const order = consistent(declared(SH + 'order').map(t => numeric(t)), SH + 'order');
    const groupOrder = groupIri
      ? consistent(values(nn(groupIri), SH + 'order').map(t => numeric(t)), SH + 'order')
      : undefined;
    const completenessWeight = consistent(declared(IRI.completenessWeight).map(term => {
      const weight = numeric(term, true);
      return weight !== undefined && weight >= 0 ? weight : undefined;
    }), IRI.completenessWeight);
    const max = declared(SH + 'maxCount').map(t => Number(t.value));
    const choiceLists = declared(SH + 'in').map(list);
    const languageLists = declared(SH + 'languageIn').map(list);
    const intersection = (lists: Term[][]) => (lists[0] ?? []).filter(term => lists.every(items => items.some(t => t.equals(term))));
    const choices = intersection(choiceLists);
    const languages = intersection(languageLists);
    const unsupported = ['or', 'xone', 'not', 'qualifiedValueShape'].filter(name => declared(SH + name).length > 0);
    if (choiceLists.length && !choices.length) unsupported.push('in');
    if (languageLists.length && !languages.length) unsupported.push('languageIn');
    return {
      path,
      label: consistent(names, SH + 'name') ?? labelOf(store, path, locale),
      group: groupIri ? localizedText(values(nn(groupIri), IRI.rdfsLabel), locale) ?? labelOf(store, groupIri, locale) : '',
      groupIri,
      groupOrder,
      order,
      completenessWeight,
      presentationIssues,
      minCount: Math.max(0, ...declared(SH + 'minCount').map(t => Number(t.value))),
      maxCount: max.length ? Math.min(...max) : undefined,
      datatype: single(declared(SH + 'datatype').map(t => t.value)),
      classIri: single(declared(SH + 'class').map(t => t.value)),
      nodeShape: single(declared(SH + 'node').map(t => t.value)),
      choices: choices.map(valueOf),
      languages: languages.map(t => t.value),
      shapes: shapes.map(s => s.value),
      unsupported,
    };
  }).sort(comparePropertyShapes);
}

/** Presence is independent of SHACL validation. A weighted value counts once per path. */
export function propertyCompleteness(fields: readonly PropertyShape[], values: (path: string) => readonly Term[]) {
  if (fields.some(field => field.presentationIssues.includes(IRI.completenessWeight))) return undefined;
  const items = fields.filter(field => (field.completenessWeight ?? 0) > 0).map(field => ({
    path: field.path,
    label: field.label,
    weight: field.completenessWeight!,
    values: values(field.path),
  }));
  if (items.some(item => item.values.some(term => term.termType !== 'Literal' && term.termType !== 'NamedNode'))) return undefined;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (!total || !Number.isFinite(total)) return undefined;
  const fieldsWithPresence = items.map(({ values, ...field }) => ({
    ...field,
    present: values.some(term => term.termType === 'NamedNode' || !!term.value.trim()),
  }));
  const present = fieldsWithPresence.reduce((sum, field) => sum + (field.present ? field.weight : 0), 0);
  return { percent: Math.round((present / total) * 100), fields: fieldsWithPresence };
}
