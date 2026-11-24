/** SHACL form descriptors shared by workspace clients (K02a; workspace Req 7.3). */
import { DataFactory } from 'n3';
import type { Term } from '@rdfjs/types';
import type { RdfStore } from '../rdf-engine/interfaces.js';
import { typeClosure, labelOf } from '../model-manager/model-queries.js';
import { IRI, nn } from '../model-manager/vocabulary.js';

const SH = 'http://www.w3.org/ns/shacl#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export interface FieldValue { value: string; kind: 'literal' | 'iri'; language?: string; datatype?: string }
export interface FormField {
  path: string; label: string; group: string; order: number; minCount: number; maxCount?: number;
  datatype?: string; classIri?: string; nodeShape?: string; choices: FieldValue[]; languages: string[];
  shapes: string[]; unsupported: string[];
}
export const valueOf = (term: Term): FieldValue => term.termType === 'NamedNode'
  ? { kind: 'iri', value: term.value }
  : { kind: 'literal', value: term.value, ...(term.termType === 'Literal' ? { language: term.language, datatype: term.datatype.value } : {}) };
export function termOf(value: FieldValue): Term {
  if (value.kind === 'iri') return DataFactory.namedNode(value.value) as Term;
  return DataFactory.literal(value.value, value.language || (value.datatype ? DataFactory.namedNode(value.datatype) : undefined)) as Term;
}

export function formFor(store: RdfStore, type: string, locale = 'en'): FormField[] {
  const values = (s: Term, p: string) => store.getQuads(s as never, nn(p)).filter(q => q.graph.termType !== 'DefaultGraph').map(q => q.object);
  const first = (s: Term, p: string) => values(s, p)[0];
  const list = (head: Term | undefined): Term[] => {
    const seen = new Set<string>(), result: Term[] = [];
    while (head && head.value !== RDF + 'nil' && !seen.has(head.value)) {
      seen.add(head.value); const value = first(head, RDF + 'first'); if (!value) break;
      result.push(value); head = first(head, RDF + 'rest');
    }
    return result;
  };
  const ancestors = new Set([type, ...typeClosure(store)(type)]);
  const roots: Term[] = [];
  for (const q of store.getQuads(null, nn(SH + 'targetClass'))) if (ancestors.has(q.object.value)) roots.push(q.subject);
  for (const iri of ancestors) if (values(nn(iri), IRI.rdfType).some(t => t.value === SH + 'NodeShape')) roots.push(nn(iri));
  const fields = new Map<string, FormField>(), visited = new Set<string>();
  const walk = (shape: Term) => {
    if (visited.has(shape.value)) return; visited.add(shape.value);
    for (const inherited of [...values(shape, SH + 'node'), ...values(shape, SH + 'and').flatMap(h => list(h))]) walk(inherited);
    for (const property of values(shape, SH + 'property')) {
      const path = first(property, SH + 'path');
      // Complex paths remain validation rules; do not offer an editor that writes the wrong predicate.
      if (path?.termType !== 'NamedNode') continue;
      const name = values(property, SH + 'name');
      const title = name.find(v => v.termType === 'Literal' && v.language === locale) ?? name[0];
      const group = first(property, SH + 'group');
      const min = Number(first(property, SH + 'minCount')?.value ?? 0);
      const max = first(property, SH + 'maxCount');
      const entry: FormField = {
        path: path.value, label: title?.value ?? labelOf(store, path.value, locale),
        group: group ? labelOf(store, group.value, locale) : 'Properties',
        order: Number(first(group ?? property, SH + 'order')?.value ?? 1000) * 1000 + Number(first(property, SH + 'order')?.value ?? 1000),
        minCount: min, ...(max ? { maxCount: Number(max.value) } : {}),
        datatype: first(property, SH + 'datatype')?.value, classIri: first(property, SH + 'class')?.value,
        nodeShape: first(property, SH + 'node')?.value,
        choices: list(first(property, SH + 'in')).map(valueOf), languages: list(first(property, SH + 'languageIn')).map(t => t.value),
        shapes: [property.value], unsupported: ['or', 'xone', 'not', 'qualifiedValueShape'].filter(p => values(property, SH + p).length > 0),
      };
      const previous = fields.get(path.value);
      if (previous) {
        entry.minCount = Math.max(previous.minCount, min);
        if (previous.maxCount !== undefined) entry.maxCount = Math.min(previous.maxCount, entry.maxCount ?? Infinity);
        entry.shapes.push(...previous.shapes); entry.unsupported.push(...previous.unsupported);
      }
      fields.set(path.value, entry);
    }
  };
  roots.forEach(walk);
  return [...fields.values()].sort((a,b) => a.order-b.order || a.label.localeCompare(b.label));
}
