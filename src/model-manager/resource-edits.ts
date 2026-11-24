/** Tool-neutral RDF mutations. Callers supply command/history policy (KReq 4–5). */
import {DataFactory,Writer} from 'n3';
import type {Term,NamedNode} from '@rdfjs/types';
import type {RdfStore} from '../rdf-engine/interfaces.js';
import {IRI,nn,triple} from './vocabulary.js';
import {quadsOf} from './version-history.js';

/** Replace this default-graph property with the complete supplied values; other properties and contexts stay. */
export function replacePropertyValues(store:RdfStore,subject:string,path:string,values:readonly Term[]):void {
  const graph=DataFactory.defaultGraph() as unknown as NamedNode;
  store.removeQuads(store.getQuads(nn(subject),nn(path),null,graph));
  store.addQuads(values.map(value=>triple(nn(subject),nn(path),value)));
}

/** Replace one asserted class without erasing additional types, relationships or placements. */
export function replaceResourceType(store:RdfStore,subject:string,previous:string,next:string):void {
  store.removeQuads(store.getQuads(nn(subject),nn(IRI.rdfType),nn(previous),DataFactory.defaultGraph() as unknown as NamedNode));
  store.addQuads([triple(nn(subject),nn(IRI.rdfType),nn(next))]);
}

/** Serialize a model diff as the added/removed graph pair; no application identity or submission policy. */
export function serializeChangeSet(diff:{added:string[];removed:string[]},id:string):string {
  const writer=new Writer({format:'application/trig'});
  for(const [name,lines] of [['added',diff.added],['removed',diff.removed]] as const) {
    for(const q of quadsOf(lines))writer.addQuad(DataFactory.quad(q.subject as never,q.predicate as never,q.object as never,DataFactory.namedNode(`${id}#${name}`)));
  }
  let text='';writer.end((error,result)=>{if(error)throw error;text=result??'';});return text;
}
