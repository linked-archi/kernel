import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { runShopConformance, conformanceFindings } from '@linked-archi/kernel/conformance';
import { ModelIO } from '../import-export/model-io.js';
import { BundledAssetSource } from '../metamodel-manager/asset-sources.js';
import { N3MetamodelLoader } from '../metamodel-manager/metamodel-loader.js';
import { readPermittedPermissions } from '../model-manager/direct-permissions.js';
import { OxigraphElementManager } from '../model-manager/element-manager.js';
import { ModelSession } from '../model-manager/model-session.js';
import { OxigraphRelationshipManager } from '../model-manager/relationship-manager.js';
import { OxigraphViewManager } from '../model-manager/view-manager.js';
import { modelQuads } from '../model-manager/model-queries.js';
import { IRI, nn } from '../model-manager/vocabulary.js';
import { NAMESPACES } from '../rdf-engine/namespaces.js';
import { N3TtlParser } from '../rdf-engine/ttl-parser.js';
import { OxigraphRdfStore } from '../rdf-engine/rdf-store.js';
import { encodeQuads } from '../rdf-engine/term-codec.js';
import { InlineValidationService } from '../rdf-engine/validation-service.js';

it('qualifies canonical RDF, declared identity and SHACL findings through the shared conformance runner', async () => {
  await runShopConformance(file => readFile(file, 'utf8'), async (text) => {
    const store = await OxigraphRdfStore.create();
    const validator = new InlineValidationService();
    try {
      const loader = new N3MetamodelLoader(new N3TtlParser(), store, new BundledAssetSource());
      const core = await loader.loadCoreAssets();
      const loaded = await loader.loadBundledMetamodel('archimate4');
      expect(loaded.assets.every(asset => asset.outcome !== 'error' && asset.outcome !== 'unavailable')).toBe(true);

      const io = new ModelIO(store);
      io.load(text, 'application/trig');
      const relationships = new OxigraphRelationshipManager(store);
      const session = new ModelSession(store, new OxigraphElementManager(store), new OxigraphViewManager(store),
        undefined, { relationships });
      session.adopt();

      const graphs = new Set([...(core.coreShapes ?? []), ...(loaded.graphsByRole.shapes ?? [])]);
      const shapes = [...graphs].flatMap(graph => store.getQuads(null, null, null, nn(graph)));
      const context = store.getQuads().filter(quad => quad.graph.termType !== 'DefaultGraph');
      const tables = readPermittedPermissions(store);
      validator.setup({
        shapes: encodeQuads(shapes),
        hierarchy: encodeQuads(context.filter(quad => quad.predicate.value === NAMESPACES.rdfs + 'subClassOf')),
        outsideTypes: encodeQuads(context.filter(quad => quad.predicate.value === IRI.rdfType)),
        unqualifiedForms: context.filter(quad => quad.predicate.value === NAMESPACES.arch + 'unqualifiedForm')
          .map(quad => [quad.subject.value, quad.object.value]),
        tables: tables.size ? tables.toPlain() : null,
        sparqlContext: encodeQuads(context),
      });
      validator.load(encodeQuads(modelQuads(store)));
      return {
        modelIri: session.modelIri,
        metamodelIris: session.metamodelIris(),
        trig: io.serialize(session.modelIri, { format: 'trig' }),
        findings: conformanceFindings(validator.validate()),
      };
    } finally {
      validator.dispose();
      store.dispose();
    }
  });
});
