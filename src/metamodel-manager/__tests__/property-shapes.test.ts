import {Parser,DataFactory} from 'n3';
import type {Quad} from '@rdfjs/types';
import {expect,it} from 'vitest';
import {OxigraphRdfStore} from '../../rdf-engine/rdf-store.js';
import { propertyShapesForNodeShapes, propertyShapesForType } from '../property-shapes.js';

it('reads inherited SHACL sections and constraints without application defaults',async()=>{
  const store=await OxigraphRdfStore.create();
  try{
    const text=`@prefix sh:<http://www.w3.org/ns/shacl#>. @prefix rdfs:<http://www.w3.org/2000/01/rdf-schema#>.
      @prefix ex:<urn:example:>. ex:Child rdfs:subClassOf ex:Parent.
      ex:ParentShape a sh:NodeShape;sh:targetClass ex:Parent;sh:property [sh:path ex:name;sh:name "Name"@en;sh:minCount 1;sh:maxCount 3;sh:group ex:Identity;sh:order 1].
      ex:Identity rdfs:label "Identity"@en;sh:order 0.
      ex:ChildShape a sh:NodeShape;sh:targetClass ex:Child;sh:property [sh:path ex:name;sh:maxCount 1];sh:property [sh:path ex:mode;sh:in ("a" "b")].`;
    store.addQuads(new Parser().parse(text).map(q=>DataFactory.quad(q.subject,q.predicate,q.object,DataFactory.namedNode('urn:shapes'))) as unknown as Quad[]);
    const fields=propertyShapesForType(store,'urn:example:Child');
    const name=fields.find(p=>p.path==='urn:example:name')!;
    expect(name.group).toBe('Identity');expect(name.minCount).toBe(1);expect(name.maxCount).toBe(1);expect(name.shapes).toHaveLength(2);
    expect(fields.find(p=>p.path==='urn:example:mode')?.choices.map(v=>v.value)).toEqual(['a','b']);
    expect(fields.find(p=>p.path==='urn:example:mode')?.group).toBe('');
  }finally{store.dispose();}
});

it('projects conjunctive references to named and anonymous node shapes', async () => {
  const store = await OxigraphRdfStore.create();
  try {
    store.load(`
      @prefix ex: <urn:example:> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      ex:OwnerShape sh:targetClass ex:Owner ; sh:property [
        sh:path ex:detail ; sh:node ex:DetailShape,
          [ sh:and (ex:NameLimit [ sh:class ex:Auxiliary ]) ]
      ], [ sh:path ex:alternative ; sh:node [ sh:property [ sh:path ex:value ] ] ] .
      ex:DetailShape sh:class ex:Detail ; sh:nodeKind sh:IRI ;
        sh:property [ sh:path ex:name ; sh:name "Name"@en, "Nom"@fr ; sh:minCount 1 ; sh:group ex:Names ] .
      ex:Names rdfs:label "Noms"@fr ; sh:order 0 .
      ex:NameLimit sh:property [ sh:path ex:name ; sh:maxCount 1 ] .
    `, { format: 'text/turtle', graph: 'urn:shapes' });
    const fields = propertyShapesForType(store, 'urn:example:Owner');
    const details = fields.find(field => field.path === 'urn:example:detail')!;
    expect(details.nodeShape).toBeUndefined();
    expect(details.nodeShapes).toHaveLength(2);
    expect(details.nodeShapes).toEqual(expect.arrayContaining([
      expect.objectContaining({ termType: 'NamedNode', value: 'urn:example:DetailShape' }),
      expect.objectContaining({ termType: 'BlankNode' }),
    ]));
    const projection = propertyShapesForNodeShapes(store, details.nodeShapes!, 'fr-BE');
    expect(projection.classIris).toEqual(['urn:example:Auxiliary', 'urn:example:Detail']);
    expect(projection.unsupported).toEqual([]);
    expect(projection.fields).toMatchObject([
      { path: 'urn:example:name', label: 'Nom', group: 'Noms', minCount: 1, maxCount: 1 },
    ]);
    const alternative = fields.find(field => field.path === 'urn:example:alternative')!;
    expect(alternative.nodeShape).toBe(alternative.nodeShapes?.[0].value);
    expect(propertyShapesForNodeShapes(store, alternative.nodeShapes!).fields.map(field => field.path))
      .toEqual(['urn:example:value']);
  } finally {
    store.dispose();
  }
});

it('diagnoses recursive references and complex paths without projecting them as predicate fields', async () => {
  const store = await OxigraphRdfStore.create();
  try {
    store.load(`
      @prefix ex: <urn:example:> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      ex:Parent sh:property [ sh:path ex:clean ],
        [ sh:path ex:child ; sh:node ex:Child ], [ sh:path [ sh:inversePath ex:parent ] ] .
      ex:Child sh:property [ sh:path ex:parent ; sh:node ex:Parent ] .
    `, { format: 'text/turtle', graph: 'urn:shapes' });
    const result = propertyShapesForNodeShapes(store, [DataFactory.namedNode('urn:example:Parent')]);
    expect(result.unsupported).toEqual(['path', 'recursive-node-shape']);
    expect(result.fields.map(field => field.path)).toEqual(['urn:example:child', 'urn:example:clean']);
  } finally {
    store.dispose();
  }
});

it('reports absent or malformed shape references and ignores shapes asserted in the model', async () => {
  const store = await OxigraphRdfStore.create();
  try {
    store.load(`
      @prefix ex: <urn:example:> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      ex:Shape sh:and [ <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> ex:ModelOnly ] ;
        sh:property [ sh:path ex:resource ; sh:node "not a shape" ] .
    `, { format: 'text/turtle', graph: 'urn:shapes' });
    store.load(`
      <urn:example:ModelOnly> <http://www.w3.org/ns/shacl#property> [ <http://www.w3.org/ns/shacl#path> <urn:example:hidden> ] .
    `, { format: 'text/turtle' });
    const result = propertyShapesForNodeShapes(store, [DataFactory.namedNode('urn:example:Shape')]);
    expect(result.unsupported).toEqual(['and', 'missing-node-shape', 'node']);
    expect(result.fields).toMatchObject([{ path: 'urn:example:resource', unsupported: ['node'] }]);
  } finally {
    store.dispose();
  }
});

it('orders authored sections independently of field order and reports conflicting orders', async () => {
  const store = await OxigraphRdfStore.create();
  try {
    store.load(`
      @prefix ex: <urn:example:> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      ex:Details rdfs:label "Details"@en, "Détails"@fr ; sh:order 0.5 .
      ex:Identity rdfs:label "Identity"@en ; sh:order 0 .
      ex:Container sh:targetClass ex:Element ; sh:property
        [ sh:path ex:description ; sh:name "Description"@en ; sh:group ex:Details ; sh:order -1 ],
        [ sh:path ex:title ; sh:name "Title"@en, "Titre"@fr ; sh:group ex:Identity ; sh:order 1001 ],
        [ sh:path ex:ignored ; sh:deactivated true ] .
    `, {format: 'text/turtle', graph: 'urn:shapes'});
    expect(propertyShapesForType(store, '')).toEqual([]);
    const fields = propertyShapesForType(store, 'urn:example:Element', 'fr-BE');
    expect(fields.map(f => [f.label, f.group])).toEqual([['Titre', 'Identity'], ['Description', 'Détails']]);
    store.load(`
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      <urn:conflict> sh:targetClass <urn:example:Element> ;
        sh:property [ sh:path <urn:example:title> ; sh:order 2 ] .
    `, {format:'text/turtle',graph:'urn:extension'});
    const conflicted = propertyShapesForType(store, 'urn:example:Element');
    const title = conflicted.find(f => f.path === 'urn:example:title');
    expect(title?.presentationIssues).toContain('http://www.w3.org/ns/shacl#order');
    expect(title?.order).toBeUndefined();
  } finally {
    store.dispose();
  }
});
