/** Complete RDF editing session. UI projections never become the saved model (workspace Req 11). */
import { DataFactory, Writer } from 'n3';
import type { Quad, NamedNode } from '@rdfjs/types';
import { OxigraphRdfStore } from '../rdf-engine/rdf-store.js';
import { ObservableRdfStore, type RdfDiff } from '../rdf-engine/observable-store.js';
import { N3TtlParser } from '../rdf-engine/ttl-parser.js';
import { encodeQuads } from '../rdf-engine/term-codec.js';
import { ValidationEngine, type PlainReport } from '../rdf-engine/validation-engine.js';
import { N3MetamodelLoader } from '../metamodel-manager/metamodel-loader.js';
import { BundledAssetSource, ChainedAssetSource, UploadedAssetSource, detectFormat, type AssetSource } from '../metamodel-manager/asset-sources.js';
import { DEFAULT_METAMODEL, getBundledMetamodel, type BundledAssetRole } from '../metamodel-manager/bundled-assets.js';
import { SparqlPaletteGenerator } from '../metamodel-manager/palette-generator.js';
import type { LoadedMetamodel, PaletteDefinition } from '../metamodel-manager/interfaces.js';
import { OxigraphElementManager } from '../model-manager/element-manager.js';
import { OxigraphRelationshipManager } from '../model-manager/relationship-manager.js';
import { OxigraphViewManager } from '../model-manager/view-manager.js';
import { ModelSession } from '../model-manager/model-session.js';
import { ModelIO, formatOfPath, parseModelText, partitionGraphs, type ModelFormat } from '../import-export/model-io.js';
import { snapshotOf, quadsOf, diffSnapshots } from '../model-manager/version-history.js';
import { diffByElement } from '../model-manager/model-diff.js';
import { modelQuads, readModelContents, labelOf } from '../model-manager/model-queries.js';
import { readPermittedPermissions } from '../model-manager/direct-permissions.js';
import { EditProvenance } from '../model-manager/provenance.js';
import { listQuestions, type ModelQuestion } from '../model-manager/questions.js';
import { IRI, T, nn, triple } from '../model-manager/vocabulary.js';
import { isQualifiedPredicate } from '../model-manager/cascade.js';
import { formFor, termOf, valueOf, type FieldValue, type FormField } from './forms.js';

export interface ModelOptions { assetBase?: string; assetSource?: AssetSource; locale?: string; software?: { iri: string; name: string; version?: string } }
export interface EditStep extends RdfDiff { label: string }
export interface EditableSnapshot { model: string; text: string; format: ModelFormat; base: string[]; current: string[]; metamodels: string[]; assets: Record<string,string> }
const CORE = 'https://meta.linked.archi/core#';
const RESERVED = new Set([IRI.rdfType, IRI.inModel, IRI.inView, IRI.source, IRI.target, CORE+'modelConformsToMetamodel', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies']);

export class EditableModel {
  readonly elements: OxigraphElementManager;
  readonly relationships: OxigraphRelationshipManager;
  readonly views: OxigraphViewManager;
  readonly session: ModelSession;
  readonly io: ModelIO;
  readonly loader: N3MetamodelLoader;
  readonly uploaded = new UploadedAssetSource();
  readonly loaded: LoadedMetamodel[] = [];
  readonly errors: string[] = [];
  readonly assetDigests: Record<string,string> = {};
  readonly history: EditStep[] = [];
  readonly future: EditStep[] = [];
  palette: PaletteDefinition = { elementGroups: [], relationshipTypes: [] };
  base: string[] = [];
  normalization: ReturnType<typeof diffSnapshots> = { added: [], removed: [] };
  format: ModelFormat = 'turtle';
  name = 'model.ttl';
  report?: PlainReport;
  private core: Partial<Record<BundledAssetRole,string[]>> = {};
  private provenance: EditProvenance;
  private validator?: ValidationEngine;
  private listeners = new Set<() => void>();
  private unsubscribe?: () => void;
  private constructor(readonly store: ObservableRdfStore, readonly options: ModelOptions) {
    this.elements = new OxigraphElementManager(store); this.relationships = new OxigraphRelationshipManager(store);
    this.views = new OxigraphViewManager(store); this.session = new ModelSession(store, this.elements, this.views, undefined, { relationships: this.relationships });
    this.io = new ModelIO(store);
    const source = new ChainedAssetSource([this.uploaded, options.assetSource ?? new BundledAssetSource({ baseUrl: options.assetBase })]);
    this.loader = new N3MetamodelLoader(new N3TtlParser(), store, {kind: 'chain', fetch: async iri => {
      const doc = await source.fetch(iri);
      if (doc) {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(doc.text));
        this.assetDigests[doc.documentIri] = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
      }
      return doc;
    }});
    this.provenance = new EditProvenance(store, {
      modelIri: () => this.session.modelIri, namespace: () => this.session.namespace()?.namespace, editor: () => undefined,
      software: options.software ?? { iri: 'https://app.linked.archi/workspace/v0.0.0', name: 'Linked.Archi Workspace', version: '0.0.0' },
    });
  }
  static async open(text: string, name = 'model.ttl', options: ModelOptions = {}): Promise<EditableModel> {
    const model = new EditableModel(new ObservableRdfStore(await OxigraphRdfStore.create()), options);
    try {
    const input = parseModelText(text, detectFormat(null, name));
    model.io.load(text, name); model.name = name; model.format = formatOfPath(name) ?? 'turtle';
    if (modelQuads(model.store).some(q => [q.subject,q.object].some(t => t.termType === 'BlankNode'))) throw new Error('Editable model data must use named resources, not blank nodes.');
    const before = model.snapshot();
    const declarations = model.store.getQuads(null, T.modelConformsToMetamodel).map(q => q.object.value);
    model.core = await model.loader.loadCoreAssets();
    for (const role of ['coreOntology', 'coreVisOntology', 'coreShapes'] as const) {
      if (!model.core[role]?.length) model.errors.push(`Required core assets are missing: ${role}`);
    }
    for (const iri of declarations.length ? declarations : [DEFAULT_METAMODEL.metamodelIri]) await model.loadMetamodel(iri);
    model.session.adopt({ fallbackLabel: name, metamodelIris: declarations.length ? declarations : [DEFAULT_METAMODEL.metamodelIri] });
    // ModelIO accepts Linked.Archi partitions, not arbitrary RDF datasets. Refuse graph loss explicitly.
    const graphs = new Set(Object.values(partitionGraphs(model.session.namespace()!.namespace)));
    if (input.some(q => q.graph.termType !== 'DefaultGraph' && !graphs.has(q.graph.value))) {
      throw new Error('This dataset contains named graphs outside the Linked.Archi model partitions. Importing it would lose their identities.');
    }
    model.palette = new SparqlPaletteGenerator(model.store).generatePalette(undefined, { metamodelIris: model.session.metamodelIris() });
    model.normalization = diffSnapshots(before, model.snapshot());
    model.base = model.snapshot();
    model.store.setStamper(diff => model.provenance.stamp(diff));
    model.unsubscribe = model.store.subscribe(() => { model.report = undefined; for (const listener of model.listeners) listener(); });
    return model;
    } catch (error) { model.dispose(); throw error; }
  }
  get iri(): string { return this.session.modelIri!; }
  get label(): string { return this.session.modelLabel(); }
  get locale(): string { return this.options.locale ?? 'en'; }
  get dirty(): boolean { const d=this.changes(); return d.added.length+d.removed.length>0; }
  get writable(): boolean { return this.errors.length === 0; }
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  contents() { return readModelContents(this.store, this.views.getViews()); }
  snapshot(): string[] { return snapshotOf(modelQuads(this.store)); }
  changes() { return diffSnapshots(this.base, this.snapshot()); }
  review() { return diffByElement(this.base, this.snapshot()); }
  labelOf(iri: string): string { return labelOf(this.store,iri,this.locale); }
  types() { return this.palette.elementGroups.flatMap(g => g.elements).filter(e => !e.isAbstract); }
  typeOf(iri: string): string { return [...this.contents().elements,...this.contents().relationships,...this.contents().unclassified].find(e=>e.iri===iri)?.typeIri ?? ''; }
  async loadMetamodel(iri: string): Promise<void> {
    const bundled = getBundledMetamodel(iri);
    try {
      const loaded = await this.loader.loadMetamodelByIri(bundled?.metamodelIri ?? iri);
      this.loaded.push(loaded);
      for (const asset of loaded.assets) if (asset.outcome === 'error' || asset.outcome === 'unavailable') {
        this.errors.push(`${asset.documentIri}: ${asset.message ?? asset.outcome}`);
      }
      this.validator = undefined;
    }
    catch(e) { this.errors.push(`${iri}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  values(iri: string, path: string): FieldValue[] {
    return this.store.getQuads(nn(iri), nn(path),null,DataFactory.defaultGraph() as unknown as NamedNode).map(q=>valueOf(q.object));
  }
  fields(iri: string): FormField[] {
    const fields = formFor(this.store, this.typeOf(iri), this.locale);
    const byPath = new Map(fields.map(f=>[f.path,f]));
    for (const path of [IRI.prefLabel, 'http://www.w3.org/2004/02/skos/core#definition', ...this.store.getQuads(nn(iri),null,null,DataFactory.defaultGraph() as unknown as NamedNode).map(q=>q.predicate.value)]) {
      if (!byPath.has(path)) byPath.set(path,{ path, label: this.labelOf(path), group:'Properties', order:1000000, minCount:0, choices:[], languages:[],shapes:[],unsupported:[] });
    }
    const relationPredicates = new Set(this.store.getQuads(null,nn(CORE+'unqualifiedForm')).map(q=>q.object.value));
    const qualified = new Set(this.store.getQuads(null,nn(CORE+'qualifiedForm')).map(q=>q.object.value));
    return [...byPath.values()].filter(f=> !RESERVED.has(f.path) && !relationPredicates.has(f.path) && !qualified.has(f.path) && !isQualifiedPredicate(this.store,f.path) && !f.path.startsWith('http://www.w3.org/ns/prov#')).sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
  }
  private assertConcept(iri: string): void {
    if (iri !== this.iri && !this.store.getQuads(nn(iri),T.inModel,nn(this.iri),DataFactory.defaultGraph() as unknown as NamedNode).length) throw new Error('The resource does not belong to this model.');
  }
  edit<T>(label: string, fn: () => T): T {
    if (!this.writable) throw new Error('Load all declared metamodels before editing.');
    const before = this.snapshot();
    try {
      const result = this.store.record(fn);
      if (result.added.length || result.removed.length) { this.history.push({ label, added:result.added,removed:result.removed }); this.future.length=0; }
      for(const listener of this.listeners) listener();
      return result.result;
    } catch(error) { this.replace(before); throw error; }
  }
  create(type: string,label: string): string {
    if (!this.types().some(t=>t.iri===type)) throw new Error('Choose an element type from the loaded metamodel.');
    return this.edit('Create element',()=>this.elements.createElement(type,this.iri,{label,language:this.locale}).value);
  }
  rename(iri: string, text: string, language=this.locale): void {
    this.setValues(iri,IRI.prefLabel,[...this.values(iri,IRI.prefLabel).filter(v=>v.language!==language),{kind:'literal',value:text,language}]);
  }
  setValues(iri: string,path: string, values: FieldValue[]): void {
    this.assertConcept(iri);
    if (RESERVED.has(path)) throw new Error('Use the model or relationship operation to edit this property.');
    const field=this.fields(iri).find(f=>f.path===path);
    if (!field || field.unsupported.length) throw new Error('This property has no supported editor.');
    if (field.maxCount !== undefined && values.length>field.maxCount) throw new Error(`At most ${field.maxCount} value(s) allowed.`);
    const quads=values.map(v=>triple(nn(iri),nn(path),termOf(v)));
    this.edit(`Edit ${field.label}`,()=>{ this.store.removeQuads(this.store.getQuads(nn(iri),nn(path),null,DataFactory.defaultGraph() as unknown as NamedNode)); this.store.addQuads(quads); });
  }
  changeType(iri: string, type: string): void {
    this.assertConcept(iri); if(!this.types().some(t=>t.iri===type)) throw new Error('Unknown element type.');
    const previous=this.typeOf(iri);
    this.edit('Change element type',()=>{ this.store.removeQuads(this.store.getQuads(nn(iri),T.rdfType,nn(previous),DataFactory.defaultGraph() as unknown as NamedNode));this.store.addQuads([triple(nn(iri),T.rdfType,nn(type))]); });
  }
  delete(iri: string): void { this.assertConcept(iri); if(iri===this.iri) throw new Error('Cannot delete the open model.'); this.edit('Delete element',()=>this.elements.deleteElement(iri)); }
  permitted(source: string,target: string) { return this.relationships.getValidRelationships(this.typeOf(source),this.typeOf(target)); }
  relate(source: string,target: string,type: string): string {
    this.assertConcept(source);this.assertConcept(target);
    if(!this.permitted(source,target).some(t=>t.iri===type)) throw new Error('The metamodel does not permit this relationship.');
    return this.edit('Add relationship',()=>this.relationships.createQualifiedRelationship({sourceIri:source,targetIri:target,typeIri:type,modelIri:this.iri}).iri);
  }
  unrelate(iri: string): void { this.assertConcept(iri); this.edit('Remove relationship',()=>this.relationships.deleteRelationship(iri)); }
  undo(): void { const step=this.history.pop();if(step){this.store.applyDiff(step,true);this.future.push(step); for(const fn of this.listeners) fn();} }
  redo(): void { const step=this.future.pop();if(step){this.store.applyDiff(step,false);this.history.push(step); for(const fn of this.listeners) fn();} }
  private replace(lines: string[]): void { this.store.withoutStamps(()=>this.store.batch(()=>{this.store.removeQuads(modelQuads(this.store));this.store.addQuads(quadsOf(lines));})); }
  discard(): void { this.replace(this.base);this.history.length=0;this.future.length=0;this.provenance.endActivity(); for(const fn of this.listeners) fn(); }
  serialize(format=this.format): string {
    if(['json-ld','rdf-xml'].includes(format) && modelQuads(this.store).some(q=>q.object.termType==='Quad'||q.subject.termType==='Quad')) throw new Error('This format cannot preserve RDF triple terms. Save as Turtle or TriG.');
    return this.io.serialize(this.iri,{format});
  }
  markSaved(): void { this.base=this.snapshot();this.history.length=0;this.future.length=0;this.provenance.endActivity();for(const fn of this.listeners) fn(); }
  checkpoint(): EditableSnapshot { return {model:this.iri,text:this.serialize('trig'),format:this.format,base:this.base,current:this.snapshot(),metamodels:this.session.metamodelIris(),assets:{...this.assetDigests}}; }
  recover(checkpoint: EditableSnapshot): void {
    if(checkpoint.model!==this.iri || JSON.stringify(checkpoint.base)!==JSON.stringify(this.base) || JSON.stringify(checkpoint.metamodels)!==JSON.stringify(this.session.metamodelIris()) || JSON.stringify(Object.entries(checkpoint.assets ?? {}).sort())!==JSON.stringify(Object.entries(this.assetDigests).sort())) throw new Error('The saved draft belongs to a different base version or metamodel assets.');
    const diff=diffSnapshots(this.base,checkpoint.current);
    this.edit('Recover draft',()=>this.store.withoutStamps(()=>{this.store.removeQuads(quadsOf(diff.removed));this.store.addQuads(quadsOf(diff.added));}));
  }
  changeSet(id: string): string {
    const diff=this.changes(),writer=new Writer({format:'application/trig'});
    for(const [name,lines] of [['added',diff.added],['removed',diff.removed]] as const) for(const q of quadsOf(lines)) writer.addQuad(DataFactory.quad(q.subject as never,q.predicate as never,q.object as never,DataFactory.namedNode(`${id}#${name}`)));
    let text='';writer.end((err,out)=>{if(err)throw err;text=out??'';});return text;
  }
  validate(): PlainReport {
    if(!this.validator){
      this.validator=new ValidationEngine();
      const graphs=new Set([...(this.core.coreShapes??[]),...this.loaded.flatMap(m=>m.graphsByRole.shapes??[])]);
      const shapes=[...graphs].flatMap(g=>this.store.getQuads(null,null,null,nn(g)));
      const context=this.store.getQuads().filter(q=>q.graph.termType!=='DefaultGraph');
      const tables=readPermittedPermissions(this.store);
      this.validator.setup({shapes:encodeQuads(shapes),hierarchy:encodeQuads(context.filter(q=>q.predicate.value==='http://www.w3.org/2000/01/rdf-schema#subClassOf')),outsideTypes:encodeQuads(context.filter(q=>q.predicate.value===IRI.rdfType)),unqualifiedForms:context.filter(q=>q.predicate.value===CORE+'unqualifiedForm').map(q=>[q.subject.value,q.object.value]),tables:tables.size?tables.toPlain():null,sparqlContext:encodeQuads(context)});
    }
    this.validator.load(encodeQuads(modelQuads(this.store)));this.report=this.validator.validate();return this.report;
  }
  questions(): ModelQuestion[] { return listQuestions(this.store); }
  query(sparql: string) { if(!/^\s*(PREFIX\s+[^\n]+\s*)*(SELECT|ASK|CONSTRUCT)\b/i.test(sparql)) throw new Error('Only read queries are supported.');return this.store.query(sparql); }
  dispose(): void { this.unsubscribe?.();this.listeners.clear();this.store.setStamper(null);this.store.dispose(); }
}
