import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { EditableModel } from '../model.js';
import { ModelIO } from '../../import-export/model-io.js';
import { ModelSession } from '../../model-manager/model-session.js';
import { OxigraphElementManager } from '../../model-manager/element-manager.js';
import { OxigraphRelationshipManager } from '../../model-manager/relationship-manager.js';
import { OxigraphViewManager } from '../../model-manager/view-manager.js';
import { assetUrl } from '../../metamodel-manager/bundled-assets.js';
const seed=readFileSync(new URL('../../../fixtures/workspace/shop-seed.ttl',import.meta.url),'utf8');
const ROOT='https://example.org/acme/shop/';
const AM='https://meta.linked.archi/archimate4/onto#';

describe('the shared editable model',()=>{
  it('normalizes once, preserves all RDF on a canonical round trip, and uses the declared metamodel',async()=>{
    const model=await EditableModel.open(seed);
    expect(model.errors).toEqual([]);
    expect(model.normalization.added.length).toBeGreaterThan(0);
    const text=model.serialize('trig');const other=await EditableModel.open(text,'shop.trig');
    expect(other.snapshot()).toEqual(model.snapshot());expect(other.normalization).toEqual({added:[],removed:[]});
    expect(other.serialize('trig')).toBe(text);expect(other.session.metamodelIris()).toContain(AM.replace('onto#','metamodel#ArchiMate4'));
    expect(model.types().some(t=>t.iri===AM+'ApplicationComponent')).toBe(true);
    model.dispose();other.dispose();
  });
  it('edits labels without erasing other languages or geometry; undo and redo replay exact RDF',async()=>{
    const m=await EditableModel.open(seed);const initial=m.snapshot();
    m.rename(ROOT+'web-shop','Boutique','fr');m.rename(ROOT+'web-shop','Online store','en');
    expect(m.values(ROOT+'web-shop','http://www.w3.org/2004/02/skos/core#prefLabel').map(v=>v.value)).toEqual(expect.arrayContaining(['Boutique','Online store']));
    expect(m.changes().removed.some(q=>q.includes('core-vis#'))).toBe(false);
    const changed=m.snapshot();m.undo();m.undo();expect(m.snapshot()).toEqual(initial);m.redo();m.redo();expect(m.snapshot()).toEqual(changed);
    expect(changed.some(q=>q.includes('https://app.linked.archi/workspace/v0.0.0'))).toBe(true);
    m.discard();expect(m.snapshot()).toEqual(initial);expect(m.history).toHaveLength(0);m.dispose();
  });
  it('keeps qualified/direct relationship statements and deletion cascades consistent with the modeller',async()=>{
    const m=await EditableModel.open(seed);const created=m.create(AM+'ApplicationComponent','New component');
    const valid=m.permitted(ROOT+'web-shop',created);expect(valid.length).toBeGreaterThan(0);
    const iri=m.relate(ROOT+'web-shop',created,valid[0].iri);
    expect(m.relationships.getRelationship(iri)?.targetIri).toBe(created);
    expect(m.snapshot().some(q=>q.includes(iri)&&q.includes('reifies'))).toBe(true);
    const before=m.snapshot();m.unrelate(iri);expect(m.relationships.getRelationship(iri)).toBeUndefined();m.undo();expect(m.snapshot()).toEqual(before);
    // The standalone modeller's managers adopt the result with no new normalization.
    const io=new ModelIO(m.store);const text=m.serialize('trig');
    m.store.withoutStamps(()=>{io.load(text,'shop.trig');
      new ModelSession(m.store,new OxigraphElementManager(m.store),new OxigraphViewManager(m.store),undefined,{relationships:new OxigraphRelationshipManager(m.store)}).adopt();});
    expect(m.snapshot()).toEqual(before);m.dispose();
  });
  it('recovers only a matching base and rejects exports that would omit triple terms',async()=>{
    const m=await EditableModel.open(seed);m.rename(ROOT+'web-shop','Edited');const saved=m.checkpoint();
    const restored=await EditableModel.open(seed);restored.recover(saved);expect(restored.snapshot()).toEqual(m.snapshot());
    expect(()=>restored.recover({...saved,assets:{}})).toThrow(/metamodel assets/);
    expect(()=>restored.recover({...saved,model:'urn:other'})).toThrow(/different base/);
    expect(()=>m.serialize('json-ld')).toThrow(/triple terms/);expect(()=>m.serialize('rdf-xml')).toThrow(/triple terms/);
    expect(m.changeSet('urn:test:change')).toContain('urn:test:change#added');m.dispose();restored.dispose();
  });
  it('runs real SHACL including the seed warning, and gives each embedded host its own asset URL',async()=>{
    const m=await EditableModel.open(seed);const report=m.validate();expect(report.results.some(r=>r.severity==='Warning')).toBe(true);
    expect(assetUrl('core/core-onto.ttl',{baseUrl:'https://one.example/app/'})).toBe('https://one.example/app/assets/core/core-onto.ttl');
    expect(assetUrl('core/core-onto.ttl',{baseUrl:'https://two.example/app/'})).toBe('https://two.example/app/assets/core/core-onto.ttl');m.dispose();
  });
});

// Explicit fixture update mode; ordinary test runs only verify the committed artifact.
it('qualifies the shared positive demo and expected findings',async()=>{
  const m=await EditableModel.open(seed);
  m.store.withoutStamps(()=>m.relationships.createQualifiedRelationship({typeIri:AM+'Realization',sourceIri:ROOT+'payments',targetIri:ROOT+'gift-wrapping',modelIri:m.iri,iri:ROOT+'payments-realizes-gift-wrapping'}));
  const report=m.validate();expect(report.results.filter(r=>r.severity==='Violation')).toEqual([]);
  const data=m.serialize('trig');
  const path=new URL('../../../fixtures/workspace/archimate4-demo.trig',import.meta.url);
  if(process.env.UPDATE_WORKSPACE_FIXTURES==='1'){
    writeFileSync(path,data);
    writeFileSync(new URL('../../../fixtures/workspace/demo-inventory.json',import.meta.url),JSON.stringify({model:m.iri,label:m.label,metamodels:m.session.metamodelIris(),rows:m.contents().elements.map(e=>({iri:e.iri,label:e.label,type:e.typeIri}))},null,2)+'\n');
    writeFileSync(new URL('../../../fixtures/workspace/expected-findings.json',import.meta.url),JSON.stringify(report.results,null,2)+'\n');
  }
  expect(readFileSync(path,'utf8')).toBe(data);m.dispose();
});

it('refuses to flatten arbitrary named graphs silently',async()=>{
  await expect(EditableModel.open('<urn:foreign> { <urn:s> <urn:p> <urn:o> }','dataset.trig')).rejects.toThrow(/lose their identities/);
});
