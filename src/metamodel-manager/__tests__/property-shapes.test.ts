import {Parser,DataFactory} from 'n3';
import type {Quad} from '@rdfjs/types';
import {expect,it} from 'vitest';
import {OxigraphRdfStore} from '../../rdf-engine/rdf-store.js';
import {metamodelElementTerms,propertyCompleteness,propertyShapesForType} from '../property-shapes.js';

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

it('orders authored sections independently of field order and calculates presence by distinct path', async () => {
  const store = await OxigraphRdfStore.create();
  try {
    store.load(`
      @prefix ex: <urn:example:> .
      @prefix arch: <https://meta.linked.archi/core#> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      ex:mm arch:elementTerm "Asset"@en, "Actif"@fr ; arch:elementTermPlural "Assets"@en .
      ex:other arch:elementTerm "Component"@en .
      ex:Details rdfs:label "Details"@en, "Détails"@fr ; sh:order 0.5 .
      ex:Identity rdfs:label "Identity"@en ; sh:order 0 .
      ex:Container sh:targetClass ex:Element ; sh:property
        [ sh:path ex:description ; sh:name "Description"@en ; sh:group ex:Details ; sh:order -1 ; arch:completenessWeight 3.0 ],
        [ sh:path ex:title ; sh:name "Title"@en, "Titre"@fr ; sh:group ex:Identity ; sh:order 1001 ; arch:completenessWeight 1.0 ],
        [ sh:path ex:ignored ; sh:deactivated true ; arch:completenessWeight 4.0 ] .
    `, {format: 'text/turtle', graph: 'urn:shapes'});
    expect(metamodelElementTerms(store, ['urn:example:mm'], 'fr-BE')).toEqual({singular: 'Actif', plural: 'Assets'});
    expect(metamodelElementTerms(store, ['urn:example:mm', 'urn:example:other']).singular).toBeUndefined();
    expect(propertyShapesForType(store, '')).toEqual([]);
    const fields = propertyShapesForType(store, 'urn:example:Element', 'fr-BE');
    expect(fields.map(f => [f.label, f.group])).toEqual([['Titre', 'Identity'], ['Description', 'Détails']]);
    const data = [DataFactory.literal('Porte', 'fr'), DataFactory.literal('Door', 'en')];
    expect(propertyCompleteness(fields, p => p.endsWith(':title') ? data as never : [])?.percent).toBe(25);
    store.load(`
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix arch: <https://meta.linked.archi/core#> .
      <urn:conflict> sh:targetClass <urn:example:Element> ;
        sh:property [ sh:path <urn:example:title> ; arch:completenessWeight 2.0 ] .
    `, {format:'text/turtle',graph:'urn:extension'});
    const conflicted = propertyShapesForType(store, 'urn:example:Element');
    expect(conflicted.find(f => f.path === 'urn:example:title')?.presentationIssues).toContain('https://meta.linked.archi/core#completenessWeight');
    expect(propertyCompleteness(conflicted, () => [])).toBeUndefined();
  } finally {
    store.dispose();
  }
});
