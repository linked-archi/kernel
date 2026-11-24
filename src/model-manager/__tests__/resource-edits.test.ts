import {DataFactory,Parser} from 'n3';
import type {Quad} from '@rdfjs/types';
import {expect,it} from 'vitest';
import {OxigraphRdfStore} from '../../rdf-engine/rdf-store.js';
import {ObservableRdfStore} from '../../rdf-engine/observable-store.js';
import {replacePropertyValues,replaceResourceType,serializeChangeSet} from '../resource-edits.js';
import {snapshotOf} from '../version-history.js';
import {modelQuads} from '../model-queries.js';

it('replays exact property/type edits while retaining other types, graphs and triple terms',async()=>{
  const store=new ObservableRdfStore(await OxigraphRdfStore.create());
  try{
    store.addQuads(new Parser({format:'TriG'}).parse(`@prefix ex:<urn:example:>. ex:s a ex:Old,ex:Marker;ex:name "Before"@en,"Autre"@fr;ex:link ex:t.
      ex:g {ex:s ex:name "Ontology"@en} ex:r ex:statement <<(ex:s ex:link ex:t)>>.`) as unknown as Quad[]);
    const before=snapshotOf(store.getQuads());
    const diff=store.record(()=>{replacePropertyValues(store,'urn:example:s','urn:example:name',[DataFactory.literal('After','en'),DataFactory.literal('Autre','fr')]);replaceResourceType(store,'urn:example:s','urn:example:Old','urn:example:New');});
    const after=snapshotOf(store.getQuads());
    expect(after.some(q=>q.includes('Marker'))).toBe(true);expect(after.some(q=>q.includes('Ontology'))).toBe(true);
    expect(modelQuads(store).some(q=>q.object.termType==='Quad')).toBe(true);
    store.applyDiff(diff,true);expect(snapshotOf(store.getQuads())).toEqual(before);
    store.applyDiff(diff);expect(snapshotOf(store.getQuads())).toEqual(after);
    const text=serializeChangeSet({added:snapshotOf(diff.added),removed:snapshotOf(diff.removed)},'urn:change');
    expect(new Set(new Parser({format:'TriG'}).parse(text).map(q=>q.graph.value))).toEqual(new Set(['urn:change#added','urn:change#removed']));
  }finally{store.dispose();}
});
